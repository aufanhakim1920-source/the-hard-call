/**
 * eval/demo-runs.ts — is the demo reproducible?
 *
 * The demo's whole argument is two report cards side by side. If the silent
 * card reads "3 missed" one run and "1 missed" the next, the punchline lands
 * at half strength and nobody on stage knows why. This measures that, instead
 * of running the browser ten times and guessing.
 *
 * It replays src/lib/demoScript.ts through the REAL engine — the same
 * deterministic detector pass, the same api/flags handler, the same api/report
 * handler the deployed function runs — in process, so a run costs the same
 * model calls as the app and none of the wall clock.
 *
 *   npx tsx eval/demo-runs.ts --runs 6 --side silent
 *   npx tsx eval/demo-runs.ts --runs 4 --side coached
 *   npx tsx eval/demo-runs.ts --runs 6 --side both --model gemini-flash-latest
 *   npx tsx eval/demo-runs.ts --side silent --report-repeat 6   (one call, N judgements)
 *   npx tsx eval/demo-runs.ts --side silent --runs 1 --no-report (signs only, cheap)
 *
 * ⚠ It never mutates the script and never pre-flags anything: if this says the
 * demo is stable, the demo is stable for the same reason the app would be.
 *
 * Writes eval/demo-runs.latest.json. `eval/demo-runs.json` is the archived
 * 42-run set the numbers in docs/DEMO-SCRIPT.md come from — before and after
 * the 13 Sep wording fix, on both the repo source and the deployed function —
 * and is deliberately not the default output, so a fresh run cannot quietly
 * overwrite the evidence a published table rests on.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detect } from "../src/detector/index.js";
import type { Flag, Turn } from "../src/detector/index.js";
import { demoScriptFor } from "../src/lib/demoScript.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const RETRYABLE = /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|fetch failed/i;
const MAX_ATTEMPTS = 5;

// ------------------------------------------------------------------ env
// Only the model keys are read, and nothing from the file is ever printed.
function loadEnv(): void {
  let text: string;
  try {
    text = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    if (!/^GEMINI_(API_KEY(_\d)?|MODEL)$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (value && !process.env[key]) process.env[key] = value;
  }
}
loadEnv();

// ------------------------------------------------------------------ args
interface Args {
  runs: number;
  side: "silent" | "coached" | "both";
  model?: string;
  reportRepeat: number;
  noReport: boolean;
  remote: boolean;
  out: string;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { runs: 3, side: "silent", model: undefined, reportRepeat: 0, noReport: false, remote: false, out: "demo-runs.latest.json" };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === "--runs") a.runs = Number(argv[++i]);
    else if (k === "--side") a.side = argv[++i] as Args["side"];
    else if (k === "--model") a.model = argv[++i];
    else if (k === "--report-repeat") a.reportRepeat = Number(argv[++i]);
    else if (k === "--no-report") a.noReport = true;
    else if (k === "--remote") a.remote = true;
    else if (k === "--out") a.out = argv[++i];
  }
  if (!(a.runs > 0)) a.runs = 1;
  return a;
}
const ARGS = parseArgs(process.argv.slice(2));
// report.ts has no model parameter, so the only way to hold both halves of the
// engine on one model is the env the server itself reads.
if (ARGS.model) process.env.GEMINI_MODEL = ARGS.model;

// The handlers are imported AFTER the env is set, because askGemini reads
// GEMINI_MODEL at call time but the key list is built from the same env.
const { handle: flagsHandle } = await import("../supabase/functions/api/flags.ts");
const { handle: reportHandle } = await import("../supabase/functions/api/report.ts");

// --remote sends the same bodies to the DEPLOYED function instead of the local
// source, because that is what the browser talks to on stage and it may be a
// different commit on a different model. Only the public anon key is read.
function remoteEnv(): { base: string; anon: string } {
  const text = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  const pick = (k: string) => (new RegExp(`^${k}=(.*)$`, "m").exec(text)?.[1] ?? "").trim();
  const url = pick("VITE_SUPABASE_URL");
  if (!url) throw new Error("VITE_SUPABASE_URL is not set, so --remote has nowhere to go");
  return { base: `${url}/functions/v1/api`, anon: pick("VITE_SUPABASE_ANON_KEY") };
}
const REMOTE = ARGS.remote ? remoteEnv() : null;

async function remoteCall(route: string, body: unknown): Promise<Response> {
  return fetch(`${REMOTE!.base}/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: REMOTE!.anon, authorization: `Bearer ${REMOTE!.anon}` },
    body: JSON.stringify(body),
  });
}

// ------------------------------------------------------------------ types
interface Line {
  id: string;
  t: number;
  speaker: "worker" | "customer" | "unknown";
  text: string;
}
interface Sign {
  id: string;
  key: string;
  kind: "legal" | "tip";
  tier?: string;
  title: string;
  detail?: string;
  askNext: string;
  evidence: string;
  confidence?: number;
  t: number;
  lineId: string;
  handled: boolean;
  dueDate?: string;
  dueLabel?: string;
  dueDays?: number;
  source?: string;
  /** measurement only: which line index raised it, and by which pass */
  from: "detector" | "model";
  lineIndex: number;
}
interface ReportOut {
  score: number;
  scoreUnverified: boolean;
  caught: number;
  handled: number;
  partly: number;
  missed: number;
  unverified: number;
  items: { key: string; verdict: string; kind: string; note?: string }[];
  degraded?: boolean;
  degradedReason?: string;
  model: string;
}

