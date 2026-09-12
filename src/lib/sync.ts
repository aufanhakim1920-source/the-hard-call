import { hasVerifiedReportScore } from "./reportScore";
// Keeps the local store and the Supabase tables in step.
//   push: every local change is upserted (debounced) under the signed-in user.
//   pull: on sign-in, rows the device has never seen are merged in.
// localStorage stays the cache, so the app works offline and before sign-in.

import { getAuth } from "./auth";
import { getStore, getStoreScope, subscribe, update } from "./store";
import { supabase } from "./supabase";
import type { Deadline, Lesson, Report, Scenario, Store } from "./types";

type Row = Record<string, unknown>;

function reportRow(r: Report): Row {
  return {
    id: r.callId,
    mode: r.mode,
    customer: r.customer,
    score: r.score,
    caught: r.caught,
    handled: r.handled,
    partly: r.partly,
    missed: r.missed,
    summary: r.summary,
    tip: r.tip,
    items: r.items,
    missed_by_ai: r.missedByAI,
    scenario_id: r.scenarioId ?? null,
    duration_sec: r.durationSec,
    model: r.model,
    at: new Date(r.at).toISOString(),
  };
}
function reportFrom(x: Row): Report {
  const report: Report = {
    callId: String(x.id),
    mode: x.mode as Report["mode"],
    customer: String(x.customer),
    score: Number(x.score),
    caught: Number(x.caught),
    handled: Number(x.handled),
    partly: Number(x.partly),
    missed: Number(x.missed),
    summary: String(x.summary ?? ""),
    tip: String(x.tip ?? ""),
    items: (x.items as Report["items"]) ?? [],
    missedByAI: (x.missed_by_ai as string[]) ?? [],
    scenarioId: (x.scenario_id as string) ?? undefined,
    durationSec: Number(x.duration_sec ?? 0),
    model: String(x.model ?? ""),
    at: new Date(String(x.at)).getTime(),
    deadlines: [],
  };
  return {
    ...report,
    scoreUnverified: !hasVerifiedReportScore(report),
    unverified: report.items.filter((item) => item.verdict === "unverified").length,
    handled: report.items.filter((item) => item.verdict === "handled").length,
  };
}
function deadlineRow(d: Deadline): Row {
  return { id: d.id, call_id: d.callId, key: d.key, label: d.label, due: d.date, title: d.title, customer: d.customer, done: d.done, created_at: new Date(d.createdAt).toISOString() };
}
function deadlineFrom(x: Row): Deadline {
  return {
    id: String(x.id),
    callId: String(x.call_id),
    key: String(x.key),
    label: String(x.label),
    date: String(x.due),
    title: String(x.title),
    customer: String(x.customer),
    done: Boolean(x.done),
    createdAt: new Date(String(x.created_at)).getTime(),
  };
}
function lessonRow(l: Lesson): Row {
  return { id: l.id, kind: l.kind, text: l.text, sign_key: l.signKey ?? null, evidence: l.evidence ?? null, used_on: l.usedOn, created_at: new Date(l.t).toISOString() };
}
function lessonFrom(x: Row): Lesson {
  return {
    id: String(x.id),
    kind: x.kind as Lesson["kind"],
    text: String(x.text),
    signKey: (x.sign_key as string) ?? undefined,
    evidence: (x.evidence as string) ?? undefined,
    usedOn: Number(x.used_on ?? 0),
    t: new Date(String(x.created_at)).getTime(),
  };
}
function scenarioRow(s: Scenario): Row {
  return {
    id: s.id,
    name: s.name,
    age: s.age,
    voice: s.voice,
    voice_id: s.voiceId ?? null,
    job: s.job,
    product: s.product,
    situation: s.situation,
    hidden_problem: s.hiddenProblem,
    first_message: s.firstMessage,
    level: s.level,
    expected_signs: s.expectedSigns,
    why_this_one: s.whyThisOne,
    from_call_id: s.fromCallId ?? null,
    approved: s.approved,
    created_at: new Date(s.createdAt).toISOString(),
  };
}
function scenarioFrom(x: Row): Scenario {
  return {
    id: String(x.id),
    name: String(x.name),
    age: Number(x.age),
    voice: x.voice as Scenario["voice"],
    voiceId: (x.voice_id as string) ?? undefined,
    job: String(x.job),
    product: String(x.product),
    situation: String(x.situation),
    hiddenProblem: String(x.hidden_problem),
    firstMessage: String(x.first_message),
    level: Number(x.level) as 1 | 2 | 3,
    expectedSigns: (x.expected_signs as string[]) ?? [],
    whyThisOne: String(x.why_this_one ?? ""),
    source: "generated",
    fromCallId: (x.from_call_id as string) ?? undefined,
    approved: Boolean(x.approved),
    createdAt: new Date(String(x.created_at)).getTime(),
    plays: 0,
  };
}

let timer = 0;
let lastPushedFor = "";
let pulledFor = "";
let pendingEpoch: number | null = null;
let retryAfter = 0;
let observedEpoch = getStoreScope().epoch;
let started = false;
function current(uid: string, epoch: number) {
  const scope = getStoreScope();
  return getAuth().user?.id === uid && scope.owner === uid && scope.epoch === epoch;
}
export type SyncState = "off" | "idle" | "saving" | "saved" | "error";
let syncState: SyncState = "off";
const syncListeners = new Set<(s: SyncState) => void>();
function setSync(s: SyncState) {
  syncState = s;
  syncListeners.forEach((l) => l(s));
}
export function onSync(l: (s: SyncState) => void): () => void {
  syncListeners.add(l);
  l(syncState);
  return () => {
    syncListeners.delete(l);
  };
}

