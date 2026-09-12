import test from "node:test";
import assert from "node:assert/strict";
import { buildReportItems } from "../supabase/functions/_shared/reportItems.ts";
import { handle } from "../supabase/functions/api/report.ts";

const sign = { id: "s1", key: "hardship-request", title: "Request for help", kind: "legal", lineId: "c1", t: 3000, handled: true };
const lines = [
  { id: "w0", speaker: "worker", t: 1000, text: "Hello." },
  { id: "c1", speaker: "customer", t: 2000, text: "I cannot make this payment." },
  { id: "w1", speaker: "worker", t: 2500, text: "Let us discuss support options." },
];
const judge = (overrides = {}) => ({ signId: "s1", verdict: "handled", note: "Offered support.", evidenceLineIds: ["w1"], ...overrides });
const build = (items, transcript = lines) => buildReportItems([sign], transcript, items, 1000)[0];

test("accepts a worker response after the trigger even before detector latency", () => {
  const result = build([judge()]);
  assert.equal(result.verdict, "handled");
  assert.deepEqual(result.evidence, [{ lineId: "w1", offsetMs: 1500 }]);
  assert.ok(!JSON.stringify(result).includes(lines[2].text));
});
test("a tick cannot fill in a missing model judgement", () => {
  assert.equal(build([]).verdict, "unverified");
});
test("customer, invented and pre-trigger evidence cannot prove handling", () => {
  for (const id of ["c1", "invented", "w0"]) {
    assert.equal(build([judge({ evidenceLineIds: [id] })]).verdict, "unverified");
  }
});
test("duplicate model judgements produce one unverified item", () => {
  assert.equal(build([judge(), judge()]).verdict, "unverified");
});
test("no identifiable worker response is unverified, not missed", () => {
  assert.equal(build([judge({ verdict: "missed", evidenceLineIds: [] })], lines.slice(0, 2)).verdict, "unverified");
});
test("an observed missed response remains distinct from insufficient evidence", () => {
  assert.equal(build([judge({ verdict: "missed", note: "Did not offer support.", evidenceLineIds: [] })]).verdict, "missed");
});

test("report endpoint counts missing judgements as unverified and suppresses score", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  globalThis.fetch = async (_url, options) => {
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    assert.ok(prompt.includes("id=w1"));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      summary: "Review needed.", items: [], missedByAI: [], tip: "Check the response.", score: 100,
    }) }] } }] });
  };
  try {
    const response = await handle(new Request("http://localhost/api/report", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ session: {
        id: "call1", mode: "demo", customer: { name: "Demo", product: "Home loan", direction: "inbound" },
        lines, signs: [{ ...sign, askNext: "Discuss support", evidence: "", dueDate: "2026-10-03" }],
        startedAt: 1000, endedAt: 4000,
      } }),
    }));
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.handled, 0);
    assert.equal(report.missed, 0);
    assert.equal(report.unverified, 1);
    assert.equal(report.scoreUnverified, true);
    assert.equal(report.deadlines.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