// ------------------------------------------------------------------ helpers
let seq = 0;
const uid = (p: string) => `${p}_${(seq += 1).toString(36)}`;

/** The demo's lines with the timestamps the real replay would give them. */
function buildLines(coaching: boolean, startedAt: number): Line[] {
  const script = demoScriptFor(coaching);
  const out: Line[] = [];
  let t = startedAt + 600; // CallScreen waits 600 ms before the first line
  for (const line of script) {
    t += line.gap * 1000;
    out.push({ id: uid("ln"), t, speaker: line.speaker as Line["speaker"], text: line.text });
  }
  return out;
}

async function call<T>(handler: (r: Request) => Promise<Response>, route: string, body: unknown): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = REMOTE
      ? await remoteCall(route, body)
      : await handler(
          new Request(`http://localhost/api/${route}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        );
    const data = (await res.json()) as T & { error?: string };
    if (res.ok) return data;
    lastErr = data.error ?? `${route} ${res.status}`;
    if (!RETRYABLE.test(String(lastErr))) break;
    await new Promise((r) => setTimeout(r, 1500 * attempt * attempt));
  }
  throw new Error(String(lastErr));
}

// --------------------------------------------------- the detector pass
// A mirror of src/lib/detectorBridge.ts. That file cannot be imported here —
// it pulls in src/lib/api.ts, which reads import.meta.env and only exists
// inside Vite — so the mapping is checked against the source at start-up
// instead of being trusted. A measurement that silently drifts from the app is
// worse than no measurement.
const KEY_FOR: Record<string, { key: string; kind: "legal" | "tip"; title: string; dueLabel?: string }> = {
  NCC_72_ORAL_NOTICE: { key: "hardship-request", kind: "legal", title: "Counts as a hardship request", dueLabel: "Reply due" },
  ABA_INFORM_HARDSHIP_PROVISIONS: { key: "inform-hardship-provisions", kind: "tip", title: "Tell them the hardship process exists" },
  HARDSHIP_REQUEST: { key: "ask-about-hardship", kind: "tip", title: "Worth asking about hardship" },
};

function assertBridgeMirror(): void {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "detectorBridge.ts"), "utf8");
  const block = src.slice(src.indexOf("const KEY_FOR"), src.indexOf("function addDays"));
  const found = [...block.matchAll(/^\s{2}([A-Z0-9_]+):\s*\{/gm)].map((m) => m[1]);
  const mine = Object.keys(KEY_FOR);
  const missing = found.filter((r) => !mine.includes(r));
  const extra = mine.filter((r) => !found.includes(r));
  if (missing.length || extra.length) {
    throw new Error(`detectorBridge KEY_FOR drifted: missing ${missing.join(",") || "-"} extra ${extra.join(",") || "-"}`);
  }
  for (const rule of found) {
    const keyLine = new RegExp(`${rule}:\\s*\\{[^}]*key:\\s*"([^"]+)"`).exec(block);
    if (keyLine && keyLine[1] !== KEY_FOR[rule].key) {
      throw new Error(`detectorBridge KEY_FOR[${rule}].key is "${keyLine[1]}", this harness says "${KEY_FOR[rule].key}"`);
    }
  }
}

