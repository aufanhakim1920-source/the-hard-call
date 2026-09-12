import { useCallback, useEffect, useRef, useState } from "react";
import { useA11y } from "../lib/a11y";
import { fmtClock } from "../lib/dates";
import { DEMO_SCRIPT } from "../lib/demoScript";
import { useCallEngine } from "../lib/engine";
import { usePractice } from "../lib/practice";
import { play } from "../lib/sfx";
import { useSpeech } from "../lib/speech";
import type { AssistantState, Customer, Mode, Report, Scenario, Session, Speaker } from "../lib/types";
import { levelLabel } from "../lib/scenarios";
import { PHONE, useMedia } from "../lib/useMedia";
import { Select } from "./Select";
import { Sheet, type Detent } from "./Sheet";
import { SignStack } from "./SignStack";
import { Transcript } from "./Transcript";

const DIRECTION_OPTIONS = [
  { value: "outbound", label: "Bank rang them" },
  { value: "inbound", label: "They rang the bank" },
];

const SPEAKER_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "worker", label: "Worker" },
];

export interface CallProps {
  mode: Mode;
  customer: Customer;
  scenario?: Scenario;
  onEnd: (report: Report, session: Session) => void;
  onDemo?: () => void;
  onAssistant: (s: AssistantState) => void;
}

