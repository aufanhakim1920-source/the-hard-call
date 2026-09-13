import { hasVerifiedReportScore } from "../lib/reportScore";
import { useEffect, useState, type ReactNode } from "react";
import { postScenario } from "../lib/api";
import { fmtDate, fmtWhen, parseISO } from "../lib/dates";
import { levelLabel, pickVoice, scenarioDetail, scenarioEcho, scenarioFailure, scenarioFault } from "../lib/scenarios";
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
import { daysBetween, ledger } from "./report-math";
import "./report-visuals.css";
import "./report-lead.css";
import "./report-rows.css";
import "./scenario-draft.css";

/**
 * How the call ran, and how the card was built — said once, above every number.
 *
 * A silent call and a coached one produce an identical card, so without this
 * line a low score reads as a worker ignoring prompts rather than as the
 * measurement of the gap it actually is. The whole demo argument is the same
 * call run twice, side by side; the cards have to be tellable apart.
 *
 * ⚠ `coaching === false`, never `!coaching`. Absent means the mode was never
 * recorded — an older card, or one pulled from a table with no column for it —
 * and "not recorded" is not "the assistant was off". Absent says nothing.
 */
function RunNote({ report }: { report: Report }) {
  const silent = report.coaching === false;
  const coached = report.coaching === true;
  if (!silent && !coached && !report.degraded) return null;
  return (
    <div className="rv-run">
      {silent && (
        <p className="rv-run-line key">
          The assistant ran silent on this call: it listened, judged and started the clocks, but said nothing while
          you were on the phone. A low number here measures what a call misses without it.
        </p>
      )}
      {coached && <p className="rv-run-line">The assistant coached this call — every sign appeared the moment it was raised.</p>}
      {report.degraded && (
        <p className="rv-run-line key">
          No write-up was produced:{" "}
          {report.degradedReason === "quota" ? "the free daily limit on the model was reached" : "the model could not be reached"}.
          Everything below was recorded during the call itself, and no score is given.
        </p>
      )}
    </div>
  );
}

const COUNTS = ["none", "One", "Two", "Three", "Four", "Five", "Six"];

/**
 * What the call cost, said before what the call was made of.
 *
 * The pitch is the same call twice, side by side, and the two cards used to
 * differ in the first second by one digit: "0 of 3" against "4 of 4". Both led
 * with the customer's name — identical on both — and the word carrying the
 * legal consequence was a 10px grey chart key.
 *
 * This is the miss count at display size, in the state colour, with the
 * statutory clock named in words. It does not repeat the ledger below it: that
 * one is the composition of the call, this one is the consequence.
 *
 * Everything here is counted off the items and the calendar. A verdict the
 * transcript could not support is NEVER folded into "missed" — on a card where
 * nothing could be checked this renders nothing at all, because a confident
 * "0 missed" on an unjudged call is a claim the call cannot support.
 */
function hasVerdict(report: Report): boolean {
  const l = ledger(report.items);
  return l.total > 0 && l.unknown !== l.total;
}