function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(fromISO: string, days: number): string {
  const [y, m, d] = fromISO.split("-").map(Number);
  const at = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`;
}
function toTurns(lines: Line[]): Turn[] {
  const base = lines.length ? lines[0].t : 0;
  return lines
    .filter((l) => l.speaker !== "unknown")
    .map((l) => ({
      speaker: l.speaker === "worker" ? ("staff" as const) : ("customer" as const),
      start_ms: Math.max(0, l.t - base),
      end_ms: Math.max(0, l.t - base),
      text: l.text,
    }));
}

async function localSigns(lines: Line[], lineId: string, lineIndex: number, existingKeys: string[]): Promise<Sign[]> {
  const turns = toTurns(lines);
  if (!turns.length) return [];
  const flags: Flag[] = await detect({ call_id: "live", turns });
  const have = new Set(existingKeys);
  const out: Sign[] = [];
  const now = lines[lines.length - 1].t + 2000;
  for (const flag of flags) {
    const map = KEY_FOR[flag.rule_id];
    if (!map || have.has(map.key)) continue;
    const raised = turns.find((t) => t.start_ms === flag.raised_at.start_ms && t.speaker === flag.raised_at.speaker);
    const due = flag.deadline_days ? addDays(todayISO(), flag.deadline_days) : undefined;
    have.add(map.key);
    out.push({
      id: uid("sg"),
      key: map.key,
      kind: map.kind,
      title: map.title,
      detail: flag.obligation,
      askNext: flag.staff_prompt,
      evidence: raised?.text ?? "",
      confidence: flag.confidence,
      t: now,
      lineId,
      handled: false,
      ...(due ? { dueDate: due, dueLabel: map.dueLabel ?? "Reply due", dueDays: flag.deadline_days } : {}),
      ...(flag.deadline_days ? { source: flag.authority } : {}),
      from: "detector",
      lineIndex,
    });
  }
  return out;
}

// ------------------------------------------------------------------ one run
interface RunResult {
  side: "silent" | "coached";
  run: number;
  signs: { key: string; kind: string; from: string; lineIndex: number; dueDate?: string }[];
  report?: ReportOut;
  ms: number;
  error?: string;
}

async function runCall(coaching: boolean): Promise<{ lines: Line[]; signs: Sign[]; startedAt: number }> {
  const startedAt = Date.now();
  const all = buildLines(coaching, startedAt);
  const lines: Line[] = [];
  const signs: Sign[] = [];
  for (let i = 0; i < all.length; i += 1) {
    lines.push(all[i]);
    const window = lines.slice(-14);
    const existingKeys = signs.map((s) => s.key);

    const local = await localSigns(window, all[i].id, i, existingKeys);
    for (const s of local) {
      signs.push(s);
      existingKeys.push(s.key);
    }

    const res = await call<{ speaker: string; signs: Omit<Sign, "id" | "t" | "lineId" | "handled" | "from" | "lineIndex">[] }>(
      flagsHandle,
      "flags",
      { lines: window, newLineId: all[i].id, existingKeys, lessons: [], direction: "outbound", todayISO: todayISO() },
    );
    const have = new Set(signs.map((s) => s.key));
    for (const g of res.signs ?? []) {
      if (have.has(g.key)) continue;
      have.add(g.key);
      signs.push({ ...g, id: uid("sg"), t: all[i].t + 2000, lineId: all[i].id, handled: false, from: "model", lineIndex: i });
    }
  }
  return { lines, signs, startedAt };
}

function sessionFor(lines: Line[], signs: Sign[], startedAt: number, coaching: boolean) {
  return {
    id: uid("call"),
    mode: "demo" as const,
    customer: { name: "Sarah M.", product: "home loan", direction: "outbound" },
    lines,
    signs: signs.map(({ from: _f, lineIndex: _i, ...s }) => s),
    startedAt,
    endedAt: lines[lines.length - 1].t + 3000,
    coaching,
  };
}

function summarise(r: ReportOut): string {
  const score = r.scoreUnverified ? `${r.score}*` : String(r.score);
  return `score ${score.padStart(4)}  raised ${String(r.items.length).padStart(2)}  handled ${r.handled}  partly ${r.partly}  missed ${r.missed}  unver ${r.unverified}`;
}

// ------------------------------------------------------------------ main
assertBridgeMirror();
const sides: ("silent" | "coached")[] =
  ARGS.side === "both" ? ["silent", "coached"] : [ARGS.side];
const results: RunResult[] = [];
console.log(
  `${REMOTE ? `remote ${REMOTE.base}` : `local source, model ${process.env.GEMINI_MODEL ?? "(handler default)"}`}  runs ${ARGS.runs}  side ${ARGS.side}`,
);

for (const side of sides) {
  const coaching = side === "coached";
  for (let run = 1; run <= ARGS.runs; run += 1) {
    const t0 = Date.now();
    try {
      const { lines, signs, startedAt } = await runCall(coaching);
      const signRows = signs.map((s) => ({ key: s.key, kind: s.kind, from: s.from, lineIndex: s.lineIndex, dueDate: s.dueDate }));
      console.log(
        `${side} ${run}: signs ${signRows.map((s) => `${s.key}@L${s.lineIndex}(${s.from[0]})`).join(" ") || "(none)"}`,
      );
      if (ARGS.noReport) {
        results.push({ side, run, signs: signRows, ms: Date.now() - t0 });
        continue;
      }
      const repeats = ARGS.reportRepeat > 0 ? ARGS.reportRepeat : 1;
      const session = sessionFor(lines, signs, startedAt, coaching);
      for (let rep = 1; rep <= repeats; rep += 1) {
        const report = await call<ReportOut>(reportHandle, "report", { session, lessons: [] });
        const trimmed: ReportOut = {
          score: report.score,
          scoreUnverified: report.scoreUnverified,
          caught: report.caught,
          handled: report.handled,
          partly: report.partly,
          missed: report.missed,
          unverified: report.unverified,
          items: (report.items ?? []).map((i) => ({ key: i.key, verdict: i.verdict, kind: i.kind, note: i.note })),
          degraded: report.degraded,
          degradedReason: report.degradedReason,
          model: report.model,
        };
        console.log(`  ${side} ${run}${repeats > 1 ? `.${rep}` : ""}: ${summarise(trimmed)}  ${trimmed.items.map((i) => `${i.key}=${i.verdict}`).join(" ")}`);
        results.push({ side, run: repeats > 1 ? run + rep / 100 : run, signs: signRows, report: trimmed, ms: Date.now() - t0 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`${side} ${run}: FAILED ${msg}`);
      results.push({ side, run, signs: [], ms: Date.now() - t0, error: msg });
    }
  }
}

// --------------------------------------------------------------- summary
console.log("\n--- spread ---");
for (const side of sides) {
  const rows = results.filter((r) => r.side === side && r.report);
  if (!rows.length) continue;
  const counts = (pick: (r: RunResult) => number | string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(String(pick(r)), (m.get(String(pick(r))) ?? 0) + 1);
    return [...m.entries()].map(([v, n]) => `${v}×${n}`).join(" ");
  };
  console.log(`${side} (${rows.length} runs)`);
  console.log(`  signs raised : ${counts((r) => r.signs.length)}`);
  console.log(`  sign keys    : ${counts((r) => r.signs.map((s) => s.key).sort().join("+"))}`);
  console.log(`  missed       : ${counts((r) => r.report!.missed)}`);
  console.log(`  handled      : ${counts((r) => r.report!.handled)}`);
  console.log(`  partly       : ${counts((r) => r.report!.partly)}`);
  console.log(`  unverified   : ${counts((r) => r.report!.unverified)}`);
  console.log(`  score        : ${counts((r) => (r.report!.scoreUnverified ? `${r.report!.score}*` : r.report!.score))}`);
  const keys = [...new Set(rows.flatMap((r) => r.report!.items.map((i) => i.key)))];
  for (const key of keys) {
    const verdicts = new Map<string, number>();
    for (const r of rows) {
      const it = r.report!.items.find((i) => i.key === key);
      const v = it?.verdict ?? "(not raised)";
      verdicts.set(v, (verdicts.get(v) ?? 0) + 1);
    }
    console.log(`  ${key.padEnd(28)}: ${[...verdicts].map(([v, n]) => `${v}×${n}`).join(" ")}`);
  }
}

// ⚠️ `process.env.GEMINI_MODEL` is the LOCAL model, and writing it as the
// run's model labelled every --remote run with the wrong engine. A whole
// verification pass was spent chasing that: the archive said gemini-2.5-flash
// while report.model, which is the deployed function's own answer, said
// gemini-flash-latest. A field that is right in one mode and silently wrong in
// the other is worse than no field.
//
// The engine the run actually used is whatever the report came back saying.
const enginesUsed = [...new Set(results.map((r) => r?.report?.model).filter(Boolean))];
fs.writeFileSync(
  path.join(HERE, ARGS.out),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      host: REMOTE ? `remote ${REMOTE.base}` : "local source",
      /** What the engine reported for itself, not what this process was configured with. */
      engines: enginesUsed,
      localModelEnv: REMOTE ? null : (process.env.GEMINI_MODEL ?? null),
      args: ARGS,
      results,
    },
    null,
    2,
  ),
);
console.log(`\nwrote eval/${ARGS.out}`);
