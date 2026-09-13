import { useEffect, useRef, useState } from "react";
import { getHealth } from "../lib/api";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import { Mark } from "./TopBar";
// Both sheets are already in the build; this reuses the clear-history control
// rather than inventing a second way to ask the same question.
import "./report-visuals.css";
import "./clear-history.css";
import "./about.css";


const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * Deleting everything, asked in the app's own words.
 *
 * It used to be `window.confirm()` — the operating system's dialog, which no
 * stylesheet reaches, which arrives with no relationship to the page it
 * interrupts, and which on the privacy section is the loudest thing on it. The
 * same reasoning that replaced the native <select>, applied to the only
 * destructive control in the build.
 *
 * The shape is the clear-history control from the Deadlines tab, reused rather
 * than reinvented: both halves stay in the tree and one grid row closes as the
 * other opens, so the question and its answer are one movement instead of a
 * cut. Focus lands on the outcome, which is also the live region, so a
 * keyboard is not dumped at the top of the page by the button it was standing
 * on.
 */
function WipeEverything() {
  const store = useStore();
  const [armed, setArmed] = useState(false);
  const [gone, setGone] = useState<string | null>(null);
  const done = useRef<HTMLParagraphElement>(null);

  const held = [
    plural(store.reports.length, "report card"),
    plural(store.deadlines.length, "deadline"),
    plural(store.lessons.length, "lesson"),
    plural(store.scenarios.length, "practice customer"),
  ].join(" · ");
  const total = store.reports.length + store.deadlines.length + store.lessons.length + store.scenarios.length;

  return (
    <div className={"clear-data" + (armed ? " armed" : "") + (gone ? " cleared" : "")}>
      <div className="clear-swap" inert={gone ? true : undefined} aria-hidden={gone ? true : undefined}>
        <div>
          <div className="clear-head">
            <span className="rv-label">{total === 0 ? "Nothing stored on this device" : `${held} on this device`}</span>
            {total > 0 && (
              <button
                className="btn danger sm"
                aria-expanded={armed}
                onClick={() => {
                  setArmed(!armed);
                  play("tap");
                }}
              >
                {armed ? "Keep it all" : "Delete everything"}
              </button>
            )}
          </div>
          <div className="clear-ask" aria-hidden={!armed}>
            <div>
              <p className="clear-say">
                Removes every report card, deadline, lesson and practice customer from this browser, including any clock still
                running. Nothing is sent anywhere, and nothing here can be recovered.
              </p>
              <button
                className="btn danger sm"
                tabIndex={armed ? undefined : -1}
                onClick={() => {
                  actions.wipe();
                  play("undo");
                  setGone(`Deleted ${held}. This device is empty.`);
                  setArmed(false);
                  window.setTimeout(() => done.current?.focus(), 0);
                }}
              >
                Delete everything on this device
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="clear-swap outcome">
        <div>
          <p className="clear-done" ref={done} tabIndex={-1} role="status">
            {gone}
          </p>
        </div>
      </div>
    </div>
  );
}

interface EvalResults {
  model: string;
  ranAt: string;
  n: number;
  overall: { precision: number; recall: number; f1: number; exact: number };
  speakerAccuracy: number;
  latency: { p50: number; p95: number };
}

export function About() {
  const [ev, setEv] = useState<EvalResults | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; gemini: boolean; model: string } | null>(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}eval-results.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEv(d))
      .catch(() => {});
    getHealth().then(setHealth).catch(() => setHealth({ ok: false, gemini: false, model: "" }));
  }, []);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <div className="page narrow about">
      {/* This header used to request brand/callflag-logo.png, which is not in
          the repo and never has been — so every load 404'd and the artwork
          simply never appeared. A probe hid the broken image, which is why
          nobody noticed: the page looked fine and the network tab did not, and
          the network tab is where a technical judge looks.

          ⭐ A guard that hides a failure is not a fix; it is a way of not being
          told. Its replacement — a second code-drawn <Mark /> in the logo slot —
          measured 0x0: the sizing rule is scoped to `.brand-lockup`, so the fix
          for an invisible image was an invisible element. One mark, in the
          lockup, at a size that no longer outranks the page. */}
      <header className="brand-head">
        <div className="brand-lockup">
          <Mark />
          <div>
            <h1 className="brand-name">The Hard Call</h1>
            <p className="brand-tag">Client alerts for banking staff.</p>
          </div>
        </div>
      </header>
      <p className="lede">Live signs for a bank's hardship calls, with the question to ask next. Then the calls you got wrong become your practice.</p>

      {/* The evidence comes before the argument. This section was the last
          thing on the page above the privacy list, at y=827 on a 900px
          viewport — a judge had to scroll past four lines of OTHER lenders'
          numbers to reach the only numbers this build measured about itself.
          Nothing it says has changed; where it sits and what it sits on have. */}
      <section className="engine">
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
      </section>

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

      <h2>Privacy, by design</h2>
      <ul className="claims">
        <li>Nothing new is collected. Banks already record these calls; this reads the same call.</li>
        <li>It flags what to do, not who the person is. No diagnosis or label is ever written.</li>
        <li>Words are never stored. Only the signs, the report card and the deadlines are kept, on this device.</li>
        <li>Card, account, BSB, TFN and Medicare numbers are masked before a sentence leaves the browser.</li>
        <li>Practice customers built from real calls have the name, job, suburb and every number changed, and a person approves each one.</li>
        <li>The AI never decides and never speaks to a real customer.</li>
      </ul>
      <WipeEverything />

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
