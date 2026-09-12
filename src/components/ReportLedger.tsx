import type { CSSProperties } from "react";
import type { Report } from "../lib/types";
import { useCountUp } from "../lib/useCountUp";
import { ledger } from "./report-math";
import "./report-visuals.css";

// "3 of 4 answered" instead of four percentages. Natural frequencies — whole
// numbers against a stated whole — are read correctly far more often than the
// same fact as a rate (Gigerenzer 2011), and one part-to-whole comparison is
// one reading where four independent bars are four.
//
// Three treatments, never three hues: answered is a quiet tint, missed is the
// solid signal, and a verdict the transcript could not support is an empty
// dotted slot. All three survive greyscale and high contrast, and the accent
// is spent on the one thing the worker still has to fix.

// Only the NUMERATOR counts. How many signs were raised was never in question
// — it is the whole the fraction is read against — and counting it up put
// "0 of 0", then "2 of 3", then the truth on screen in the first half second.
// A denominator that moves makes every intermediate frame a different claim.
const COUNT_MS = 420;

export function ReportLedger({ report, previous }: { report: Report; previous: Report[] }) {
  const l = ledger(report.items);
  const nAnswered = useCountUp(l.answered, COUNT_MS);

  if (l.total === 0) {
    return <p className="rv-empty">No signs were raised on this call, so there is nothing to score.</p>;
  }

  const pct = (n: number) => `${(n / l.total) * 100}%`;
  // Nothing judged is not the same as nothing answered. A degraded card — the
  // model unreachable or out of quota — has every verdict unverified, and
  // "0 of 4 answered" would blame the worker for the model's outage.
  const nothingJudged = l.unknown === l.total;
  const sentence = nothingJudged
    ? `${l.total} signs raised. None could be verified from the transcript.`
    : l.unknown > 0
      ? `${l.answered} of ${l.total} signs answered, ${l.missed} missed, ${l.unknown} not verified.`
      : `${l.answered} of ${l.total} signs answered, ${l.missed} missed.`;

  return (
    <section className="rv-ledger">
      <div className="rv-corners">
        <span>Signs raised</span>
        {/* The run mode used to live here, in a 10px corner label, and the
            ternary read a MISSING mode as a coached one. It is said once now,
            in plain words above this chart. The corner is a chart reference,
            not a place to hide the fact that changes how the chart reads. */}
        <span>{report.mode} call</span>
      </div>

      <div className="rv-ledger-top">
        <p className="rv-count">
          <span className="sr-only">{sentence}</span>
          {nothingJudged ? (
            <span aria-hidden="true">
              <b>{l.total}</b>
              <em>signs raised · none verified</em>
            </span>
          ) : (
            <span aria-hidden="true">
              <b>{nAnswered}</b>
              <i>of</i>
              <b>{l.total}</b>
              <em>signs answered</em>
            </span>
          )}
        </p>
        <AnsweredHistory report={report} previous={previous} />
      </div>

      {/* True widths on the first frame — the bar rises into place, it does not
          inflate from zero. See the arrival note at the top of the stylesheet. */}
      <div className="rv-whole" aria-hidden="true">
        {l.answered > 0 && <span className="rv-seg answered" style={{ width: pct(l.answered) }} />}
        {l.missed > 0 && <span className="rv-seg missed" style={{ width: pct(l.missed) }} />}
        {l.unknown > 0 && <span className="rv-seg unknown" style={{ width: pct(l.unknown) }} />}
      </div>

      <div className="rv-keys" aria-hidden="true">
        {l.answered > 0 && (
          <span className="rv-key answered">
            <i />
            <b>{l.answered}</b> answered
            {l.partly > 0 && <em>{l.partly} only partly</em>}
          </span>
        )}
        {l.missed > 0 && (
          <span className="rv-key missed">
            <i />
            <b>{l.missed}</b> missed
          </span>
        )}
        {l.unknown > 0 && (
          <span className="rv-key unknown">
            <i />
            <b>{l.unknown}</b> not verified
          </span>
        )}
      </div>
    </section>
  );
}

// A number out of 100 is read as a school grade — 68 on the System Usability
// Scale is dead average and still reads like a fail — and the documented fix is
// to show the number beside its own benchmark instead of alone.
//
// The benchmark here is the SAME ratio the card leads with, over the worker's
// own last calls in this mode, because that is the number being anchored. The
// score itself is withheld on any call carrying an unverified verdict, which on
// this engine is most of them. Fewer than two calls is not a benchmark, and
// inventing one is worse than showing none — the strip disappears.

const HIST_MAX = 5;
const HIST_H = 32;

function AnsweredHistory({ report, previous }: { report: Report; previous: Report[] }) {
  const earlier = previous.slice(0, HIST_MAX).reverse();
  const all = [...earlier, report].map((r) => ({ r, l: ledger(r.items) })).filter((x) => x.l.total > 0);
  if (all.length < 2) return null;

  const label =
    `Answered on your last ${all.length} ${report.mode} calls: ` +
    all.map((x) => `${x.l.answered} of ${x.l.total}`).join(", ") +
    ". The last is this call.";

  return (
    <div className="rv-hist" role="img" aria-label={label}>
      <div className="rv-hist-plot" style={{ height: HIST_H }}>
        {all.map((x, i) => {
          const here = i === all.length - 1;
          const h = Math.max(3, Math.round((x.l.answered / x.l.total) * HIST_H));
          return (
            <span
              className={"rv-hist-bar" + (here ? " here" : "")}
              key={x.r.callId + i}
              style={{ height: h, "--rv-i": i } as CSSProperties}
              title={`${x.l.answered} of ${x.l.total} answered`}
            />
          );
        })}
      </div>
      <div className="rv-label">answered · last {all.length}</div>
    </div>
  );
}