export function CallScreen({ mode, customer: initialCustomer, scenario, onEnd, onDemo, onAssistant }: CallProps) {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const engine = useCallEngine({
    mode,
    customer,
    scenarioId: scenario?.id,
    scenarioExpected: scenario?.expectedSigns,
  });
  const { session, interim, setInterim, assistant, addLine, markHandled, endCall, elapsed, newestOpen } = engine;
  useEffect(() => onAssistant(assistant), [assistant, onAssistant]);

  const speech = useSpeech({
    onFinal: (t) => addLine(t, "unknown"),
    onInterim: setInterim,
  });
  const practice = usePractice({ onLine: (sp, t) => addLine(t, sp) });

  const [typed, setTyped] = useState("");
  const [typedAs, setTypedAs] = useState<Speaker>("customer");
  const [ending, setEnding] = useState(false);
  const [endErr, setEndErr] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string>();
  const [demoDone, setDemoDone] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const phone = useMedia(PHONE);
  const [detent, setDetent] = useState<Detent>("peek");
  // Live, not the session's start value: flipping the switch mid-call takes
  // effect on the next line. The report card keeps the start value.
  const coaching = useA11y().coaching;
  const signCount = session.signs.length;
  const newestSign = signCount ? session.signs[signCount - 1] : undefined;
  const openCount = session.signs.filter((g) => !g.handled).length;
  // On a phone, a legal sign lifts the sheet by itself; tips wait in the peek.
  // With coaching off it must not — a sheet rising on its own is the loudest
  // prompt on the screen.
  useEffect(() => {
    if (!phone || !newestSign || !coaching) return;
    if (newestSign.kind === "legal") {
      setDetent("full");
      try {
        navigator.vibrate?.(40);
      } catch {
        /* no haptics here */
      }
    }
  }, [phone, newestSign, signCount, coaching]);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const typeRef = useRef<HTMLInputElement>(null);

  // Demo mode: the script plays through the real engine.
  useEffect(() => {
    if (mode !== "demo") return;
    let cancelled = false;
    const timers: number[] = [];
    let at = 600;
    DEMO_SCRIPT.forEach((l, i) => {
      at += (l.gap * 1000) / speedRef.current;
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          addLine(l.text, l.speaker);
          if (i === DEMO_SCRIPT.length - 1) setDemoDone(true);
        }, at),
      );
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const jump = useCallback(
    (lineId: string) => {
      if (phone) setDetent("peek");
      const el = document.getElementById("line-" + lineId);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      setFlashId(lineId);
      window.setTimeout(() => setFlashId(undefined), 1200);
    },
    [phone],
  );

  const finish = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    setEndErr(null);
    play("tap");
    if (speech.listening) speech.stop();
    if (practice.status === "connected" || practice.status === "connecting") await practice.stop();
    try {
      const report = await endCall();
      onEnd(report, { ...session, endedAt: Date.now() });
    } catch (e) {
      setEndErr(e instanceof Error ? e.message : String(e));
      setEnding(false);
    }
  }, [ending, speech, practice, endCall, onEnd, session]);

  // keyboard: H = handle newest, E = end, T = type
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
      // H marks the newest sign handled — with nothing on screen there is
      // nothing to mark, and a silent keystroke that changes hidden state is
      // worse than a key that does nothing.
      if (e.key === "h" || e.key === "H") {
        if (newestOpen && coaching) markHandled(newestOpen.id, true);
      } else if (e.key === "e" || e.key === "E") {
        if (session.lines.length) void finish();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        typeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newestOpen, markHandled, finish, session.lines.length, coaching]);

  const submitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    addLine(typed, typedAs);
    setTyped("");
    setTypedAs((s) => (s === "customer" ? "worker" : "customer"));
    play("tap");
  };

  const started = session.lines.length > 0;
  const canEdit = !started && mode === "live";

  return (
    <div className={"call" + (phone ? " phone" : "")}>
      <header className="call-head">
        {canEdit ? (
          <div className="setup">
            <span className="label">Call with</span>
            <input className="field" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} aria-label="Customer name" />
            <input className="field" value={customer.product} onChange={(e) => setCustomer({ ...customer, product: e.target.value })} aria-label="Product" />
            <Select value={customer.direction} onChange={(v) => setCustomer({ ...customer, direction: v as Customer["direction"] })} options={DIRECTION_OPTIONS} label="Direction" />
          </div>
        ) : (
          <div className="who">
            <span className={"chip " + (mode === "practice" ? "gold" : mode === "demo" ? "" : "live")}>
              {mode === "practice" ? "practice" : mode === "demo" ? "demo replay" : "live"}
            </span>
            <h1>{customer.name}</h1>
            <span className="sub">
              {customer.product} · {customer.direction === "outbound" ? "bank rang them" : "they rang the bank"}
              {scenario ? ` · ${levelLabel(scenario.level)}` : ""}
            </span>
          </div>
        )}
        <div className="spacer" />
        {mode === "live" && (
          <div className={"meter" + (speech.listening ? " on" : "")} aria-hidden="true">
            {[0.5, 0.8, 1, 0.7, 0.45].map((k, i) => (
              <i key={i} style={{ transform: `scaleY(${Math.max(0.12, Math.min(1, speech.level * k * 1.6))})` }} />
            ))}
          </div>
        )}
        <div className="clock" aria-label="Call length">
          {fmtClock(elapsed)}
        </div>
        <button className="btn gold" onClick={() => void finish()} disabled={!started || ending}>
          {ending ? "Writing report…" : "End call"} {!ending && <kbd>E</kbd>}
        </button>
      </header>

      {mode === "practice" && scenario && (
        <div className="practice-strip">
          <div className={"orb " + practice.mode} style={{ ["--v" as string]: 0.3 + practice.volume * 0.9 }} aria-hidden="true" />
          <div className="txt">
            <b>
              {practice.status === "idle" && "Ready when you are."}
              {practice.status === "connecting" && "Dialling…"}
              {practice.status === "connected" && (practice.mode === "speaking" ? `${scenario.name.split(" ")[0]} is talking` : "Your turn")}
              {practice.status === "ended" && "Call ended."}
              {practice.status === "error" && "Couldn't connect."}
            </b>
            <span>
              {practice.status === "idle" && `${scenario.name}, ${scenario.age}, ${scenario.job}. The real problem is hidden — ask well.`}
              {practice.status === "connected" &&
                (coaching ? "Talk like it's a real call. The signs on the right are live." : "Talk like it's a real call. Nothing will prompt you — the report comes at the end.")}
              {practice.status === "error" && (practice.error ?? "")}
              {practice.status === "ended" && "End the call to see your report card."}
            </span>
          </div>
          <div className="spacer" />
          {practice.status === "idle" || practice.status === "error" ? (
            <button className="btn gold" onClick={() => void practice.start(scenario)} disabled={!practice.configured}>
              {practice.configured ? "Start practice call" : "Practice voice not configured"}
            </button>
          ) : practice.status === "connected" || practice.status === "connecting" ? (
            <button className="btn" onClick={() => void practice.stop()}>
              Hang up
            </button>
          ) : null}
        </div>
      )}

      <div className="call-body">
        <section className="words">
          <div className="words-head">
            <span className="label">Live words</span>
            <span className="small muted">
              {mode === "live" && (speech.listening ? "listening" : "microphone off")}
              {mode === "demo" && (demoDone ? "script finished — end the call for the report card" : "playing the demo script through the real engine")}
              {mode === "practice" && (practice.status === "connected" ? "both sides transcribed live" : "")}
            </span>
          </div>
          <Transcript
            lines={session.lines}
            /* The transcript underlines the words a sign was raised on. That is
               the same prompt in a quieter place, so it goes too. */
            signs={coaching ? session.signs : []}
            interim={interim}
            startedAt={session.startedAt}
            mode={mode}
            flashId={flashId}
            emptyHint={
              mode === "live" ? (
                <>
                  <b>Put the call on speaker and press Listen.</b>
                  The words appear here as they are said. Or type what the customer says. Nothing is stored — only the signs.
                </>
              ) : mode === "practice" ? (
                <>
                  <b>Start the practice call above.</b>
                  {scenario?.whyThisOne}
                </>
              ) : (
                <>
                  <b>Rolling…</b>Tom from the bank is ringing Sarah about a missed payment.
                </>
              )
            }
          />
          <div className="inputs">
            {mode === "live" && (
              <>
                {/* A control that cannot work must be disabled and must SAY why.
                    It used to stay enabled and hide the reason in a title
                    tooltip, which never appears on a phone and never reaches a
                    screen reader as an explanation. */}
                <button
                  className={"btn" + (speech.listening ? " listening" : "")}
                  onClick={() => (speech.listening ? speech.stop() : speech.start())}
                  disabled={!speech.supported}
                >
                  <span className="rec-dot" />
                  {speech.listening ? "Listening" : "Listen"}
                </button>
                {!speech.supported && <span className="hint">This browser has no speech engine. Type what was said instead, or use Chrome or Edge.</span>}
                <form className="type" onSubmit={submitTyped}>
                  <Select value={typedAs} onChange={(v) => setTypedAs(v as Speaker)} options={SPEAKER_OPTIONS} label="Who said it" />
                  <input ref={typeRef} className="field" placeholder="Or type what was said and press Enter" value={typed} onChange={(e) => setTyped(e.target.value)} />
                </form>
                {onDemo && !started && (
                  <button className="btn ghost" onClick={onDemo}>
                    ▶ Replay the demo call
                  </button>
                )}
                {speech.error && <span className="warn">{speech.error}</span>}
              </>
            )}
            {mode === "demo" && (
              <>
                {/* One choice of two, so say so. It was two plain buttons with
                    the state carried by the gold fill alone — invisible to a
                    screen reader, and meaning in colour only. */}
                <div className="speed" role="radiogroup" aria-label="Replay speed">
                  <span className="hint" aria-hidden="true">
                    Speed
                  </span>
                  {([1, 2] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={speed === n}
                      aria-label={`${n} times speed`}
                      className={"btn sm" + (speed === n ? " gold" : "")}
                      onClick={() => setSpeed(n)}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
                <span className="hint">Line 7 is the deliberate miss — watch the report card.</span>
              </>
            )}
            {mode === "practice" && (
              <span className="hint">
                Say what you would really say.{" "}
                {coaching ? (
                  <>
                    <kbd>H</kbd> marks the newest sign handled ·{" "}
                  </>
                ) : null}
                <kbd>E</kbd> ends the call
              </span>
            )}
            {endErr && <span className="warn">Report failed: {endErr}</span>}
          </div>
        </section>
        {!phone && (
          <SignStack signs={session.signs} startedAt={session.startedAt} onHandled={markHandled} onJump={jump} newestOpenId={newestOpen?.id} coaching={coaching} />
        )}
      </div>

      {phone && (
        <Sheet
          detent={detent}
          onDetent={setDetent}
          head={
            coaching ? (
              <>
                <span className={"sheet-count" + (openCount ? " on" : "")}>{signCount}</span>
                <span className="sheet-title">
                  {newestSign ? (
                    <>
                      <b>{newestSign.title}</b>
                      <span className="small muted"> · {openCount} open</span>
                    </>
                  ) : (
                    <span className="muted">No signs yet</span>
                  )}
                </span>
                <span className="sheet-hint small muted">{detent === "full" ? "drag down" : "drag up"}</span>
              </>
            ) : (
              // No count, no title: the handle would otherwise tick upward and
              // say exactly what this mode is meant not to say.
              <>
                <span className="sheet-count silent" aria-hidden="true">
                  —
                </span>
                <span className="sheet-title muted">Coaching off · report at the end</span>
                <span className="sheet-hint small muted">{detent === "full" ? "drag down" : "drag up"}</span>
              </>
            )
          }
        >
          <SignStack
            signs={session.signs}
            startedAt={session.startedAt}
            onHandled={markHandled}
            onJump={jump}
            newestOpenId={newestOpen?.id}
            coaching={coaching}
            compact
          />
        </Sheet>
      )}

      <footer className="privacy-line">
        <span>Only signs are kept. Words are never stored.</span>
        <span>Card and account numbers are masked before they leave this browser.</span>
        <span className="spacer" />
        <span className="hint">
          {coaching && (
            <>
              <kbd>H</kbd> handle newest ·{" "}
            </>
          )}
          <kbd>E</kbd> end call · <kbd>T</kbd> type
        </span>
      </footer>
    </div>
  );
}
