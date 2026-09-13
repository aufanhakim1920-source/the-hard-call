import type { CSSProperties } from "react";
import type { Report, Session } from "../lib/types";
import { fmtGap, gapParts, niceSpan, responseGaps, tickStep } from "./report-math";
import "./report-visuals.css";

// The product's whole claim, drawn as the thing it actually is: a duration.
// Every lane starts at the words that raised the sign and ends where the
// worker's cited answer landed, all against one shared seconds axis — a position
// judgement on a common scale, which Cleveland & McGill measured as the most
// accurately read encoding there is (1.4–2.5x better than length alone).
//
// A sign the worker never answered has no bar. It gets the fire mark and an
// empty lane, because a zero-width bar would read as "answered instantly" and
// a full-width one as "took forever". Neither is known, so neither is drawn.
//
// Which is also why no bar here grows: a zero-width bar means something on this
// chart, and a sweep starts at exactly that value. The lanes arrive one at a
// time, top to bottom — Heer & Robertson's staged reading — but by a 7px rise,
// so a lane that never gets a frame is 7px low rather than a wrong duration.

export function ResponseTimes({ session, report }: { session: Session; report: Report }) {
  const gaps = responseGaps(session, report);
  const lanes = gaps.length;

  if (lanes === 0) return null;

  const answers = gaps.filter((g) => g.hasAnswer).length;
  const measured = gaps.filter((g) => g.gapMs !== undefined).map((g) => g.gapMs as number);
  const axis = niceSpan(measured.length > 0 ? Math.max(...measured) : 10000);
  const step = tickStep(axis);
  const ticks: number[] = [];
  for (let t = 0; t <= axis + 1; t += step) ticks.push(t);

  const fastest = measured.length > 0 ? Math.min(...measured) : undefined;
  const slowest = measured.length > 0 ? Math.max(...measured) : undefined;

  return (
    <section className="rv-rt" style={{ "--rv-tick": `${(step / axis) * 100}%` } as CSSProperties}>
      <div className="rv-corners">
        <span>Answer time</span>
        {/* Named for what is actually subtracted. It used to read "sign
            raised", which was the moment the model's answer came back. */}
        <span>the words that raised it → the worker&rsquo;s answer</span>
      </div>

      <div className="rv-rt-rows">
        {gaps.map(({ item, gapMs, hasAnswer }, i) => {
          const has = gapMs !== undefined;
          // Whatever a lane cannot time, it says exactly which thing is
          // absent, because the card underneath quotes the answer. "No answer
          // found" over a quoted answer is the card calling itself a liar; an
          // answer that exists and could not be timed is a different fact and
          // gets its own words. Nothing here invents a duration.
          const nil = !hasAnswer
            ? item.verdict === "missed"
              ? "not addressed"
              : item.verdict === "unverified"
                ? "not verified"
                : "no answer found"
            : "answered, not timed";
          return (
            <div
              className={"rv-rt-row " + item.verdict + (has ? "" : " none")}
              key={item.signId}
              // The lane's place in the stagger. The rise is a transform, so
              // the lane is visible and at its true length even if the frame
              // it would have animated on never arrives.
              style={{ "--rv-i": i } as CSSProperties}
            >
              <div className="rv-rt-head">
                <span className="rv-rt-title">{item.title}</span>
                <span className="rv-rt-stamp">{item.verdict}</span>
              </div>
              <div className="rv-rt-track" aria-hidden="true">
                <i className="rv-rt-fire" />
                {/* True width on the first frame. It used to sweep out from
                    zero behind a requestAnimationFrame, and a page that is
                    visible but not compositing never fires one — the lane sat
                    at "answered instantly" until a timeout started the same
                    transition, which froze at zero as well. */}
                {has && (
                  <i
                    className="rv-rt-bar"
                    style={{ width: `${Math.min(100, ((gapMs as number) / axis) * 100)}%` }}
                  />
                )}
              </div>
              <div className="rv-rt-value">
                {has ? (
                  <>
                    <b>{gapParts(gapMs as number)[0]}</b>
                    <span className="rv-unit">{gapParts(gapMs as number)[1]}</span>
                  </>
                ) : (
                  <span className="rv-rt-nil">{nil}</span>
                )}
              </div>
            </div>
          );
        })}

        <div className="rv-rt-axis" aria-hidden="true">
          <div className="rv-rt-ax">
            {ticks.map((t, i) => (
              <span key={t} style={{ left: `${(t / axis) * 100}%` }} data-end={i === ticks.length - 1 ? "" : undefined}>
                {t === 0 ? "0" : `${Math.round(t / 1000)}s`}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rv-facts">
        <span>
          {/* The denominator is the ANSWERS, not the signs. Counting timings
              against every sign printed "1 of 4 answer times measured" beside
              a ledger reading "4 of 4 answered" — two numbers about different
              things, 250px apart, and the card looked like it was arguing with
              itself. Against the answers it can only ever narrow the ledger's
              count, never contradict it. */}
          {answers === 0 ? (
            "no answers on this call to time"
          ) : (
            <>
              <b>{measured.length}</b> of <b>{answers}</b> answers timed
            </>
          )}
        </span>
        <span>
          {fastest === undefined || slowest === undefined ? (
            // Silent when there was nothing to time — the count beside it has
            // already said so, and saying it twice reads as two failures.
            answers === 0 ? null : (
              "none of them could be timed"
            )
          ) : fastest === slowest ? (
            // One measurement is not a range, and printing it as one reads as
            // a coincidence rather than a single fact.
            <>
              answered in <b>{fmtGap(fastest)}</b>
            </>
          ) : (
            <>
              fastest <b>{fmtGap(fastest)}</b> · slowest <b>{fmtGap(slowest)}</b>
            </>
          )}
        </span>
      </div>
    </section>
  );
}
