// Offline integration against a compiled detector module from the team's branch.
// Usage: node eval/detector-report.mjs /absolute/path/to/detector/index.js
// The detector is real; Gemini is mocked. This verifies wiring, not AI accuracy.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { adaptReportInput } from "../supabase/functions/_shared/reportInput.ts";
import { handle } from "../supabase/functions/api/report.ts";

if (!process.argv[2]) throw new Error("Pass the compiled detector index.js path.");
const { detect, LiveDetector } = await import(pathToFileURL(resolve(process.argv[2])).href);
const read = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url)));
const calls = [read("call_002_temporary_difficulty.json"), read("call_001_clear_hardship.json"), read("call_003_missed_notice.json"), read("call_004_deferral_request.json")];
const request = (transcript, flags) => new Request("http://localhost/api/report", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript, flags }),
});
const previousFetch = globalThis.fetch;
const previousKey = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = "offline-test-only";
try {
  for (const call of calls) {
    const flags = await detect(call, { mode: "rules" });
    const live = new LiveDetector(call.call_id, { mode: "rules" });
    const emitted = [];
    for (const turn of call.turns) emitted.push(...await live.push(turn));
    assert.deepEqual(await live.finalise(), flags);
    // A provisional request may disappear when a later turn names recovery.
    // The report consumes finalise(), not the accumulated live prompt list.
    for (const flag of flags) assert.ok(emitted.some(f => f.rule_id === flag.rule_id));
    if (call.call_id === "call_002") assert.ok(emitted.every(f => f.kind === "request"));
    if (call.call_id === "call_002") assert.deepEqual(flags, []);
    if (call.call_id === "call_001") {
      assert.equal(flags.length, 3);
      assert.equal(flags[0].raised_at.start_ms, 51200);
    }
    if (call.call_id === "call_003") {
      assert.equal(flags.length, 3);
      assert.equal(flags.find((f) => f.rule_id === "NCC_72_ORAL_NOTICE").raised_at.start_ms, 45000);
      assert.equal(flags.find((f) => f.rule_id === "ABA_INFORM_HARDSHIP_PROVISIONS").escalated_at.start_ms, 103200);
    }
    const session = adaptReportInput({ transcript: call, flags });
    const obligations = flags.filter(f => f.kind === "obligation" && f.persist);
    assert.equal(session.signs.length, obligations.length);
    // Stub the report model only. Deliberately omit all judgements: detector
    // resolution must not silently become the report's own evidence-based mark.
    let modelCalls = 0;
    globalThis.fetch = async () => {
      modelCalls++;
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        summary: "Offline integration stub.", items: [], missedByAI: [], tip: "Review required.", score: 100,
      }) }] } }] });
    };
    const response = await handle(request(call, flags));
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.items.length, obligations.length);
    assert.equal(report.unverified, obligations.length);
    assert.equal(report.handled, 0);
    assert.equal(modelCalls, obligations.length ? 1 : 0);
    assert.equal(report.scoreUnverified, true);
    assert.deepEqual(report.missedByAI, []);
    assert.equal(session.lines.length, call.turns.length);
    console.log(`${call.call_id}: ${flags.length} detector events / ${obligations.length} report obligations, batch/stream agreement, adapter and report API PASS`);
  }
  // Same customer utterances, changed worker response: no coaching toggle is
  // supplied to either engine. This exercises a demo candidate, not an AI grade.
  const missed = calls[2];
  const coached = structuredClone(missed);
  coached.call_id = "call_003_coached_test";
  coached.turns.find((t) => t.start_ms === 64600).text =
    "There is a hardship process under the National Credit Code. I will lodge your hardship request now.";
  assert.deepEqual(coached.turns.filter((t) => t.speaker === "customer"), missed.turns.filter((t) => t.speaker === "customer"));
  const before = await detect(missed);
  const after = await detect(coached);
  assert.ok(before.every((f) => f.resolution.status === "missed"));
  assert.ok(after.every((f) => f.resolution.status === "satisfied"));
  assert.ok(after.every((f) => f.resolution.evidence.start_ms === 64600));
  console.log("call_003 response variant: detector resolution changes with worker words PASS (not legal completion or a real AI score)");
} finally {
  globalThis.fetch = previousFetch;
  if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousKey;
}
