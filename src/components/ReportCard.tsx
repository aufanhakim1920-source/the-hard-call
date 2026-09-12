import { hasVerifiedReportScore } from "../lib/reportScore";
import { useState } from "react";
import { postScenario } from "../lib/api";
import { fmtDate, fmtWhen } from "../lib/dates";
import { levelLabel, pickVoice } from "../lib/scenarios";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import { PHONE, useMedia } from "../lib/useMedia";
import type { LessonKind, Report, ReportItem, Scenario, Session } from "../lib/types";
import { uid } from "../lib/types";
import { CallTimeline } from "./CallTimeline";
import { DeadlineTrack } from "./DeadlineTrack";
import { ReportLedger } from "./ReportLedger";
import { Toast } from "./Toast";
import { ResponseTimes } from "./ResponseTimes";
import { ScoreRing } from "./ScoreRing";

function evidenceTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ReportCard({
  report,
  session,
  onNew,
  onPractice,
}: {
  report: Report;
  session: Session;
  onNew: () => void;
  onPractice: (s: Scenario) => void;
}) {
  const store = useStore();
  // The worker's own earlier calls in this mode — the only honest benchmark for
  // a number out of 100. Newest first, as the store keeps them.
  const previous = store.reports.filter((r) => r.mode === report.mode && r.callId !== report.callId);
  const phone = useMedia(PHONE);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [cKind, setCKind] = useState<LessonKind>("not-a-sign");
  const [cText, setCText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [draft, setDraft] = useState<Scenario | null>(null);
  const [buildErr, setBuildErr] = useState<string | null>(null);

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2200);
  };

  const saveCorrection = (item: ReportItem) => {
    if (!cText.trim()) return;
    const sign = session.signs.find((g) => g.id === item.signId);
    actions.addLesson({ kind: cKind, text: cText.trim(), signKey: item.key, evidence: sign?.evidence });
    setCorrecting(null);
    setCText("");
    play("handled");
    say("Saved. The engine will use this on every call from now on.");
  };

  const buildScenario = async () => {
    setBuilding(true);
    setBuildErr(null);
    try {
      const s = await postScenario(session, report);
      setDraft({
        id: uid("sc"),
        name: s.name,
        age: s.age,
        voice: s.voice,
        voiceId: pickVoice(s.voice, s.age, session.id).id,
        job: s.job,
        product: s.product,
        situation: s.situation,
        hiddenProblem: s.hiddenProblem,
        firstMessage: s.firstMessage,
        level: s.level,
        expectedSigns: s.expectedSigns,
        whyThisOne: s.whyThisOne,
        source: "generated",
        fromCallId: session.id,
        createdAt: Date.now(),
        approved: false,
        plays: 0,
      });
    } catch (e) {
      setBuildErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  };

  const approve = () => {
    if (!draft) return;
    actions.addScenario({ ...draft, approved: true });
    play("handled");
    say("Approved. It's in Practice now.");
  };

  const copy = async () => {
    const lines = [
      `CallFlag — report card, ${fmtWhen(report.at)}`,
      `${report.customer} · ${report.mode} · score ${!hasVerifiedReportScore(report) ? "not verified" : report.score}`,
      report.summary,
      ...report.items.map((i) => `${i.verdict.toUpperCase()} — ${i.title}: ${i.note}`),
      ...report.deadlines.map((d) => `${d.label} ${fmtDate(d.date)} — ${d.title}`),
      // No model write-up means no tip. A bare "Tip:" pasted into a case note
      // reads as advice that went missing, rather than one that was never given.
      ...(report.tip.trim() ? [`Tip: ${report.tip}`] : []),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      say("Copied.");
    } catch {
      say("Couldn't copy on this browser.");
    }
  };

  return (
    <div className="report">
      <div className="top">
        <div>
          <span className="label">Report card · {report.mode}</span>
          <h1>{report.customer}</h1>
          {/* A degraded card carries no model, and "judged by " with nothing
              after it reads as a bug rather than as an outage. */}
          <span className="muted small">
            {fmtWhen(report.at)} · {Math.floor(report.durationSec / 60)} min {report.durationSec % 60} s
            {report.model ? ` · judged by ${report.model}` : " · not judged"}
          </span>
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        {/* On a phone the ring was spending ~250px of the first screen, and on
            most calls it spends it saying "not verified". It shrinks rather
            than leading with nothing. */}
        <ScoreRing score={report.score} unverified={!hasVerifiedReportScore(report)} size={phone ? 92 : 132} />
      </div>

      <ReportLedger report={report} previous={previous} />

      <ResponseTimes session={session} report={report} />

      <CallTimeline session={session} report={report} />

      <p className="summary">{report.summary}</p>
      {!!report.unverified && (
        <p className="muted small">
          {report.unverified === 1
            ? "One judgement could not be verified from the transcript. It is not counted as missed."
            : `${report.unverified} judgements could not be verified from the transcript. They are not counted as missed.`}
        </p>
      )}

      <div className="verdicts">
        {report.items.map((i) => (
          <div className="verdict" key={i.signId}>
            <span className={"v " + i.verdict}>{i.verdict}</span>
            <div>
              <div className="t">{i.title}</div>
              <div className="n">{i.note}</div>
              {i.evidence?.map((e) => {
                const line = session.lines.find((l) => l.id === e.lineId && l.speaker === "worker");
                return <div className="n" key={e.lineId}><b className="mono">{evidenceTime(e.offsetMs)}</b> · {line ? `Worker: “${line.text}”` : "Worker evidence unavailable in this session."}</div>;
              })}
              <div className="acts">
                {correcting === i.signId ? (
                  <form
                    className="correct-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveCorrection(i);
                    }}
                  >
                    <select className="field" value={cKind} onChange={(e) => setCKind(e.target.value as LessonKind)}>
                      <option value="not-a-sign">This wasn't a sign</option>
                      <option value="missed-sign">It missed something</option>
                      <option value="wording">Change the wording</option>
                    </select>
                    <input className="field" autoFocus placeholder="Tell the engine what to do differently" value={cText} onChange={(e) => setCText(e.target.value)} />
                    <button className="btn gold sm" type="submit">
                      Save lesson
                    </button>
                    <button className="btn ghost sm" type="button" onClick={() => setCorrecting(null)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button className="btn ghost sm" onClick={() => setCorrecting(i.signId)}>
                    Correct this sign
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {report.missedByAI.map((m, k) => (
          <div className="verdict" key={"ai" + k}>
            <span className="v">unflagged</span>
            <div>
              <div className="t">{m}</div>
              <div className="n">The engine did not raise this. Add it as a lesson so it does next time.</div>
              <div className="acts">
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    actions.addLesson({ kind: "missed-sign", text: m });
                    play("handled");
                    say("Saved as a lesson.");
                  }}
                >
                  Save as lesson
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeadlineTrack report={report} />

      {report.tip ? (
        <div className="tip-box">
          <div className="label">One thing for next time</div>
          {report.tip}
        </div>
      ) : report.degraded ? (
        // Hiding the box is right when there is simply no tip. When the write-up
        // failed, silence reads as the coach having nothing to say about the
        // call — which is the wrong thing to read during a quota outage. Name it.
        <div className="tip-box">
          <div className="label">One thing for next time</div>
          {report.degradedReason === "quota"
            ? "Not available: the AI service returned a quota or rate-limit error. The records above were kept by the call itself."
            : "Not available: the AI could not be reached. The records above were kept by the call itself."}
        </div>
      ) : null}
      <div className="actions">
        <button className="btn gold" onClick={onNew}>
          New call
        </button>
        <button className="btn" onClick={() => void buildScenario()} disabled={building || Boolean(draft)}>
          {building ? "Building…" : "Turn this into a practice customer"}
        </button>
        <button className="btn ghost" onClick={() => void copy()}>
          Copy report
        </button>
        {buildErr && <span className="warn">{buildErr}</span>}
      </div>

      {draft && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="label">Practice customer · built from this call · names and numbers changed</div>
          <h2 style={{ margin: "6px 0 4px" }}>
            {draft.name}, {draft.age} · {draft.job} · {draft.product}
          </h2>
          <div className="small muted" style={{ marginBottom: 8 }}>
            {levelLabel(draft.level)} · tests: {draft.expectedSigns.join(", ") || "—"}
          </div>
          <p style={{ margin: "0 0 8px" }}>{draft.situation}</p>
          <p className="muted" style={{ margin: "0 0 8px" }}>
            Hidden: {draft.hiddenProblem}
          </p>
          <p style={{ margin: "0 0 12px", fontFamily: "var(--serif)", fontSize: 17 }}>“{draft.firstMessage}”</p>
          <p className="small muted" style={{ margin: "0 0 12px" }}>
            Why this one: {draft.whyThisOne}
          </p>
          {store.scenarios.some((s) => s.id === draft.id) ? (
            <div className="actions" style={{ marginTop: 0 }}>
              <span className="badge">approved</span>
              <button className="btn gold" onClick={() => onPractice({ ...draft, approved: true })}>
                Practise it now
              </button>
            </div>
          ) : (
            <div className="actions" style={{ marginTop: 0 }}>
              <button className="btn gold" onClick={approve}>
                Approve and add to Practice
              </button>
              <button className="btn ghost" onClick={() => setDraft(null)}>
                Discard
              </button>
              <span className="hint">A person approves every practice customer before anyone can use it.</span>
            </div>
          )}
        </div>
      )}

      <Toast text={toast} />
    </div>
  );
}
