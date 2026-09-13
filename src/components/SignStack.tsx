import { useMemo } from "react";
import { fmtClock, fmtDate } from "../lib/dates";
import { useFlip } from "../lib/motion";
import type { Sign } from "../lib/types";
import "./sign-card.css";

/**
 * The mark at the head of a card, and the only place the two kinds are told
 * apart by SHAPE rather than by the card's colour.
 *
 * A filled triangle and an outlined triangle are the same silhouette, so at a
 * glance — which is the only glance this gets — the two kinds read as one
 * thing in two colours. A legal sign is a hazard; a tip is a note. They get
 * different outlines: a solid triangle with a bang, and an "i" in a ring.
 */
function Icon({ kind, done }: { kind: Sign["kind"]; done?: boolean }) {
  if (done) {
    return (
      <svg className="mark-done" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12.5 L9.5 18 L20 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return kind === "legal" ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 L22 20 H2 Z" fill="currentColor" />
      {/* The bang is the card's own ground, painted back over the triangle —
          --gold is the one token that does not invert, so this reads the same
          on both themes. Set in CSS, never as a literal in the markup. */}
      <rect className="knock" x="11.1" y="9" width="1.8" height="6" rx="0.9" />
      <circle className="knock" cx="12" cy="17" r="1.1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="7.9" r="1.15" fill="currentColor" />
      <rect x="11.1" y="10.6" width="1.8" height="6.4" rx="0.9" fill="currentColor" />
    </svg>
  );
}

/**
 * What stands where the signs would be when coaching is off.
 *
 * An empty column reads as broken, so this says the quiet part: the assistant
 * is working, it is just not interrupting. The glyph is the sign's own
 * triangle, struck through and dimmed — the shape that is being withheld,
 * rather than a blank rectangle standing in for it.
 */
function SilentNote() {
  return (
    <div className="empty silent-note">
      <svg className="silent-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 L22 20 H2 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M4 21 L20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <b>Coaching is off for this call.</b>
      The assistant is still listening and still judging every line. Nothing appears here while you are on the phone — the whole
      report card arrives the moment you end the call.
      <span className="silent-where">Settings → The assistant, to turn it back on.</span>
    </div>
  );
}

export function SignStack({
  signs,
  startedAt,
  onHandled,
  onJump,
  newestOpenId,
  compact,
  coaching = true,
}: {
  signs: Sign[];
  startedAt: number;
  onHandled: (id: string, handled: boolean) => void;
  onJump: (lineId: string) => void;
  newestOpenId?: string;
  compact?: boolean;
  coaching?: boolean;
}) {
  // Coaching off: the column is deliberately empty, and it says so. It must
  // not leak a count either — a badge going up is the prompt this mode exists
  // to withhold.
  //
  // Otherwise: open legal signs, then open tips, then everything handled;
  // newest first inside each band.
  //
  // Strict recency alone buried the thing this product exists to show. On the
  // demo call the legal sign fires at 00:45 and two tips fire after it, so the
  // gold card — the only one carrying a statutory clock — sat SECOND, under a
  // tip, on the screen a judge watches. A tip can wait for the next sentence;
  // a reply window cannot, and that is the whole difference between the two
  // kinds. The DOM order is the priority order, so a screen reader and a
  // keyboard meet them in the same order the eye does.
  const list = useMemo(() => {
    if (!coaching) return [];
    const newestFirst = (a: Sign, b: Sign) => b.t - a.t;
    const open = signs.filter((s) => !s.handled);
    return [
      ...open.filter((s) => s.kind === "legal").sort(newestFirst),
      ...open.filter((s) => s.kind !== "legal").sort(newestFirst),
      ...signs.filter((s) => s.handled).sort((a, b) => (b.handledAt ?? 0) - (a.handledAt ?? 0)),
    ];
  }, [signs, coaching]);

  // A re-sort is not a property change: the row is simply painted somewhere
  // else on the next frame, so a ticked sign would teleport to the bottom.
  const order = list.map((s) => `${s.id}:${s.handled ? 1 : 0}`).join(",");
  const box = useFlip<HTMLDivElement>(order);

  const openCount = signs.filter((s) => !s.handled).length;
  return (
    <aside className="signs" aria-label={coaching ? "Danger signs" : "Danger signs, not shown during this call"}>
      {!compact && (
        <div className="signs-head">
          <span className="label">Signs</span>
          <span className="small muted">
            {!coaching ? "silent this call" : signs.length ? `${openCount} open · legal first, handled last` : "none yet"}
          </span>
        </div>
      )}
      <div className="signs-list" ref={box}>
        {!coaching && <SilentNote />}
        {coaching && list.length === 0 && (
          <div className="empty">
            <b>Nothing to act on yet.</b>
            A sign appears the moment the customer says something that counts. Each one comes once, with the question to ask next.
          </div>
        )}
        {list.map((s) => (
          <article
            key={s.id}
            data-flip={s.id}
            className={`sign ${s.kind}${s.handled ? " done" : ""}`}
            aria-label={`${s.kind === "legal" ? "Legal sign" : "Tip"}. ${s.title}. ${s.dueDate ? `${s.dueLabel ?? "Reply due"} ${s.dueDate}, ${s.dueDays} days. ` : ""}Ask next: ${s.askNext}. ${s.handled ? "Handled." : "Not handled yet."}`}
          >
            <div className="head">
              <Icon kind={s.kind} done={s.handled} />
              <div className="title">{s.title}</div>
              <div className="kind">{s.kind === "legal" ? "LEGAL" : "tip"}</div>
            </div>
            {s.kind === "legal" && s.dueDate ? (
              // The clock is the whole difference between a legal sign and a
              // tip: one starts a statutory reply window and one does not. So
              // it is the second-loudest thing on the card and it is labelled,
              // rather than a date in a run of mono separated by interpuncts.
              <div className="clock">
                <span className="clock-label">{s.dueLabel ?? "Reply due"}</span>
                <b className="clock-date">{fmtDate(s.dueDate)}</b>
                <span className="clock-left">{s.dueDays} days left</span>
                {s.source ? <span className="clock-law">{s.source}</span> : null}
              </div>
            ) : s.detail ? (
              <div className="detail">{s.detail}</div>
            ) : null}
            {s.askNext && (
              // A grid row, not a max-height: the panel has to collapse to the
              // height it actually has, and at the largest text size with line
              // spacing on, one question is 217px tall.
              <div className="slot">
                <div>
                  <div className="ask">
                    <small>Ask next</small>“{s.askNext}”
                  </div>
                </div>
              </div>
            )}
            <div className="slot">
              <div>
                {/* A real button: a span with a click handler is invisible to a
                    keyboard and to a screen reader, and its browser tooltip
                    never appears on a phone. The name carries the WORDS, not
                    the appearance, so the reader knows what they are jumping to. */}
                <button
                  type="button"
                  className="said"
                  onClick={() => onJump(s.lineId)}
                  aria-label={`Jump to the line where she said: ${s.evidence}`}
                >
                  <span className="said-text">“{s.evidence}”</span>
                </button>
              </div>
            </div>
            <div className="foot">
              {s.handled ? (
                <>
                  <span className="handled-at">handled {s.handledAt ? fmtClock(s.handledAt - startedAt) : ""}</span>
                  <button className="btn ghost sm" onClick={() => onHandled(s.id, false)}>
                    Undo
                  </button>
                </>
              ) : (
                <button className="btn sm" onClick={() => onHandled(s.id, true)}>
                  Mark handled {s.id === newestOpenId ? <kbd>H</kbd> : null}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
