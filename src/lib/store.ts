import { hasVerifiedReportScore } from "./reportScore";
// A small persistent store over localStorage. Only outcomes are kept —
// reports, deadlines, lessons, practice customers — never a transcript.

import { useSyncExternalStore } from "react";
import type { Lesson, Report, Scenario, Store } from "./types";
import { uid } from "./types";

const KEY = "the-hard-call:v1";
let owner: string | null = null;
let epoch = 0;
const memory = new Map<string, Store>();
const storageKey = () => owner === null ? KEY : `${KEY}:user:${encodeURIComponent(owner)}`;

const EMPTY: Store = {
  reports: [],
  deadlines: [],
  lessons: [],
  scenarios: [],
  settings: { sound: true, workerName: "Tom" },
};

let state: Store = load();
const listeners = new Set<() => void>();

function load(): Store {
  try {
    const cached = memory.get(storageKey());
    if (cached) return cached;
    const raw = localStorage.getItem(storageKey());
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      ...EMPTY,
      ...parsed,
      // Cards written before the coaching switch existed all ran coached —
      // there was no other mode. Backfilled here so a missing field can never
      // be read as "this call was silent".
      reports: (parsed.reports ?? []).map((r) => ({ ...r, coaching: r.coaching ?? true })),
      settings: { ...EMPTY.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

function commit(next: Store) {
  state = next;
  memory.set(storageKey(), next);
  try {
    localStorage.setItem(storageKey(), JSON.stringify(next));
  } catch {
    /* private mode or full — keep running in memory */
  }
  listeners.forEach((l) => l());
}


// Unscoped legacy data stays on this device; never silently assign it to whoever
// signs in next. Anonymous-user upgrades keep their user ID and their partition.
export function setStoreOwner(next: string | null) {
  if (owner === next) return;
  memory.set(storageKey(), state);
  owner = next;
  epoch += 1;
  state = load();
  listeners.forEach((listener) => listener());
}

export function getStoreScope() { return { owner, epoch }; }

export function getStore(): Store {
  return state;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function update(fn: (s: Store) => Store) {
  commit(fn(state));
}

export function useStore(): Store {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const actions = {
  setSound(on: boolean) {
    update((s) => ({ ...s, settings: { ...s.settings, sound: on } }));
  },
  setWorkerName(name: string) {
    update((s) => ({ ...s, settings: { ...s.settings, workerName: name } }));
  },
  addReport(r: Report) {
    update((s) => {
      const deadlines = [...s.deadlines];
      for (const d of r.deadlines) {
        if (!deadlines.some((x) => x.callId === d.callId && x.key === d.key)) {
          deadlines.push({ ...d, id: uid("dl"), done: false, createdAt: Date.now() });
        }
      }
      deadlines.sort((a, b) => a.date.localeCompare(b.date));
      const lessons = s.lessons.map((l) => ({ ...l, usedOn: l.usedOn + 1 }));
      const scenarios = r.scenarioId
        ? s.scenarios.map((sc) =>
            sc.id === r.scenarioId
              ? { ...sc, plays: sc.plays + 1, bestScore: hasVerifiedReportScore(r) ? Math.max(sc.bestScore ?? 0, r.score) : sc.bestScore }
              : sc,
          )
        : s.scenarios;
      return { ...s, reports: [r, ...s.reports].slice(0, 50), deadlines, lessons, scenarios };
    });
  },
  toggleDeadline(id: string) {
    update((s) => ({ ...s, deadlines: s.deadlines.map((d) => (d.id === id ? { ...d, done: !d.done } : d)) }));
  },
  addLesson(l: Omit<Lesson, "id" | "t" | "usedOn">) {
    update((s) => ({ ...s, lessons: [{ ...l, id: uid("ls"), t: Date.now(), usedOn: 0 }, ...s.lessons] }));
  },
  removeLesson(id: string) {
    update((s) => ({ ...s, lessons: s.lessons.filter((l) => l.id !== id),
      pendingDeletes: owner && s.lessons.some((l) => l.id === id)
        ? { lessons: [...new Set([...(s.pendingDeletes?.lessons ?? []), id])], scenarios: s.pendingDeletes?.scenarios ?? [] }
        : s.pendingDeletes,
    }));
  },
  addScenario(sc: Scenario) {
    update((s) => ({ ...s, scenarios: [sc, ...s.scenarios] }));
  },
  approveScenario(id: string) {
    update((s) => ({ ...s, scenarios: s.scenarios.map((x) => (x.id === id ? { ...x, approved: true } : x)) }));
  },
  removeScenario(id: string) {
    update((s) => ({ ...s, scenarios: s.scenarios.filter((x) => x.id !== id),
      pendingDeletes: owner && s.scenarios.some((sc) => sc.id === id && sc.source === "generated")
        ? { lessons: s.pendingDeletes?.lessons ?? [], scenarios: [...new Set([...(s.pendingDeletes?.scenarios ?? []), id])] }
        : s.pendingDeletes,
    }));
  },
  /** The call history only — the report cards, and the deadlines those cards
      started. A deadline exists only because a report created it, so the two
      clear together or the survivor is an orphan.
      Lessons and practice customers are the learning loop the team built; a
      tidy-up before a demo must not take them. That is what `wipe` is for. */
  clearCallHistory() {
    update((s) => ({ ...s, reports: [], deadlines: [] }));
  },
  wipe() {
    commit(EMPTY);
  },
};

export function lessonTexts(s: Store): string[] {
  return s.lessons.map((l) => {
    const head =
      l.kind === "not-a-sign"
        ? "Do NOT fire a sign for this:"
        : l.kind === "missed-sign"
          ? "DO fire a sign for this:"
          : "Wording:";
    return `${head} ${l.text}${l.evidence ? ` (example: "${l.evidence}")` : ""}`;
  });
}
