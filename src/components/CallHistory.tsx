import { useState } from "react";
import type { CSSProperties } from "react";
import { fmtWhen } from "../lib/dates";
import { play } from "../lib/sfx";
import { useStore } from "../lib/store";
import type { Report, SignKind, Verdict } from "../lib/types";
import { ledger, type Ledger } from "./report-math";
import { ReportCard } from "./ReportCard";
import "./report-visuals.css";
import "./call-history.css";

/**
 * Every call the worker has finished, and two of them held against each other.
 *
 * Why a compare of the LEDGERS rather than two whole report cards side by side:
 * the transcript is never saved, by design, so a card pulled back out of
 * storage has no timeline, no answer times and no quoted worker lines. Two
 * cards side by side would be one complete card beside one with three holes in
 * it. What survives storage is exactly what the argument is made of — how many
 * signs were raised, how many were answered, and which ones went unanswered —
 * so that is what gets put on a shared axis. The prose was never the argument.
 *
 * Nothing here subtracts one call from the other. Two calls raise different
 * signs and the same script does not score the same twice, so a difference
 * would be a number the data cannot support. The board prints both fractions,
 * both verdict columns, and says plainly where the two stop being comparable.
 */

type RunMode = "coached" | "silent" | "unknown";

/** ⚠ `=== true` / `=== false`, never `!coaching`. Absent is a third state: the
    mode was not recorded, which is not the same as the assistant being off. */
function runMode(r: Report): RunMode {
  if (r.coaching === true) return "coached";
  if (r.coaching === false) return "silent";
  return "unknown";
}

/** These are the row's NAME on the compare board — the one thing that differs
    between two runs of the same script — so they are set sentence case and
    read at the size a name gets, not as a 10px chrome label. */
const MODE_LONG: Record<RunMode, string> = {
  coached: "Assistant coaching",
  silent: "Assistant silent",
  unknown: "Mode not recorded",
};
const MODE_SHORT: Record<RunMode, string> = { coached: "coached", silent: "silent", unknown: "not recorded" };

interface Slot {
  report: Report;
  l: Ledger;
  mode: RunMode;
  /** False whenever this call's handling was never judged — the write-up
      failed, no sign was raised, or no verdict could be verified. An unjudged
      call is still listed, and still openable, but it never gets a bar, a
      fraction or a score, because there is nothing on it to compare. */
  judged: boolean;
  /** Said in the slot instead of the bar, so the gap is explained rather than
      drawn as a zero. */
  why?: string;
}

function toSlot(report: Report): Slot {
  const l = ledger(report.items);
  const mode = runMode(report);
  if (report.degraded) {
    return {
      report,
      l,
      mode,
      judged: false,
      why:
        report.degradedReason === "quota"
          ? "No write-up — the model's daily limit was reached. This call was never judged."
          : "No write-up — the model could not be reached. This call was never judged.",
    };
  }
  if (l.total === 0) return { report, l, mode, judged: false, why: "No signs were raised, so there is nothing to answer." };
  if (l.unknown === l.total)
    return { report, l, mode, judged: false, why: "No verdict on this call could be verified from the transcript." };
  return { report, l, mode, judged: true };
}

function scoreText(r: Report): string {
  if (r.degraded) return "not judged";
  if (r.scoreUnverified) return "not verified";
  return String(Math.round(r.score));
}

/** The two slots start out with the same mode word, which makes the verdict
    columns ambiguous. When that happens the time tells them apart. */
function slotLabels(slots: Slot[]): string[] {
  const words = slots.map((s) => MODE_SHORT[s.mode]);
  if (words.length === 2 && words[0] === words[1]) {
    return slots.map((s, i) => `${words[i]} · ${fmtWhen(s.report.at).split(", ")[1]}`);
  }
  return words;
}

interface SignRow {
  key: string;
  title: string;
  kind: SignKind;
  cells: (Verdict | "absent")[];
}

/** The union of both calls' signs, legal ones first. A sign only one call
    raised keeps its row and gets an empty slot on the other side — dropping it
    would quietly make the two calls look like they saw the same thing. */
