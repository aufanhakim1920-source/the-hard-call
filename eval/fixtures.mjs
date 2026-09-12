// npm run eval:fixtures — run the real sign engine over laural's call fixtures
// and score it against her ground truth.
//
// Her contract (docs/transcript-schema.md) is `{call_id, turns:[{speaker:
// "customer"|"staff", start_ms, end_ms, text}]}`; our engine speaks
// `{lines:[{id, speaker:"customer"|"worker", text}]}`. This adapter is the only
// place that translation lives, so when the two shapes converge it is one file
// to delete, not a rewrite.
//
// The test that matters is call_002: informal hardship vocabulary in a
// situation that legally is NOT a hardship notice. Anything that fires there
// is a sentiment classifier wearing a legal hat.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const FIX = join(root, "fixtures");

// --- env (never printed) ---------------------------------------------------
if (!process.env.GEMINI_API_KEY) {
  for (const f of [join(root, ".env"), "C:/Coding/.env.shared"]) {
    try {
      for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim());
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
      if (process.env.GEMINI_API_KEY) break;
    } catch {
      /* next candidate */
    }
  }
}
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not found in .env or C:/Coding/.env.shared");
  process.exit(0);
}

const { handle } = await import("../supabase/functions/api/flags.ts");

// Our legal sign key ↔ her rule id.
const RULE_FOR = {
  "hardship-request": "NCC_72_ORAL_NOTICE",
  complaint: "RG271_COMPLAINT",
  "inform-hardship-provisions": "ABA_INFORM_HARDSHIP_PROVISIONS",
};

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const todayISO = new Date().toISOString().slice(0, 10);

function loadFixtures() {
  return readdirSync(FIX)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(FIX, f), "utf8")))
    .filter((c) => (only ? c.call_id === only : true))
    .sort((a, b) => a.call_id.localeCompare(b.call_id));
}

const expected = JSON.parse(readFileSync(join(FIX, "expected", "expected_flags.json"), "utf8"));
const tolerance = expected.tolerance_ms ?? 3000;

async function flagsFor(lines, newLineId, existingKeys) {
  const req = new Request("http://local/api/flags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lines, newLineId, existingKeys, lessons: [], todayISO, direction: "inbound" }),
  });
  const res = await handle(req);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `flags ${res.status}`);
  return body.signs ?? [];
}

async function runCall(call) {
  // Stream the turns the way a live call does: one at a time, engine sees only
  // what has been said so far.
  const lines = [];
  const raised = [];
  const keys = new Set();
  for (let i = 0; i < call.turns.length; i++) {
    const t = call.turns[i];
    lines.push({
      id: `t${i}`,
      speaker: t.speaker === "staff" ? "worker" : "customer",
      text: t.text,
      startMs: t.start_ms,
    });
    const signs = await flagsFor(
      lines.map(({ id, speaker, text }) => ({ id, speaker, text })),
      `t${i}`,
      [...keys],
    );
    for (const s of signs) {
      keys.add(s.key);
      raised.push({ key: s.key, rule_id: RULE_FOR[s.key] ?? null, kind: s.kind, title: s.title, atMs: t.start_ms, turn: i, evidence: s.evidence });
    }
  }
  return raised;
}

function score(call, raised) {
  const exp = expected[call.call_id];
  const out = { call: call.call_id, pass: true, notes: [] };
  if (!exp) {
    out.notes.push("no ground truth for this call");
    return out;
  }
  for (const want of exp.must_flag ?? []) {
    const hit = raised.find((r) => r.rule_id === want.rule_id);
    if (!hit) {
      out.pass = false;
      out.notes.push(`MISS  ${want.rule_id} never fired (expected at ${want.trigger_turn_start_ms}ms)`);
    } else {
      const off = Math.abs(hit.atMs - want.trigger_turn_start_ms);
      if (off > tolerance) {
        out.pass = false;
        out.notes.push(`LATE  ${want.rule_id} fired at ${hit.atMs}ms, expected ${want.trigger_turn_start_ms}ms (${(off / 1000).toFixed(1)}s off, tolerance ${tolerance / 1000}s)`);
      } else {
        out.notes.push(`ok    ${want.rule_id} at ${hit.atMs}ms (${(off / 1000).toFixed(1)}s off)`);
      }
    }
  }
  for (const never of exp.must_not_flag ?? []) {
    const hit = raised.find((r) => r.rule_id === never.rule_id);
    if (hit) {
      out.pass = false;
      out.notes.push(`FALSE POSITIVE  ${never.rule_id} fired at ${hit.atMs}ms on "${hit.evidence}" — ${never.why}`);
    } else {
      out.notes.push(`ok    ${never.rule_id} correctly did not fire`);
    }
  }
  const tips = raised.filter((r) => r.kind === "tip").map((r) => r.title);
  if (tips.length) out.notes.push(`      tips (not scored): ${tips.join("; ")}`);
  return out;
}

const results = [];
for (const call of loadFixtures()) {
  process.stdout.write(`\n${call.call_id}  ${call.scenario ?? ""}\n`);
  const raised = await runCall(call);
  const r = score(call, raised);
  results.push({ ...r, raised });
  for (const n of r.notes) console.log("  " + n);
  console.log(`  ${r.pass ? "PASS" : "FAIL"}`);
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} fixtures pass\n`);
writeFileSync(join(root, "eval", "fixture-results.json"), JSON.stringify({ ranAt: new Date().toISOString(), passed, total: results.length, results }, null, 2));
process.exit(0);
