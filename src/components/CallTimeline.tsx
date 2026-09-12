import { useEffect, useRef, useState } from "react";
import { fmtClock } from "../lib/dates";
import type { Report, Session, Sign, Verdict } from "../lib/types";
import "./report-visuals.css";

// The whole call on one axis: every line is a tick, every sign a marker at its
// moment. Customer above the axis in cream, worker below in grey; legal signs
// are solid gold, tips outlined; a handled sign gets a cream tick under it and
// a missed one a dotted gold drop-line to the word.

const H = 120;
const PAD = 6;
const Y_AXIS = 52;
const TICK = 8;
const Y_MARK_BASE = 30;
const Y_MARK_APEX = 40;
const MARK_HALF = 5;
const Y_DONE_TOP = 63;
const Y_DONE_BOT = 69;
const Y_DROP_END = 84;
const Y_MISSED = 96;
const Y_TIME = 116;
const FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

const crisp = (v: number) => Math.round(v) + 0.5;

function Duration({ sec }: { sec: number }) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  if (m === 0) {
    return (
      <>
        <b>{s}</b> s
      </>
    );
  }
  return (
    <>
      <b>{m}</b> min <b>{s % 60}</b> s
    </>
  );
}

export function CallTimeline({ session, report }: { session: Session; report: Report }) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(200, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = session.startedAt;
  const lastT = Math.max(
    session.endedAt ?? 0,
    start + report.durationSec * 1000,
    ...session.lines.map((l) => l.t),
    ...session.signs.map((s) => s.t),
  );
  const span = Math.max(1000, lastT - start);
  const x = (t: number) => PAD + (Math.min(Math.max(t - start, 0), span) / span) * (width - PAD * 2);

  const verdictOf = (s: Sign): Verdict | undefined =>
    (report.items.find((i) => i.signId === s.id) ?? report.items.find((i) => i.key === s.key))?.verdict;

  const signs = [...session.signs].sort((a, b) => a.t - b.t);
  const first = signs[0];
  const lines = session.lines.length;

  return (
    <div className="rv-timeline" ref={wrap}>
      <div className="rv-corners">
        <span>Timeline</span>
        <span>customer above · worker below</span>
      </div>

      <svg className="rv-tl-svg" width="100%" height={H} viewBox={`0 0 ${width} ${H}`} aria-hidden="true">
        {/* quarter marks, dim, behind the ticks */}
        {FRACTIONS.slice(1, 4).map((f) => {
          const px = crisp(x(start + f * span));
          return <line key={"g" + f} className="rv-tl-grid" x1={px} x2={px} y1={Y_AXIS - TICK} y2={Y_AXIS + TICK} />;
        })}

        {/* the axis */}
        <line className="rv-tl-axis" x1={0} x2={width} y1={crisp(Y_AXIS)} y2={crisp(Y_AXIS)} />

        {/* one tick per line */}
        {session.lines.map((l) => {
          const px = crisp(x(l.t));
          if (l.speaker === "customer") {
            return <line key={l.id} className="rv-tl-cust" x1={px} x2={px} y1={Y_AXIS - TICK} y2={Y_AXIS} />;
          }
          const cls = l.speaker === "worker" ? "rv-tl-work" : "rv-tl-unk";
          return <line key={l.id} className={cls} x1={px} x2={px} y1={Y_AXIS} y2={Y_AXIS + TICK} />;
        })}

        {/* one marker per sign */}
        {signs.map((s) => {
          const px = x(s.t);
          const cx = Math.round(px);
          const verdict = verdictOf(s);
          const missed = verdict === "missed";
          const labelX = Math.min(Math.max(cx, 22), width - 22);
          const tri = `${cx - MARK_HALF},${Y_MARK_BASE} ${cx + MARK_HALF},${Y_MARK_BASE} ${cx},${Y_MARK_APEX}`;
          return (
            <g key={s.id} className="rv-tl-mark">
              <title>{`${s.title} — ${s.evidence}`}</title>
              <polygon className={s.kind === "legal" ? "rv-tl-legal" : "rv-tl-tip"} points={tri} />
              {s.handled && <line className="rv-tl-done" x1={cx} x2={cx} y1={Y_DONE_TOP} y2={Y_DONE_BOT} />}
              {missed && (
                <>
                  <line className="rv-tl-drop" x1={crisp(cx)} x2={crisp(cx)} y1={Y_DONE_TOP} y2={Y_DROP_END} />
                  <text className="rv-tl-missed" x={labelX} y={Y_MISSED} textAnchor="middle">
                    missed
                  </text>
                </>
              )}
              <rect className="rv-tl-hit" x={cx - 9} y={Y_MARK_BASE - 6} width={18} height={Y_DONE_BOT - Y_MARK_BASE + 8} />
            </g>
          );
        })}

        {/* time labels at 0 / 25 / 50 / 75 / 100 */}
        {FRACTIONS.map((f) => {
          const anchor = f === 0 ? "start" : f === 1 ? "end" : "middle";
          const px = f === 0 ? 0 : f === 1 ? width : x(start + f * span);
          return (
            <text key={"t" + f} className="rv-tl-time" x={px} y={Y_TIME} textAnchor={anchor}>
              {fmtClock(f * span)}
            </text>
          );
        })}
      </svg>

      <div className="rv-facts">
        <span>
          <b>{lines}</b> {lines === 1 ? "line" : "lines"} · <b>{signs.length}</b> {signs.length === 1 ? "sign" : "signs"} · <Duration sec={report.durationSec} />
        </span>
        <span>
          {first ? (
            <>
              first sign at <b>{fmtClock(first.t - start)}</b>
            </>
          ) : (
            "no signs raised"
          )}
        </span>
      </div>
    </div>
  );
}
