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

export function SignStack({
  signs,
  startedAt,
  onHandled,
  onJump,
  newestOpenId,
}: {
  signs: Sign[];
  startedAt: number;
  onHandled: (id: string, handled: boolean) => void;
  onJump: (lineId: string) => void;
  newestOpenId?: string;
}) {
  const list = [...signs].reverse();
  return (
    <aside className="signs" aria-label="Danger signs">
      <div className="signs-head">
        <span className="label">Signs</span>
        <span className="small muted">{signs.length ? `${signs.filter((s) => !s.handled).length} open · newest on top` : "none yet"}</span>
      </div>
      <div className="signs-list">
        {list.length === 0 && (
          <div className="empty">
            <b>Nothing to act on yet.</b>
            A sign appears the moment the customer says something that counts. Each one comes once, with the question to ask next.
          </div>
        )}
        {list.map((s) => (
          <article key={s.id} className={`sign ${s.kind}${s.handled ? " done" : ""}`} aria-live="polite">
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
              <span className="quote" title="Jump to these words" onClick={() => onJump(s.lineId)}>
                “{s.evidence}”
              </span>
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
