import { useEffect, useState } from "react";
import { getHealth } from "../lib/api";
import { actions, useStore } from "../lib/store";

interface EvalResults {
  model: string;
  ranAt: string;
  n: number;
  overall: { precision: number; recall: number; f1: number; exact: number };
  speakerAccuracy: number;
  latency: { p50: number; p95: number };
}

export function About() {
  const store = useStore();
  const [ev, setEv] = useState<EvalResults | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; gemini: boolean; model: string } | null>(null);
  useEffect(() => {
    fetch("/eval-results.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEv(d))
      .catch(() => {});
    getHealth().then(setHealth).catch(() => setHealth({ ok: false, gemini: false, model: "" }));
  }, []);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <div className="page narrow about">
      <h1>The Hard Call</h1>
      <p className="lede">Live signs for a bank's hardship calls, with the question to ask next. Then the calls you got wrong become your practice.</p>

      <h2>Why</h2>
      <p>
        People in money trouble almost never say the word "hardship". They say "I'm a bit behind". Under the National Credit Code that still counts, and the
        bank has 21 days to reply in writing. In 2025 NAB was fined $15.5m over 345 hardship requests that were not answered in time. ASIC's review of ten
        lenders found 35% of people who asked for help dropped out of the process, and that training staff to spot hardship lifted the number caught by 58%.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>The worker puts the call on speaker. The browser's own speech engine turns it into words; nothing is recorded.</li>
        <li>Each finished sentence goes, with card and account numbers masked, to a small flag engine (Gemini) that knows eleven signs and Australian hardship law.</li>
        <li>A sign appears once, live, with the reply-due date and one question the worker can ask next. The worker decides. The AI never talks to the customer.</li>
        <li>After the call, a report card judges the worker, not the customer, and the legal deadlines land in Deadlines.</li>
        <li>Practice mode: an ElevenLabs voice agent plays a customer who hides the real problem. Any real call can become a practice customer, de-identified and approved by a person.</li>
        <li>Managers correct signs. Every correction is sent with every future call, so the engine learns the team's judgement.</li>
      </ol>

      <h2>How good is the engine</h2>
      {ev ? (
        <>
          <div className="kv">
            <div className="stat">
              <div className="label">Precision</div>
              <b>{pct(ev.overall.precision)}</b>
            </div>
            <div className="stat">
              <div className="label">Recall</div>
              <b>{pct(ev.overall.recall)}</b>
            </div>
            <div className="stat">
              <div className="label">Exact match</div>
              <b>{pct(ev.overall.exact)}</b>
            </div>
            <div className="stat">
              <div className="label">Speaker</div>
              <b>{pct(ev.speakerAccuracy)}</b>
            </div>
            <div className="stat">
              <div className="label">Latency p50</div>
              <b>{(ev.latency.p50 / 1000).toFixed(1)}s</b>
            </div>
          </div>
          <p className="small muted">
            {ev.n} labelled utterances, {ev.model}, run {new Date(ev.ranAt).toLocaleDateString("en-AU")}. Re-run with <span className="mono">npm run eval</span>.
          </p>
        </>
      ) : (
        <p className="muted">Eval results not published on this build yet.</p>
      )}
      {health && (
        <p className="small muted">
          Server: {health.ok ? "up" : "down"} · model {health.model || "—"} · key {health.gemini ? "configured" : "missing"}
        </p>
      )}

      <h2>Privacy, by design</h2>
      <ul>
        <li>Nothing new is collected. Banks already record these calls; this reads the same call.</li>
        <li>It flags what to do, not who the person is. No diagnosis or label is ever written.</li>
        <li>Words are never stored. Only the signs, the report card and the deadlines are kept, on this device.</li>
        <li>Card, account, BSB, TFN and Medicare numbers are masked before a sentence leaves the browser.</li>
        <li>Practice customers built from real calls have the name, job, suburb and every number changed, and a person approves each one.</li>
        <li>The AI never decides and never speaks to a real customer.</li>
      </ul>
      <button
        className="btn danger"
        onClick={() => {
          if (window.confirm("Delete every report, deadline, lesson and practice customer on this device?")) actions.wipe();
        }}
      >
        Delete everything on this device
      </button>
      <p className="small muted" style={{ marginTop: 8 }}>
        {store.reports.length} report{store.reports.length === 1 ? "" : "s"} · {store.deadlines.length} deadline{store.deadlines.length === 1 ? "" : "s"} ·{" "}
        {store.lessons.length} lesson{store.lessons.length === 1 ? "" : "s"} · {store.scenarios.length} practice customer{store.scenarios.length === 1 ? "" : "s"}
      </p>

      <h2>Sources</h2>
      <ul>
        <li>National Credit Code s72 — hardship notices and the 21-day reply.</li>
        <li>ASIC RG 271 — complaints, 30-day written response.</li>
        <li>ASIC Report 782 (May 2024) and Report 815 (Sep 2025) — hardship at ten lenders.</li>
        <li>ASIC 25-165MR (Aug 2025) — NAB and AFSH, $15.5m penalty.</li>
        <li>iTnews, 1 Oct 2025 — Bendigo and Adelaide Bank detects hardship in calls after the call.</li>
      </ul>
      <p className="small muted">Sounds are real recordings from Mixkit (see /sfx/ATTRIBUTION.md). Built for Forward: AI in Business Hackathon, 12–14 Sep 2026.</p>
    </div>
  );
}
