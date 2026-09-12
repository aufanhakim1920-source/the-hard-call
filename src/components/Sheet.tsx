// A bottom sheet for the phone. The signs live in it during a call.
//
// Physics from the apple-design notes in the vault: the drag follows the
// finger 1:1, release projects the momentum (v/1000 * d/(1-d), d = 0.998)
// and snaps to the detent nearest the PROJECTED endpoint, not the release
// point; pulling past the top rubber-bands; the settle uses the iOS drawer
// curve. Two detents: peek (the newest sign) and full.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type Detent = "peek" | "full";

const IOS = "cubic-bezier(.32,.72,0,1)";
const PEEK_PX = 148; // enough for the newest sign's head + "ask next"

function project(v: number): number {
  const d = 0.998;
  return (v / 1000) * (d / (1 - d));
}
function rubber(overshoot: number, dim: number): number {
  const c = 0.55;
  return (overshoot * dim * c) / (dim + c * Math.abs(overshoot));
}

export function Sheet({
  children,
  head,
  detent,
  onDetent,
}: {
  children: React.ReactNode;
  head: React.ReactNode;
  detent: Detent;
  onDetent: (d: Detent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0); // sheet height
  const drag = useRef<{ y0: number; t0: number; base: number; last: number; lastT: number; active: boolean } | null>(null);
  const [y, setY] = useState<number | null>(null); // translateY while dragging
  const [animating, setAnimating] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setH(el.getBoundingClientRect().height); // measure now, so the first paint already sits at the peek
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rest = useCallback((d: Detent) => (d === "full" ? 0 : Math.max(0, h - PEEK_PX)), [h]);

  const settle = useCallback(
    (d: Detent) => {
      setAnimating(true);
      setY(null);
      onDetent(d);
      window.setTimeout(() => setAnimating(false), 420);
    },
    [onDetent],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Let buttons inside the head work as buttons.
    if (target.closest("button, a, input, select")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, t0: performance.now(), base: rest(detent), last: e.clientY, lastT: performance.now(), active: true };
    setAnimating(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active) return;
    const dy = e.clientY - d.y0;
    let next = d.base + dy;
    if (next < 0) next = rubber(next, h); // pulled past the top
    const max = Math.max(0, h - PEEK_PX);
    if (next > max) next = max + rubber(next - max, h);
    d.last = e.clientY;
    d.lastT = performance.now();
    setY(next);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active) return;
    d.active = false;
    const dt = Math.max(1, performance.now() - d.lastT);
    const v = ((e.clientY - d.last) / dt) * 1000; // px per second, from the last move
    const current = y ?? rest(detent);
    const projected = current + project(v);
    const full = 0;
    const peek = Math.max(0, h - PEEK_PX);
    const nearest: Detent = Math.abs(projected - full) < Math.abs(projected - peek) ? "full" : "peek";
    settle(nearest);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detent === "full") settle("peek");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detent, settle]);

  const ty = y ?? rest(detent);
  return (
    <div
      ref={ref}
      className={`sheet ${detent}${y !== null ? " dragging" : ""}`}
      style={{
        transform: `translateY(${ty}px)`,
        transition: y !== null ? "none" : `transform 420ms ${IOS}`,
      }}
      aria-expanded={detent === "full"}
      data-animating={animating || undefined}
    >
      <div className="sheet-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-head-row" onClick={() => settle(detent === "full" ? "peek" : "full")}>
          {head}
        </div>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}