async function push(store: Store) {
  const auth = getAuth();
  const scope = getStoreScope();
  if (!supabase || !auth.user || !current(auth.user.id, scope.epoch) || pulledFor !== auth.user.id) return;
  setSync("saving");
  try {
    const uid = auth.user.id;
    const withUser = (rows: Row[]) => rows.map((r) => ({ ...r, user_id: uid }));
    const jobs: PromiseLike<{ error?: { message: string } | null }>[] = [];
    if (store.reports.length) jobs.push(supabase.from("reports").upsert(withUser(store.reports.map(reportRow))));
    if (store.deadlines.length) jobs.push(supabase.from("deadlines").upsert(withUser(store.deadlines.map(deadlineRow))));
    if (store.lessons.length) jobs.push(supabase.from("lessons").upsert(withUser(store.lessons.map(lessonRow))));
    const generated = store.scenarios.filter((s) => s.source === "generated");
    if (generated.length) jobs.push(supabase.from("scenarios").upsert(withUser(generated.map(scenarioRow))));
    const results = await Promise.all(jobs);
    const bad = results.find((r) => r?.error);
    if (bad?.error) throw new Error(bad.error.message);
    if (!current(uid, scope.epoch)) return;
    lastPushedFor = uid;
    setSync("saved");
  } catch (e) {
    if (!current(auth.user.id, scope.epoch)) return;
    console.warn("sync push failed", e);
    setSync("error");
  }
}

async function pull(): Promise<boolean> {
  const auth = getAuth();
  const scope = getStoreScope();
  if (!supabase || !auth.user || !current(auth.user.id, scope.epoch) ||
      pulledFor === auth.user.id || pendingEpoch === scope.epoch || Date.now() < retryAfter) return false;
  const uid = auth.user.id;
  pendingEpoch = scope.epoch;
  setSync("saving");
  try {
    const [r, d, l, s] = await Promise.all([
      supabase.from("reports").select("*").eq("user_id", uid),
      supabase.from("deadlines").select("*").eq("user_id", uid),
      supabase.from("lessons").select("*").eq("user_id", uid),
      supabase.from("scenarios").select("*").eq("user_id", uid),
    ]);
    if (!current(uid, scope.epoch)) return false;
    const failed = [r, d, l, s].find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
    update((cur) => {
      const have = (ids: string[]) => new Set(ids);
      const rIds = have(cur.reports.map((x) => x.callId));
      const dIds = have(cur.deadlines.map((x) => x.id));
      const lIds = have(cur.lessons.map((x) => x.id));
      const sIds = have(cur.scenarios.map((x) => x.id));
      const reports = [...cur.reports, ...((r.data ?? []) as Row[]).filter((x) => !rIds.has(String(x.id))).map(reportFrom)].sort((a, b) => b.at - a.at);
      const deadlines = [...cur.deadlines, ...((d.data ?? []) as Row[]).filter((x) => !dIds.has(String(x.id))).map(deadlineFrom)].sort((a, b) => a.date.localeCompare(b.date));
      const lessons = [...cur.lessons, ...((l.data ?? []) as Row[]).filter((x) => !lIds.has(String(x.id))).map(lessonFrom)].sort((a, b) => b.t - a.t);
      const scenarios = [...cur.scenarios, ...((s.data ?? []) as Row[]).filter((x) => !sIds.has(String(x.id))).map(scenarioFrom)];
      return { ...cur, reports, deadlines, lessons, scenarios };
    });
    pulledFor = uid;
    retryAfter = 0;
    setSync("saved");
    return true;
  } catch (e) {
    if (current(uid, scope.epoch)) {
      console.warn("sync pull failed", e);
      retryAfter = Date.now() + 5000;
      setSync("error");
    }
    return false;
  } finally {
    if (pendingEpoch === scope.epoch) pendingEpoch = null;
  }
}

/** Call once at app start. Safe when Supabase is not configured. */
export function startSync() {
  if (!supabase || started) return;
  started = true;
  const accountChanged = () => {
    const scope = getStoreScope();
    if (observedEpoch === scope.epoch) return;
    observedEpoch = scope.epoch;
    window.clearTimeout(timer);
    pulledFor = "";
    lastPushedFor = "";
    retryAfter = 0;
    setSync(scope.owner ? "idle" : "off");
  };
  setSync(getStoreScope().owner ? "idle" : "off");
  subscribe(() => {
    accountChanged();
    const uid = getAuth().user?.id;
    const epoch = getStoreScope().epoch;
    if (!uid || !current(uid, epoch) || pulledFor !== uid) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (current(uid, epoch)) void push(getStore());
    }, 800);
  });
  window.setInterval(() => {
    accountChanged();
    const uid = getAuth().user?.id;
    const epoch = getStoreScope().epoch;
    if (uid && current(uid, epoch) && pulledFor !== uid) {
      void pull().then((loaded) => {
        if (loaded && current(uid, epoch) && lastPushedFor !== uid) void push(getStore());
      });
    }
  }, 1000);
}

export function counts(store: Store): string {
  const parts: string[] = [];
  if (store.reports.length) parts.push(`${store.reports.length} report${store.reports.length === 1 ? "" : "s"}`);
  if (store.lessons.length) parts.push(`${store.lessons.length} lesson${store.lessons.length === 1 ? "" : "s"}`);
  if (store.scenarios.length) parts.push(`${store.scenarios.length} practice customer${store.scenarios.length === 1 ? "" : "s"}`);
  return parts.join(", ");
}
