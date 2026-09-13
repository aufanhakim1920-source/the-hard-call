import { useEffect, useRef } from "react";
import { speakerLabel } from "../lib/api";
import { fmtClock } from "../lib/dates";
import type { Line, Mode, Sign } from "../lib/types";

function highlight(text: string, quotes: string[]) {
  if (!quotes.length) return text;
  const parts: (string | { m: string })[] = [];
  let rest = text;
  // find the earliest quote each pass; simple and good enough for a few marks per line
  while (rest.length) {
    let best: { i: number; q: string } | null = null;
    for (const q of quotes) {
      if (!q) continue;
      const i = rest.toLowerCase().indexOf(q.toLowerCase());
      if (i >= 0 && (best === null || i < best.i)) best = { i, q };
    }
    if (!best) {
      parts.push(rest);
      break;
    }
    if (best.i > 0) parts.push(rest.slice(0, best.i));
    parts.push({ m: rest.slice(best.i, best.i + best.q.length) });
    rest = rest.slice(best.i + best.q.length);
  }
  return parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : <mark key={i}>{p.m}</mark>));
}

export function Transcript({
  lines,
  signs,
  interim,
  startedAt,
  mode,
  flashId,
  emptyHint,
}: {
  lines: Line[];
  signs: Sign[];
  interim: string;
  startedAt: number;
  mode: Mode;
  flashId?: string;
  emptyHint: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Stay pinned to the newest line — but never yank someone who has scrolled up
  // to re-read what was said. The flag is written by the element's own scroll
  // events, so the jump below leaves it true and a finger is what turns it off.
  const stick = useRef(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el || !stick.current) return;
    // Nothing has been said yet, so the box holds the empty state — which is
    // the paragraph explaining what this screen IS. Jumping to the bottom of it
    // opens the app mid-sentence.
    if (!lines.length && !interim) return;
    // "instant", not the stylesheet's smooth: a smooth scroll needs frames and
    // a throttled tab gives none — the same failure mode as an entrance that
    // fades in from zero. Whether the newest line can be SEEN is not allowed to
    // depend on an animation running.
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
  }, [lines.length, interim]);

  const quotesByLine = new Map<string, string[]>();
  for (const s of signs) {
    const arr = quotesByLine.get(s.lineId) ?? [];
    arr.push(s.evidence);
    quotesByLine.set(s.lineId, arr);
  }

  return (
    <div className="transcript" ref={box}>
      {lines.length === 0 && !interim && <div className="empty">{emptyHint}</div>}
      {lines.map((l) => (
        <div key={l.id} id={"line-" + l.id} className={`ln ${l.speaker}${flashId === l.id ? " flash" : ""}`}>
          <div className="meta">
            <span className={"who " + l.speaker}>{speakerLabel(l.speaker, mode)}</span>
            <span className="time">{fmtClock(l.t - startedAt)}</span>
          </div>
          <div className="text">
            {highlight(l.text, quotesByLine.get(l.id) ?? [])}
            {l.masked && (
              <span className="chip masked" title="A number that identifies the person was masked before it left this browser">
                masked
              </span>
            )}
          </div>
        </div>
      ))}
      {interim && (
        <div className="ln interim unknown">
          <div className="meta">
            <span className="who">…</span>
          </div>
          <div className="text">{interim}</div>
        </div>
      )}
    </div>
  );
}
