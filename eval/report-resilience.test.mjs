import test from "node:test";
import assert from "node:assert/strict";
import { localReport } from "../src/lib/localReport.ts";
import { hasVerifiedReportScore } from "../src/lib/reportScore.ts";
import { handle } from "../supabase/functions/api/report.ts";
const session = {
 id: "offline", mode: "practice", coaching: false,
 customer: { name: "Test", product: "Loan", direction: "inbound" },
 startedAt: 1000, endedAt: 5000,
 lines: [{ id: "c", speaker: "customer", t: 1000, text: "I cannot make my repayment." },
         { id: "w", speaker: "worker", t: 2000, text: "Let us discuss the support process." }],
 signs: [{ id: "s", key: "hardship-request", kind: "legal", title: "Request for help", askNext: "Discuss support", evidence: "", handled: true, t: 1000, lineId: "c", dueDate: "2026-10-03" }],
};
const req = (s) => new Request("http://localhost/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: s }) });

test("browser fallback never counts a checkbox as verified handling", () => {
 for (const error of [new Error("429 rate limit"), new Error("fetch failed")]) {
  const report = localReport(session, error);
  assert.equal(report.handled, 0);
  assert.equal(report.missed, 0);
  assert.equal(report.unverified, 1);
  assert.equal(report.deadlines.length, 1);
  assert.equal(report.durationSec, 4);
  assert.equal(hasVerifiedReportScore(report), false);
  assert.equal(report.items[0].verdict, "unverified");
  assert.ok(!report.summary.includes("daily"));
 }
});

test("unverified scores cannot win even when old cloud rows lost the metadata", () => {
 const valid = { score: 70, items: [{ verdict: "handled" }] };
 assert.equal(hasVerifiedReportScore(valid), true);
 for (const patch of [{ scoreUnverified: true }, { degraded: true }, { score: NaN }, { score: 101 }, { items: [] }, { items: [{ verdict: "unverified" }] }]) {
  assert.equal(hasVerifiedReportScore({ ...valid, ...patch }), false);
 }
});

test("server quota and network failures preserve records without awarding handling", async () => {
 const original = globalThis.fetch;
 const keyNames = ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"];
 const previous = keyNames.map((key) => process.env[key]);
 keyNames.forEach((key) => delete process.env[key]);
 process.env.GEMINI_API_KEY = "test-only";
 try {
  for (const quota of [true, false]) {
   globalThis.fetch = async () => {
    if (quota) return Response.json({ error: { message: "429 rate limit" } }, { status: 429 });
    throw new Error("network unavailable");
   };
   const response = await handle(req(session));
   assert.equal(response.status, 200);
   const report = await response.json();
   assert.equal(report.degradedReason, quota ? "quota" : "unreachable");
   assert.equal(report.handled, 0);
   assert.equal(report.unverified, 1);
   assert.equal(report.missed, 0);
   assert.equal(report.deadlines.length, 1);
   assert.equal(report.scoreUnverified, true);
  }
 } finally {
  globalThis.fetch = original;
  keyNames.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
 }
});

test("coaching switch alone changes neither model prompt nor report judgement", async () => {
 const original = globalThis.fetch;
 const oldKey = process.env.GEMINI_API_KEY;
 process.env.GEMINI_API_KEY = "test-only";
 const prompts = [];
 globalThis.fetch = async (_url, options) => {
  prompts.push(JSON.parse(options.body).contents);
  return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
   summary: "Support discussed.", items: [{ signId: "s", verdict: "handled", note: "Discussed support.", evidenceLineIds: ["w"] }],
   missedByAI: [], tip: "Confirm next steps.", score: 75,
  }) }] } }] });
 };
 try {
  const off = await (await handle(req({ ...session, coaching: false }))).json();
  const on = await (await handle(req({ ...session, coaching: true }))).json();
  assert.deepEqual(prompts[0], prompts[1]);
  assert.deepEqual(off, on);
  assert.equal(off.handled, 1);
 } finally {
  globalThis.fetch = original;
  if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
 }
});

test("an unresolved request creates an unscored operational follow-up", async () => {
 const requestSign = { id: "rq", key: "ask-about-hardship", kind: "tip", tier: "request",
  title: "Worth asking about hardship", askNext: "How long will this affect repayments?", evidence: "things are tight",
  handled: false, t: 1000, lineId: "c", followUpDays: 7, followUpDate: "2026-09-20" };
 const original = globalThis.fetch;
 const oldKey = process.env.GEMINI_API_KEY;
 process.env.GEMINI_API_KEY = "test-only";
 globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
  summary: "Ask the threshold question.", items: [{ signId: "rq", verdict: "missed", note: "The threshold question was not asked.", evidenceLineIds: [] }],
  missedByAI: [], tip: "Ask how long repayments will be affected.", score: 100,
 }) }] } }] });
 try {
  const report = await (await handle(req({ ...session, signs: [requestSign] }))).json();
  assert.equal(report.items[0].tier, "request");
  assert.equal(report.caught, 0);
  assert.equal(report.missed, 0);
  assert.equal(report.unverified, 0);
  assert.equal(report.scoreUnverified, true);
  assert.deepEqual(report.deadlines.map(d => [d.type, d.date]), [["followup", "2026-09-20"]]);
 } finally {
  globalThis.fetch = original;
  if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
 }
});

test("fallback keeps a request follow-up separate from legal deadlines", () => {
 const report = localReport({ ...session, signs: [{ id: "rq", key: "ask-about-hardship", kind: "tip", title: "Ask about hardship",
  askNext: "How long?", evidence: "tight", handled: false, t: 1000, lineId: "c", followUpDays: 7, followUpDate: "2026-09-20" }] }, new Error("429"));
 assert.equal(report.items[0].tier, "request");
 assert.equal(report.unverified, 0);
 assert.equal(report.deadlines[0].type, "followup");
 assert.equal(hasVerifiedReportScore(report), false);
});
