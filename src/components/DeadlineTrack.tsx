import type { CSSProperties } from "react";
import { daysUntil, fmtDate, parseISO } from "../lib/dates";
import type { Report } from "../lib/types";
import { daysBetween, localISO } from "./report-math";
import "./report-visuals.css";
import "./report-deadline.css";

// The most consequential number on the card was a sentence: "Reply due Sat 3
// Oct". Here the statutory window has a shape — the call at the left, the
// deadline at the right, today's mark travelling between them — so "21 days"
// is a length and the date is a position. Two deadlines share one axis, which
// makes "which is sooner" a position judgement instead of arithmetic.
//
// Every number is counted from the call and the calendar. Nothing is modelled.

export function DeadlineTrack({ report }: { report: Report }) {
  const statutory = report.deadlines.filter((d) => d.type !== "followup");
  if (statutory.length === 0) return null;

  const rows = statutory.map((d) => {
    const total = Math.max(1, daysBetween(report.at, parseISO(d.date).getTime()));
    const left = daysUntil(d.date);
    const elapsed = Math.min(total, Math.max(0, total - left));
    return { d, total, left, elapsed };
  });
  const axis = Math.max(1, ...rows.map((r) => r.total));
  const pct = (days: number) => `${Math.min(100, (days / axis) * 100)}%`;

  return (
    <section className="rv-dl">
      <div className="rv-corners">
        <span>On the clock</span>
        <span>this call → the deadline</span>
      </div>

      {rows.map(({ d, total, left, elapsed }, i) => {
        const overdue = left < 0;
        const unit = overdue ? (left === -1 ? "day overdue" : "days overdue") : left === 0 ? "due today" : left === 1 ? "day left" : "days left";
        return (
          // Clocks arrive in the order they are listed, 70ms apart — the same
          // staging the rest of the card reads in.
          <div className={"rv-dl-row" + (overdue ? " overdue" : "")} key={d.key + d.date} style={{ "--rv-i": i } as CSSProperties}>
            <div className="rv-dl-head">
              <div className="rv-label">{d.label}</div>
              <div className="rv-dl-title">{d.title}</div>
            </div>

            <div className="rv-dl-mid">
              {/* The fill is the time LEFT, not the time gone: it starts full
                  and empties as the window closes, which is the direction a
                  person already reads a clock running out.

                  It does not grow. It used to animate `width` from 0 to its
                  length, which relaid out the row on every frame of an 820ms
                  trip — and, measured, left the bar at zero length for the
                  whole trip whenever the frames did not come. On the row that
                  carries a statutory deadline, "no time left" is not a subtler
                  picture, it is the wrong one. The length is true on the first
                  frame and the row rises into place instead, the same arrival
                  the ledger's split bar takes.

                  Past the date there is no time left, so "time left" would be a
                  zero-width bar and the row would draw nothing at all — the
                  hatch the stylesheet keeps for exactly this case never once
                  appeared. An overdue window is a SPENT one: the hatch covers
                  it end to end, which cannot be misread as time in hand. */}
              <div className="rv-dl-track" aria-hidden="true">
                <i
                  className="rv-dl-left"
                  style={overdue ? { left: "0%", width: pct(total) } : { left: pct(elapsed), width: pct(Math.max(0, total - elapsed)) }}
                />
                <i className="rv-dl-now" style={{ left: pct(elapsed) }} />
                <i className="rv-dl-due" style={{ left: pct(total) }} />
              </div>
              <div className="rv-dl-marks" aria-hidden="true">
                <span className="rv-dl-from">{fmtDate(localISO(report.at))}</span>
                <span className="rv-dl-to" style={{ left: pct(total) }}>
                  {fmtDate(d.date)}
                </span>
              </div>
            </div>

            <div className="rv-dl-read">
              <b>{overdue ? -left : left}</b>
              <span className="rv-unit">{unit}</span>
              <span className="sr-only">
                {d.label} {fmtDate(d.date)}, {total} day window from this call. {d.title}.
              </span>
            </div>
          </div>
        );
      })}

      <div className="rv-facts">
        <span>
          <b>{rows.length}</b> {rows.length === 1 ? "obligation" : "obligations"} on a clock
        </span>
        <span>also in Deadlines</span>
      </div>
    </section>
  );
}