function Verdict({ report, aside }: { report: Report; aside?: ReactNode }) {
  const l = ledger(report.items);
  if (!hasVerdict(report)) return null;

  const legal = report.items.filter((i) => i.kind === "legal");
  const legalMissed = legal.filter((i) => i.verdict === "missed");
  // The clock belongs to the sign, so it is looked up by the sign's own key
  // rather than by position — a call can carry two obligations and only one
  // of them be the missed one.
  const clock =
    report.deadlines.find((d) => legalMissed.some((i) => i.key === d.key)) ??
    report.deadlines.find((d) => legal.some((i) => i.key === d.key));
  const days = clock ? daysBetween(report.at, parseISO(clock.date).getTime()) : 0;
  const clause = clock
    ? ` a reply is due ${fmtDate(clock.date)}, ${days} ${days === 1 ? "day" : "days"} from this call`
    : "";
  const many = (n: number) => COUNTS[n] ?? String(n);

  if (l.missed > 0) {
    return (
      <div className="rc-verdict">
        <span className="rc-v-fig" aria-hidden="true">
          <b>{l.missed}</b>
          <i>missed</i>
        </span>
        {aside && <div className="rc-v-aside">{aside}</div>}
        <p className="rc-v-say">
          {l.missed === l.total
            ? `Not one of the ${l.total} signs raised on this call was answered.`
            : `${l.missed} of the ${l.total} signs raised on this call ${l.missed === 1 ? "was" : "were"} never answered.`}{" "}
          {legalMissed.length > 0 ? (
            <>
              <b>
                {many(legalMissed.length)} {legalMissed.length === 1 ? "is a legal obligation" : "are legal obligations"}
              </b>
              {clause ? <>{" —"}{clause}, and the worker never addressed it.</> : ", and the worker never addressed it."}
            </>
          ) : (
            "None of them started a legal clock."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rc-verdict clean">
      <span className="rc-v-fig" aria-hidden="true">
        <b>0</b>
        <i>missed</i>
      </span>
      {aside && <div className="rc-v-aside">{aside}</div>}
      <p className="rc-v-say">
        {l.unknown > 0
          ? `Nothing was missed on this call. ${many(l.unknown)} of the ${l.total} judgements could not be checked against the transcript, so ${l.unknown === 1 ? "it is" : "they are"} counted neither way.`
          : `All ${l.total} signs raised on this call were answered while it was still live.`}{" "}
        {legal.length > 0 && (
          <>
            <b>{legal.length === 1 ? "The legal one was answered too" : `All ${legal.length} legal ones were answered too`}</b>
            {clause ? (
              <>
                {" —"}
                {clause}.
              </>
            ) : (
              "."
            )}
          </>
        )}
      </p>
    </div>
  );
}

function evidenceTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * `session` is optional, and its absence is the normal case for any card older
 * than the call that produced it.
 *
 * The transcript is deliberately never stored — that is the privacy promise, not
 * an oversight — so a card reopened from the call list has its verdicts, its
 * ledger, its deadlines and its tip, and cannot have the timeline, the answer
 * times or the worker's quoted words. Those three are dropped rather than drawn
 * empty, and the card says why once, in plain words.
 */
export function ReportCard({
  report,
  session,
  onNew,
  onPractice,
  onCompare,
}: {
  report: Report;
  session?: Session;
  onNew: () => void;
  onPractice?: (s: Scenario) => void;
  /** Leaving this screen used to lose it. The card is now one click from the
      call list, which holds every earlier card and the compare board. */
  onCompare?: () => void;
}) {
  const store = useStore();
  // The worker's own earlier calls in this mode — the only honest benchmark for
  // a number out of 100. Newest first, as the store keeps them.
  const previous = store.reports.filter((r) => r.mode === report.mode && r.callId !== report.callId);
  const phone = useMedia(PHONE);
  // The ring only moves into the lead when there IS a lead to move it into.
  const ringInLead = phone && hasVerdict(report);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [cKind, setCKind] = useState<LessonKind>("not-a-sign");
  const [cText, setCText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildSec, setBuildSec] = useState(0);
  const [draft, setDraft] = useState<Scenario | null>(null);
  const [buildErr, setBuildErr] = useState<{ say: string; raw?: string } | null>(null);
  // Discarding is a one-way door, so it asks first. Same arm-then-confirm the
  // Deadlines tab and the About sheet already use; not a third mechanism.
  const [discardArmed, setDiscardArmed] = useState(false);

  // A call with nothing said in it cannot produce a customer: the server
  // answers 400 "empty session", and every retry answers it again. The control
  // says so instead of offering a road that ends in a wall.
  const hasLines = Boolean(session && session.lines.length > 0);
  // Only ever a repeat of a customer already approved — the draft is not in the
  // store yet, so there is nothing here to match itself against.
  const echo = draft ? scenarioEcho(draft, store.scenarios) : null;

  // A model call of several seconds behind a disabled button reads as a dead
  // screen, and this one is the third act of the pitch. Count the seconds out
  // loud so the wait is visibly a wait rather than a hang.
  useEffect(() => {
    if (!building) return;
    const t = window.setInterval(() => setBuildSec((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [building]);

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2200);
  };

  const saveCorrection = (item: ReportItem) => {
    if (!cText.trim()) return;
    // Without the session there is no quote to attach. The lesson is still worth
    // keeping — it is the worker's correction, not the example — so it saves
    // with no evidence rather than not saving.
    const sign = session?.signs.find((g) => g.id === item.signId);
    actions.addLesson({ kind: cKind, text: cText.trim(), signKey: item.key, evidence: sign?.evidence });
    setCorrecting(null);
    setCText("");
    play("handled");
    say("Saved. The engine will use this on every call from now on.");
  };

  const buildScenario = async () => {
    if (!session) return;
    setBuilding(true);
    setBuildSec(0);
    setBuildErr(null);
    // A newly built customer must never arrive with the previous one's discard
    // question already open under it.
    setDiscardArmed(false);
    try {
      const s = await postScenario(session, report);
      const fault = scenarioFault(s);
      if (fault) {
        // Never draw a half-invented customer. Blank fields on a person's card
        // read as a real caller with nothing to say, and `expectedSigns` coming
        // back undefined took the whole screen down.
        setBuildErr({ say: `No practice customer was built. ${fault}`, raw: JSON.stringify(s) });
        return;
      }
      // Salted with the customer's own id, not the call's. The call id is one
      // value, so two customers built from the same call were handed the same
      // voice as well as the same story — the repetition compounding itself.
      const id = uid("sc");
      setDraft({
        id,
        name: s.name,
        age: s.age,
        voice: s.voice,
        voiceId: pickVoice(s.voice, s.age, id).id,
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
      const raw = e instanceof Error ? e.message : String(e);
      setBuildErr({ say: scenarioFailure(raw), raw });
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
      `The Hard Call — report card, ${fmtWhen(report.at)}`,
      `${report.customer} · ${report.mode} · score ${!hasVerifiedReportScore(report) ? "not verified" : report.score}`,
      // A pasted card is read without the screen, so the mode has to travel
      // with it. Absent is left out rather than guessed.
      ...(report.coaching === false
        ? ["The assistant ran silent on this call — nothing was shown or announced during it."]
        : report.coaching === true
          ? ["The assistant coached this call."]
          : []),
      ...(report.degraded
        ? [`No write-up: ${report.degradedReason === "quota" ? "the model's daily limit was reached" : "the model could not be reached"}.`]
        : [report.summary]),
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
            than leading with nothing — and on a phone it moves down beside the
            miss count, so the demoted reading stops being the first one. It
            stays here when there is no verdict to sit beside. */}
        {(!phone || !ringInLead) && <ScoreRing score={report.score} unverified={!hasVerifiedReportScore(report)} size={phone ? 92 : 100} />}
      </div>

      {/* The consequence first, then why the call ran the way it did, then the
          composition. Reading order is importance order. */}
      <Verdict
        report={report}
        aside={ringInLead ? <ScoreRing score={report.score} unverified={!hasVerifiedReportScore(report)} size={92} /> : null}
      />

      <RunNote report={report} />

      <ReportLedger report={report} previous={previous} />

      {session ? (
        <>
          <ResponseTimes session={session} report={report} />
          <CallTimeline session={session} report={report} />
        </>
      ) : (
        <p className="rv-empty">
          The call itself was never stored — no transcript leaves this browser — so the timeline and the answer times
          exist only on the card that follows a call. The verdicts, the clocks and the tip are kept.
        </p>
      )}

      {/* A degraded card's "summary" is not a write-up — it is the outage
          notice, which the run note now carries at the top. Printing it again
          here, in serif at 19px and below three charts, said the same thing
          twice and said it late. */}
      {!report.degraded && <p className="summary">{report.summary}</p>}
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
              {/* With the call gone, every row would repeat the same sentence
                  once per timestamp. The times are the part that survived, so
                  they go on one line and the explanation is said once. */}
              {!session && i.evidence && i.evidence.length > 0 && (
                <div className="n">
                  {i.evidence.map((e, k) => (
                    <span key={e.lineId}>
                      {k > 0 && ", "}
                      <b className="mono">{evidenceTime(e.offsetMs)}</b>
                    </span>
                  ))}{" "}
                  · where the worker answered. The words themselves were never stored.
                </div>
              )}
              {session &&
                i.evidence?.map((e) => {
                  const line = session.lines.find((l) => l.id === e.lineId && l.speaker === "worker");
                  return (
                    <div className="n" key={e.lineId}>
                      <b className="mono">{evidenceTime(e.offsetMs)}</b> ·{" "}
                      {line ? `Worker: “${line.text}”` : "Worker evidence unavailable in this session."}
                    </div>
                  );
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
        {/* Building a practice customer reads the call, so it exists only while
            the call still does. A dead button would be worse than no button. */}
        {session && (
          <button
            className="btn"
            onClick={() => void buildScenario()}
            disabled={building || Boolean(draft) || !hasLines}
            aria-describedby={hasLines ? undefined : "no-lines-why"}
          >
            {building ? `Building… ${buildSec}s` : draft ? "Built — it is below" : "Turn this into a practice customer"}
          </button>
        )}
        {session && !hasLines && (
          <span className="hint" id="no-lines-why">
            Nothing was said on this call, so there is nothing to build a customer from.
          </span>
        )}
        {onCompare && (
          <button className="btn" onClick={onCompare}>
            Compare with another call
          </button>
        )}
        <button className="btn ghost" onClick={() => void copy()}>
          Copy report
        </button>
      </div>

      {/* The wait and the failure both used to be nothing: a button that said
          "Building…" for several seconds, and a 12px line of the server's own
          error text at the end of a row of buttons. Both get a panel under the
          control that started them — the space is made first and the words
          arrive in it, the same open the rest of the build uses. */}
      {building && (
        <div className="rv-build" role="status">
          <div className="rv-build-bar">
            <i />
          </div>
          <p className="rv-build-say">
            Reading this call and inventing a customer who tests the same thing — new name, new job, new numbers.
          </p>
          <p className="rv-build-sec">{buildSec}s elapsed · usually 5–15</p>
        </div>
      )}

      {buildErr && (
        <div className="rv-build failed" role="alert">
          <p className="rv-build-say">{buildErr.say}</p>
          {/* Kept, because a failure nobody can diagnose is its own problem —
              but folded away, scrubbed of anything that identifies an account,
              and capped. It used to be the whole JSON body of a Gemini 503,
              printed at full length under the one sentence that mattered. */}
          {scenarioDetail(buildErr.raw) && (
            <details className="rv-raw">
              <summary>What the server said</summary>
              <p className="rv-build-raw">{scenarioDetail(buildErr.raw)}</p>
            </details>
          )}
          <div className="rv-build-acts">
            {/* Retrying an empty call only reaches the same refusal. */}
            {hasLines && (
              <button className="btn sm" onClick={() => void buildScenario()}>
                Try again
              </button>
            )}
            <button className="btn ghost sm" onClick={() => setBuildErr(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

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
          {/* The privacy claim was a six-word label above the name, which asks a
              room to take the whole de-identification story on faith. Say what
              was actually done, on the card, next to the invented person. */}
          <div className="rv-fiction">
            <p>
              <strong>This person does not exist.</strong> The call was read once to build them and was never stored. The model was told to invent a
              new name and a new job, and to change the age, the suburb and every number — only the shape of the situation is kept.
            </p>
            <p>Nothing below is saved anywhere until you approve it, and only the invented customer is saved — never the real call.</p>
          </div>
          {/* The model repeats itself from one call, and a repeat presented as
              a fresh invention is the claim breaking in front of whoever is
              watching. Say it before the approve button, not after. */}
          {echo && (
            <div className="rv-build rv-echo" role="status">
              <p className="rv-build-say">
                Practice already has this person: <b>{echo.name}</b>, {echo.job}. The generator runs warm and repeats itself
                from the same call — build another and you will usually get someone different.
              </p>
              <div className="rv-build-acts">
                <button
                  className="btn sm"
                  onClick={() => {
                    setDraft(null);
                    void buildScenario();
                  }}
                >
                  Build a different one
                </button>
              </div>
            </div>
          )}
          {store.scenarios.some((s) => s.id === draft.id) ? (
            <div className="actions" style={{ marginTop: 0 }}>
              <span className="badge">approved by you</span>
              {onPractice && (
                <button className="btn gold" onClick={() => onPractice({ ...draft, approved: true })}>
                  Practise it now
                </button>
              )}
            </div>
          ) : (
            <div className={"scen-discard" + (discardArmed ? " armed" : "")}>
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="btn gold" onClick={approve}>
                  Approve and add to Practice
                </button>
                <button
                  className="btn ghost"
                  aria-expanded={discardArmed}
                  onClick={() => {
                    setDiscardArmed(!discardArmed);
                    play("tap");
                  }}
                >
                  {discardArmed ? "Keep it" : "Discard"}
                </button>
                <span className="hint">A person approves every practice customer before anyone can use it.</span>
              </div>
              <div className="clear-ask" aria-hidden={!discardArmed}>
                <div>
                  <p className="clear-say">
                    Discarding takes this customer off the screen for good. Nothing is written down, there is no undo, and the
                    model call that wrote them has already been spent — building another one costs a fresh call.
                  </p>
                  <button
                    className="btn danger sm"
                    tabIndex={discardArmed ? undefined : -1}
                    onClick={() => {
                      setDraft(null);
                      play("undo");
                      say("Discarded. Nothing was saved.");
                    }}
                  >
                    Discard this customer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Toast text={toast} />
    </div>
  );
}