function signRows(slots: Slot[]): SignRow[] {
  const rows = new Map<string, SignRow>();
  slots.forEach((slot, i) => {
    for (const item of slot.report.items) {
      let row = rows.get(item.key);
      if (!row) {
        row = { key: item.key, title: item.title, kind: item.kind, cells: slots.map(() => "absent") };
        rows.set(item.key, row);
      }
      row.cells[i] = item.verdict;
    }
  });
  return [...rows.values()].sort((a, b) =>
    a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === "legal" ? -1 : 1,
  );
}

function CompareBoard({ slots }: { slots: Slot[] }) {
  const labels = slotLabels(slots);
  const rows = signRows(slots);

  // One axis for both bars: the larger sign count. Each bar is as long as its
  // own call raised, so "four signs against three" is visible as a length
  // instead of hidden inside two bars stretched to the same width.
  const axis = Math.max(1, ...slots.filter((s) => s.judged).map((s) => s.l.total));
  const judged = slots.filter((s) => s.judged);

  const totals = judged.map((s) => s.l.total);
  const differentSigns = judged.length === 2 && rows.some((r) => r.cells.includes("absent"));
  const modes = slots.map((s) => s.mode);
  const sameMode = modes.length === 2 && modes[0] === modes[1] && modes[0] !== "unknown";
  const anyUnknownMode = modes.includes("unknown");

  return (
    <section className="cmp">
      <div className="rv-corners">
        <span>Two calls compared</span>
        <span>one axis · signs raised</span>
      </div>

      {/* The two rows and the key that names their fills are one object, on one
          ground. Stacked on the page and divided by a hairline they read as two
          list items that happen to be adjacent — the same shape as the sign
          table below them. A plate says "the same call, twice" before a word of
          it is read, and it is the only surface on this board. */}
      <div className="cmp-pair">
        <div className="cmp-rows" style={{ "--cmp-step": `${100 / axis}%` } as CSSProperties}>
          {slots.map((s, i) => (
            <div
              className={"cmp-row " + s.mode + (s.judged ? "" : " unjudged")}
              key={s.report.callId}
              style={{ "--cmp-i": i } as CSSProperties}
            >
              <div className="cmp-head">
                <div className="rv-label">{MODE_LONG[s.mode]}</div>
                <div className="cmp-who">{s.report.customer}</div>
                <div className="cmp-when">
                  {fmtWhen(s.report.at)} · {s.report.mode}
                </div>
              </div>

              {s.judged ? (
                <>
                  {/* True on the first frame. A channel that grows out of zero
                      freezes at zero on any page that is not painting, and "this
                      call raised no signs" is the opposite of what this row is
                      for. The row arrives instead, by a transform. */}
                  <div className="cmp-track" aria-hidden="true">
                    <span className="cmp-bar" style={{ width: `${(s.l.total / axis) * 100}%` }}>
                      {s.l.answered > 0 && (
                        <i className="rv-seg answered" style={{ width: `${(s.l.answered / s.l.total) * 100}%` }} />
                      )}
                      {s.l.missed > 0 && <i className="rv-seg missed" style={{ width: `${(s.l.missed / s.l.total) * 100}%` }} />}
                      {s.l.unknown > 0 && (
                        <i className="rv-seg unknown" style={{ width: `${(s.l.unknown / s.l.total) * 100}%` }} />
                      )}
                    </span>
                  </div>
                  <div className="cmp-read">
                    <span className="sr-only">
                      {MODE_LONG[s.mode]}. {s.l.answered} of {s.l.total} signs answered, {s.l.missed} missed
                      {s.l.unknown > 0 ? `, ${s.l.unknown} not verified` : ""}. Score {scoreText(s.report)}.
                    </span>
                    <span className="cmp-frac" aria-hidden="true">
                      <b>{s.l.answered}</b>
                      <i>of</i>
                      <b>{s.l.total}</b>
                    </span>
                    {/* Two lines, always. On a phone the reading column is 120px
                        and "answered · score 95" broke after the word "score",
                        leaving the number stranded on its own line. It also puts
                        the fraction — the comparison — above the score, which is
                        the one number here that should not be read as a gap. */}
                    <span className="cmp-sub" aria-hidden="true">
                      answered
                    </span>
                    <span className="cmp-sub" aria-hidden="true">
                      score {scoreText(s.report)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="cmp-why">{s.why}</p>
              )}
            </div>
          ))}
        </div>

        {/* The same key the report card prints under its own ledger. Without it
            the loudest thing on the board — the solid fill — is unlabelled, and
            gold means "good" everywhere else in this app. It means MISSED here,
            and that has to be said rather than inferred. */}
        {judged.length > 0 && (
          <div className="rv-keys cmp-keys" aria-hidden="true">
            {/* Only what is actually drawn above. A key for a fill that appears
                nowhere is a legend for an empty chart. */}
            {judged.some((s) => s.l.answered > 0) && (
              <span className="rv-key answered">
                <i />
                answered
              </span>
            )}
            {judged.some((s) => s.l.missed > 0) && (
              <span className="rv-key missed">
                <i />
                missed
              </span>
            )}
            {judged.some((s) => s.l.unknown > 0) && (
              <span className="rv-key unknown">
                <i />
                not verified
              </span>
            )}
          </div>
        )}
      </div>

      {/* The caveats are part of the comparison, not a disclaimer under it: each
          one is only printed when it is true of these two calls. */}
      <div className="cmp-notes">
        {judged.length === 2 && (
          <p className="cmp-note key">
            The same script does not score the same twice. Read the fractions and the verdicts below — not the gap
            between the two numbers.
          </p>
        )}
        {/* Said out loud rather than left to be noticed from a missing bar. */}
        {judged.length < 2 && (
          <p className="cmp-note key">
            {judged.length === 0
              ? "Neither of these calls was judged, so there is nothing here to compare."
              : "Only one of these calls was judged, so there is nothing to compare on handling."}
          </p>
        )}
        {differentSigns && totals.length === 2 && (
          <p className="cmp-note">
            These two calls did not raise the same signs ({totals[0]} and {totals[1]}), so the two scores are not
            counting the same things.
          </p>
        )}
        {sameMode && (
          <p className="cmp-note">
            Both calls ran with the {modes[0] === "coached" ? "assistant coaching" : "assistant silent"}, so nothing
            here is a comparison of the two modes.
          </p>
        )}
        {anyUnknownMode && (
          <p className="cmp-note">
            One of these calls never recorded whether the assistant was coaching, so a difference cannot be put down
            to the mode.
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="cmp-signs">
          <div className="cmp-sign-row head" aria-hidden="true">
            <span className="rv-label">Sign raised</span>
            {labels.map((lab, i) => (
              <span className="rv-label cmp-col" key={slots[i].report.callId}>
                {lab}
              </span>
            ))}
          </div>
          {rows.map((r) => (
            <div className="cmp-sign-row" key={r.key}>
              <span className="cmp-sign-name">
                {r.title}
                {r.kind === "legal" && <em>legal</em>}
              </span>
              {r.cells.map((cell, i) => {
                const slot = slots[i];
                const text = !slot.judged ? "not judged" : cell === "absent" ? "not raised" : cell;
                const tone = !slot.judged ? "none" : cell === "absent" ? "absent" : cell;
                return (
                  <span className="cmp-cell" key={slot.report.callId}>
                    <b className="cmp-cell-lab">{labels[i]}</b>
                    <span className={"cmp-v " + tone}>{text}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Picking the pair.
 *
 * The default is the newest call plus the newest one that ran in the OTHER
 * mode, because that pair is the demo: the same script with the assistant on
 * and with it silent. When no opposite exists it falls back to the two newest.
 */
function defaultPair(reports: Report[]): string[] {
  const newest = reports[0];
  if (!newest) return [];
  const newestMode = runMode(newest);
  const opposite =
    newestMode === "unknown"
      ? undefined
      : reports.find((r) => r.callId !== newest.callId && runMode(r) !== "unknown" && runMode(r) !== newestMode);
  const other = opposite ?? reports[1];
  return other ? [newest.callId, other.callId] : [newest.callId];
}

/** Coached on the left when the pair is exactly one of each, so the board reads
    "with it" then "without it". Any other pair keeps store order, newest first,
    which is the order they were picked out of. */
function order(slots: Slot[]): Slot[] {
  if (slots.length !== 2) return slots;
  const [a, b] = slots;
  if (a.mode === "silent" && b.mode === "coached") return [b, a];
  return slots;
}

export function CallHistory({ onNewCall }: { onNewCall: () => void }) {
  const store = useStore();
  const reports = store.reports;
  const [picked, setPicked] = useState<string[]>(() => defaultPair(reports));
  const [openId, setOpenId] = useState<string | null>(null);

  // Everything is derived from the store on every render, so clearing the demo
  // data empties this view instead of resurrecting a card from local state.
  const open = openId === null ? undefined : reports.find((r) => r.callId === openId);
  const chosen = picked.map((id) => reports.find((r) => r.callId === id)).filter((r): r is Report => r !== undefined);
  const slots = order(chosen.map(toSlot));

  if (open) {
    return (
      <div className="page">
        {/* The card centres itself in a 900px column, so a control left at the
            page edge floats away from the thing it goes back from. */}
        <div className="back-to-calls">
          <button
            className="btn ghost sm"
            onClick={() => {
              play("tap");
              setOpenId(null);
            }}
          >
            ← All calls
          </button>
        </div>
        <ReportCard report={open} onNew={onNewCall} />
      </div>
    );
  }

  const toggle = (id: string) => {
    play("tap");
    // Picking a third drops the one picked longest ago, so the control never
    // has to say "deselect something first".
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  };

  return (
    <div className="page">
      <h1>Calls</h1>
      <p className="lede">
        Every report card stays here after the call. Put two of them on one axis to see what changes when the
        assistant is coaching and when it is silent.
      </p>

      {reports.length === 0 && (
        <div className="empty">
          <b>No calls yet.</b>
          Finish a call and its report card lands here, with every card before it.
        </div>
      )}

      {slots.length === 2 && <CompareBoard slots={slots} />}
      {reports.length > 0 && slots.length < 2 && (
        <p className="rv-empty">
          {reports.length === 1
            ? "One call so far. Run the same script again with the assistant silent and the two land side by side here."
            : `Pick ${slots.length === 0 ? "two calls" : "one more call"} below to put them on one axis.`}
        </p>
      )}

      <div className="call-list">
        <div className="rv-corners call-list-head">
          <span>
            {reports.length} {reports.length === 1 ? "call" : "calls"} on this device
          </span>
          <span>pick two · open any</span>
        </div>
        {reports.map((r) => {
          const s = toSlot(r);
          const on = picked.includes(r.callId);
          return (
            <div className={"call-row" + (on ? " on" : "")} key={r.callId}>
              <span className={"call-mode " + s.mode}>{MODE_SHORT[s.mode]}</span>
              <button
                className="call-open"
                onClick={() => {
                  play("tap");
                  setOpenId(r.callId);
                  window.scrollTo({ top: 0 });
                }}
              >
                <b>{r.customer}</b>
                <span>
                  {fmtWhen(r.at)} · {r.mode}
                </span>
              </button>
              <span className="call-read">
                {s.judged ? (
                  <>
                    <b>
                      {s.l.answered} of {s.l.total}
                    </b>
                    <span>answered · {scoreText(r)}</span>
                  </>
                ) : (
                  <span className="call-nil">{r.degraded ? "not judged" : s.l.total === 0 ? "no signs" : "none verified"}</span>
                )}
              </span>
              <button className="btn ghost sm" aria-pressed={on} onClick={() => toggle(r.callId)}>
                {on ? "Comparing" : "Compare"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
