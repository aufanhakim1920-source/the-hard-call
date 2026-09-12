import { hasVerifiedReportScore } from "../lib/reportScore";
import { useState } from "react";
import { postScenario } from "../lib/api";
import { fmtDate, fmtWhen } from "../lib/dates";
import { levelLabel, pickVoice } from "../lib/scenarios";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import type { LessonKind, Report, ReportItem, Scenario, Session } from "../lib/types";
import { uid } from "../lib/types";
import { useCountUp } from "../lib/useCountUp";
import { CallTimeline } from "./CallTimeline";
import { ScoreRing } from "./ScoreRing";
import { SignBars } from "./SignBars";

function evidenceTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Delta({ now, prev, invert }: { now: number; prev?: number; invert?: boolean }) {
  if (prev === undefined) return <div className="delta">first call in this mode</div>;
  const d = now - prev;
  if (d === 0) return <div className="delta">same as your last call</div>;
  const good = invert ? d < 0 : d > 0;
  return (
    <div className={"delta " + (good ? "up" : "down")}>
      {d > 0 ? "+" : ""}
      {d} vs your last call
    </div>
  );
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
  const prev = store.reports.filter((r) => r.mode === report.mode && r.callId !== report.callId)[0];
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [cKind, setCKind] = useState<LessonKind>("not-a-sign");
  const [cText, setCText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [draft, setDraft] = useState<Scenario | null>(null);
  const [buildErr, setBuildErr] = useState<string | null>(null);

  const nCaught = useCountUp(report.caught, 600, 80);
  const nHandled = useCountUp(report.handled, 600, 160);
  const nMissed = useCountUp(report.missed, 600, 240);

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
      `Tip: ${report.tip}`,
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
          <span className="muted small">
            {fmtWhen(report.at)} · {Math.round(report.durationSec / 60)} min {report.durationSec % 60} s · judged by {report.model}
          </span>
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        <ScoreRing score={report.score} unverified={!hasVerifiedReportScore(report)} />
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Signs caught</div>
          <b>{nCaught}</b>
          <Delta now={report.caught} prev={prev?.caught} />
        </div>
        <div className="stat">
          <div className="label">Handled</div>
          <b>{nHandled}</b>
          <Delta now={report.handled} prev={prev?.handled} />
        </div>
        <div className="stat">
          <div className="label">Missed</div>
          <b>{nMissed}</b>
          <Delta now={report.missed} prev={prev?.missed} invert />
        </div>
      </div>

      <CallTimeline session={session} report={report} />

      <p className="summary">{report.summary}</p>
      {!!report.unverified && <p className="muted small">{report.unverified} item(s) could not be verified from the transcript. These are not counted as missed.</p>}

      <SignBars items={report.items} />

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

      {report.deadlines.length > 0 && (
        <div className="tip-box">
          <div className="label">On the clock</div>
          {report.deadlines.map((d) => (
            <div key={d.key}>
              {d.label} <b className="mono">{fmtDate(d.date)}</b> — {d.title}. Added to Deadlines.
            </div>
          ))}
        </div>
      )}

      <div className="tip-box">
        <div className="label">One thing for next time</div>
        {report.tip}
      </div>

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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
