import { useEffect, useState } from "react";
import type { ReportItem, Verdict } from "../lib/types";
import "./report-visuals.css";

// One row per sign, the bar BEHIND the row's text (Instruments §2g): a
// low-opacity gold fill whose width is the verdict, the stamp and the title
// sitting on top in normal flow. Handled rows carry a 2px gold leading edge.

const WIDTH: Record<Verdict, number> = { handled: 100, partly: 55, missed: 18, unverified: 8 };

export function SignBars({ items }: { items: ReportItem[] }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (items.length === 0) return <p className="rv-empty">No signs were raised on this call.</p>;

  return (
    <div className="rv-bars">
      {items.map((i) => (
        <div className={"rv-bar-row " + i.verdict} key={i.signId} title={i.note}>
          <div className={"rv-bar-fill " + i.verdict} style={{ width: grown ? `${WIDTH[i.verdict]}%` : "0%" }} />
          <span className="rv-bar-verdict">{i.verdict}</span>
          <span className="rv-bar-title">{i.title}</span>
          <span className="rv-bar-kind">{i.kind}</span>
        </div>
      ))}
    </div>
  );
}
