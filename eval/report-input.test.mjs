import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adaptReportInput } from "../supabase/functions/_shared/reportInput.ts";
import { handle } from "../supabase/functions/api/report.ts";
const read = (file) => JSON.parse(readFileSync(new URL(`../fixtures/${file}`, import.meta.url)));
const examples = read("expected/flag_events.example.json").calls;
const fixture = (name) => {
  const transcript = read(name);
  return { transcript, flags: examples[transcript.call_id].flags };
};
const negative = fixture("call_002_temporary_difficulty.json");
const positive = fixture("call_001_clear_hardship.json");
const missed = fixture("call_003_missed_notice.json");
const request = (body) => new Request("http://localhost/api/report", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

test("call_002: empty flags yield no obligations, missed items or deadlines without an AI call", async () => {
  const fetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected AI request"); };
  try {
    const response = await handle(request(negative));
    assert.equal(response.status, 200);
    const result = await response.json();
    for (const key of ["items", "deadlines", "missedByAI"]) assert.deepEqual(result[key], []);
    assert.equal(result.missed, 0);
    assert.equal(result.scoreUnverified, true);
    assert.equal(result.durationSec, 96);
    assert.equal(result.model, "not-used");
  } finally { globalThis.fetch = fetch; }
});

test("all three fixtures map staff, duration and raised_at without depending on fixture annotations", () => {
  for (const input of [negative, positive, missed]) {
    const { call_id, turns } = input.transcript;
    const result = adaptReportInput({ transcript: { call_id, turns }, flags: input.flags });
    assert.equal(result.id, call_id);
    assert.equal(result.endedAt, Math.max(...turns.map((t) => t.end_ms)));
    assert.equal(result.lines[0].speaker, "worker");
    for (const [i, sign] of result.signs.entries()) {
      const line = result.lines.find((l) => l.id === sign.lineId);
      assert.equal(line.t, input.flags[i].raised_at.start_ms);
      assert.equal(sign.handled, false); // example resolution is not evaluation evidence
      assert.equal(sign.evidence, "");
      assert.equal(sign.dueDate, undefined); // relative offsets are not calendar dates
    }
  }
});

test("invalid references, cross-call flags and missing flags are rejected", async () => {
  const mutations = [
    (v) => { delete v.flags; },
    (v) => { v.flags[0].call_id = "another-call"; },
    (v) => { v.flags[0].raised_at.start_ms = 999999; },
    (v) => { v.flags.push(v.flags[0]); },
    (v) => { v.transcript.turns[0].speaker = "unknown"; },
    (v) => { v.transcript.turns[0].end_ms = -1; },
    (v) => { v.transcript.turns[1].start_ms = -1; },
    (v) => { v.session = {}; },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(positive); mutate(input);
    const response = await handle(request(input));
    assert.equal(response.status, 400);
  }
});

test("call_003: endpoint evaluates supplied flags and preserves worker evidence offsets", async () => {
  const originalFetch = globalThis.fetch;
  const key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  const session = adaptReportInput(missed);
  const evidence = session.lines.find((l) => l.speaker === "worker" && l.t === 111000);
  globalThis.fetch = async (_url, options) => {
    const sent = JSON.parse(options.body);
    assert.ok(sent.systemInstruction.parts[0].text.includes("Assess only those flags"));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      summary: "You missed the support process.",
      items: session.signs.map((s) => ({ signId: s.id, verdict: "missed", note: "Did not explain the process.", evidenceLineIds: [evidence.id] })),
      missedByAI: ["Invented additional obligation"], tip: "Explain the support process.", score: 20,
    }) }] } }] });
  };
  try {
    const response = await handle(request(missed));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.items.length, 2);
    assert.equal(result.missed, 2);
    assert.deepEqual(result.items[0].evidence, [{ lineId: evidence.id, offsetMs: 111000 }]);
    assert.deepEqual(result.missedByAI, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = key;
  }
});

test("speaker_confidence is optional, validated, and defaults to known", () => {
  const base = fixture("call_003_missed_notice.json");
  // Every existing fixture is silent on the field and must keep its meaning.
  for (const line of adaptReportInput(base).lines) assert.equal(line.speakerConfidence, "known");

  const marked = { ...base, transcript: { ...base.transcript, turns: base.transcript.turns.map((t, i) => (i === 0 ? { ...t, speaker_confidence: "inferred" } : t)) } };
  const lines = adaptReportInput(marked).lines;
  assert.equal(lines[0].speakerConfidence, "inferred");
  assert.equal(lines[1].speakerConfidence, "known");

  // A typo is refused rather than read as the safe default: silently trusting
  // one is the failure the field exists to prevent.
  for (const bad of ["Known", "guessed", "", null, 1]) {
    const broken = { ...base, transcript: { ...base.transcript, turns: base.transcript.turns.map((t, i) => (i === 0 ? { ...t, speaker_confidence: bad } : t)) } };
    assert.throws(() => adaptReportInput(broken), /Invalid transcript turn at index 0/, `${JSON.stringify(bad)} must be refused`);
  }
});
