import { useEffect, useRef, useState } from "react";
import { daysUntil, fmtDate, fmtDaysLeft } from "../lib/dates";
import { useFlip } from "../lib/motion";
import { play } from "../lib/sfx";
import { actions, useStore } from "../lib/store";
import "./report-visuals.css";

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/**
 * Tidying up before someone else opens the app.
 *
 * Testing leaves real cards and real clocks behind — every one of them genuine
 * engine output, and eight of eleven the same fictional customer's same
 * obligation from the same script replayed. That is not history, it is one call
 * counted eight times, and it reads as a product that duplicates its own work.
 *
 * It is still his data, so nothing goes without a question: the control arms
 * rather than acts, the destructive button carries the exact counts in its own
 * label, and focus never leaves the control while its meaning changes under it.
 */
function ClearCallHistory() {
  const store = useStore();
  const [armed, setArmed] = useState(false);
  const [cleared, setCleared] = useState<string | null>(null);
  const done = useRef<HTMLParagraphElement | null>(null);
  const ask = useRef<HTMLDivElement | null>(null);

  const reports = store.reports.length;
  const deadlines = store.deadlines.length;

  /** This control is the last thing on a long page, so the question it opens
      lands below the fold — asked, and out of sight. Hold the page at its end
      for as long as the row is still growing, and the question rises into view
      on the same curve that opens it.
      ⚠ No timer and no frame count. Every fixed delay tried here was wrong:
      a scroll issued mid-growth targets a page shorter than it will be and is
      clamped there (measured 150px short at 360ms, 134px at 460ms), and in a
      throttled tab the 340ms row takes seconds of wall clock because a
      transition only advances on the frames it is given. `transitionend` would
      be the right trigger and never fires for `grid-template-rows`. Watching
      the element's own size has no timing in it at all. */
  useEffect(() => {
    const el = ask.current;
    if (!armed || !el) return;
    // ⚠ NOT documentElement.scrollHeight on its own. On the phone layout both
    // <html> and <body> are pinned to the viewport height and the app overflows
    // them visibly, so that property reports the viewport-tall box and stops
    // 134px short of the real end. <body> carries the true figure.
    const end = () =>
      window.scrollTo(0, Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    end();
    const ro = new ResizeObserver(end);
    ro.observe(el);
    return () => ro.disconnect();
  }, [armed]);

  if (cleared) {
    return (
      <div className="clear-data">
        {/* Focus lands here, so the outcome is spoken and the keyboard is not
            dumped back at the top of the page by the button it was on. */}
        <p className="clear-done" ref={done} tabIndex={-1} role="status">
          {cleared}
        </p>
      </div>
    );
  }
  if (reports + deadlines === 0) return null;

  const what = `${plural(reports, "report card")} and ${plural(deadlines, "deadline")}`;

  return (
    <div className={"clear-data" + (armed ? " armed" : "")}>
      <div className="clear-head">
        <span className="rv-label">{what} stored on this device</span>
        <button
          className="btn ghost sm"
          aria-expanded={armed}
          onClick={() => {
            const next = !armed;
            setArmed(next);
            play("tap");

          }}
        >
          {armed ? "Keep them" : "Clear demo data"}
        </button>
      </div>
      <div className="clear-ask" aria-hidden={!armed} ref={ask}>
        <div>
          <p className="clear-say">
            Removes {what} from this device, including the {plural(store.deadlines.filter((d) => !d.done).length, "clock")} still
            running. Your lessons and practice customers stay. This cannot be undone.
          </p>
          <button
            className="btn gold sm"
            tabIndex={armed ? undefined : -1}
            onClick={() => {
              actions.clearCallHistory();
              play("undo");
              setCleared(`Removed ${what}. Lessons and practice customers were kept.`);
              window.setTimeout(() => done.current?.focus(), 0);
            }}
          >
            Remove {what}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Deadlines() {
  const store = useStore();
  const rows = [...store.deadlines].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date));
  // Ticking a deadline drops it to the bottom of this sort. A CSS transition
  // cannot animate a reorder — the row is re-laid-out, not moved — so it used
  // to teleport. The key is the order itself, so the measurement happens on
  // the commit that changes it.
  const list = useFlip<HTMLDivElement>(rows.map((d) => d.id + (d.done ? "1" : "0")).join());
  return (
    <div className="page narrow" ref={list}>
      <h1>Deadlines</h1>
      <p className="lede">Every legal sign starts a clock the bank is on. They land here with the date, so nothing goes unanswered.</p>
      {rows.length === 0 && (
        <div className="empty" data-flip="empty">
          <b>No clocks running.</b>
          Catch a hardship request or a complaint on a call and its reply date appears here.
        </div>
      )}
      {rows.map((d) => {
        const n = daysUntil(d.date);
        return (
          <div className={"deadline-row" + (d.done ? " done" : "")} key={d.id} data-flip={d.id}>
            <span className="d">{fmtDate(d.date)}</span>
            <span className={"left" + (n < 0 ? " over" : n <= 7 ? " soon" : "")}>{d.done ? "done" : fmtDaysLeft(d.date)}</span>
            <span className="what">
              <b>
                {d.label}: {d.title}
              </b>
              <span>{d.customer}</span>
            </span>
            <button
              className="btn sm"
              onClick={() => {
                actions.toggleDeadline(d.id);
                play(d.done ? "undo" : "deadline");
              }}
            >
              {d.done ? "Reopen" : "Mark replied"}
            </button>
          </div>
        );
      })}
      <ClearCallHistory />
    </div>
  );
}
