import { fmtClock, fmtDate } from "../lib/dates";
import type { Sign } from "../lib/types";

function Icon({ kind }: { kind: Sign["kind"] }) {
  return kind === "legal" ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 L22 20 H2 Z" fill="#1C1F24" />
      <rect x="11.1" y="9" width="1.8" height="6" rx="0.9" fill="#C79C5A" />
      <circle cx="12" cy="17" r="1.1" fill="#C79C5A" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 L22 20 H2 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="11.1" y="9" width="1.8" height="6" rx="0.9" fill="currentColor" />
      <circle cx="12" cy="17" r="1.1" fill="currentColor" />
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
  const list = coaching ? [...signs].reverse() : [];
  return (
    <aside className="signs" aria-label={coaching ? "Danger signs" : "Danger signs, not shown during this call"}>
      {!compact && (
        <div className="signs-head">
          <span className="label">Signs</span>
          <span className="small muted">
            {!coaching ? "silent this call" : signs.length ? `${signs.filter((s) => !s.handled).length} open · newest on top` : "none yet"}
          </span>
        </div>
      )}
      <div className="signs-list">
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
          className={`sign ${s.kind}${s.handled ? " done" : ""}`}
          aria-label={`${s.kind === "legal" ? "Legal sign" : "Tip"}. ${s.title}. ${s.dueDate ? `${s.dueLabel ?? "Reply due"} ${s.dueDate}, ${s.dueDays} days. ` : ""}Ask next: ${s.askNext}. ${s.handled ? "Handled." : "Not handled yet."}`}
        >
            <div className="head">
              <Icon kind={s.kind} />
              <div className="title">{s.title}</div>
              <div className="kind">{s.kind === "legal" ? "legal" : "tip"}</div>
            </div>
            {s.kind === "legal" && s.dueDate ? (
              <div className="due">
                <span>{s.dueLabel ?? "Reply due"}</span>
                <b>{fmtDate(s.dueDate)}</b>
                <span>· {s.dueDays} days</span>
                {s.source ? <span>· {s.source}</span> : null}
              </div>
            ) : s.detail ? (
              <div className="detail">{s.detail}</div>
            ) : null}
            {s.askNext && (
              <div className="ask">
                <small>Ask next</small>“{s.askNext}”
              </div>
            )}
            <div className="foot">
              {/* A real button: a span with a click handler is invisible to a
                  keyboard and to a screen reader, and its browser tooltip
                  never appears on a phone. The name carries the WORDS, not
                  the appearance, so the reader knows what they are jumping to. */}
              <button type="button" className="quote" onClick={() => onJump(s.lineId)} aria-label={`Jump to the line where she said: ${s.evidence}`}>
                “{s.evidence}”
              </button>
              {s.handled ? (
                <>
                  <span className="handled-at">✓ handled {s.handledAt ? fmtClock(s.handledAt - startedAt) : ""}</span>
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
