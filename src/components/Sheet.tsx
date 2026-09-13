// A bottom sheet for the phone. The signs live in it during a call.
//
// Physics from the apple-design notes in the vault: the drag follows the
// finger 1:1, release projects the momentum (v/1000 * d/(1-d), d = 0.998)
// and snaps to the detent nearest the PROJECTED endpoint, not the release
// point; pulling past the top rubber-bands; the settle uses the iOS drawer
// curve. Two detents: peek (the newest sign) and full.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./sheet.css";

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
  // Whether a frame has been painted yet, and the only thing it gates is the
  // transition. See the comment on the style below.
  const [painted, setPainted] = useState(false);
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

  // How much room the sheet is allowed at all.
  //
  // The sheet is z-30 and the call header is a sticky z-31 that outranks it —
  // deliberately, so the sheet can never cover "End call". At full, though, the
  // sheet's own top landed UNDER that header: measured on a 375x812 phone, 41
  // of the head's 72px were hidden and elementFromPoint at the head's centre
  // returned the header, so the only control that collapses the sheet was not
  // clickable where it looks clickable. It happened the instant a legal sign
  // fired, because that is when the sheet lifts itself to full.
  //
  // The sheet is CAPPED rather than pushed down. Pushing it moves its bottom
  // below the viewport by the same amount — 161px of the scroll area went off
  // the bottom of the screen and could not be reached at all.
  //
  // Both numbers come from OUTSIDE the sheet — the window and the header — so
  // nothing here is measured from the thing it then sizes.
  const [cap, setCap] = useState(0);
  useLayoutEffect(() => {
    const read = () => {
      const above = document.querySelector(".call-head");
      const top = above ? above.getBoundingClientRect().bottom : 0;
      setCap(Math.max(240, Math.round(window.innerHeight - top)));
    };
    read();
    const above = document.querySelector(".call-head");
    const ro = new ResizeObserver(read);
    if (above) ro.observe(above);
    window.addEventListener("resize", read);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", read);
    };
  }, []);

  // The cap applied in the SAME render, not one ResizeObserver callback later.
  // An observer needs a frame, and a tab that is not painting never gives it
  // one: measured, the sheet kept the uncapped 666px height and rested at
  // translateY(518) inside a 538px box, which put its top at 792 of an 812px
  // screen — the whole sheet off the bottom. Everything below reads the
  // clamped height, so the resting place is right on the first commit.
  const box = cap > 0 ? Math.min(h || cap, cap) : h;

  // After the paint, never before it: a layout effect would run in the same
  // commit that first moves the sheet, and the transition would own that move.
  // The render this schedules changes no transform, so it starts nothing.
  useEffect(() => {
    if (box > 0 && !painted) setPainted(true);
  }, [box, painted]);

  const rest = useCallback((d: Detent) => (d === "full" ? 0 : Math.max(0, box - PEEK_PX)), [box]);

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
    if (next < 0) next = rubber(next, box); // pulled past the top
    const max = Math.max(0, box - PEEK_PX);
    if (next > max) next = max + rubber(next - max, box);
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
    const peek = Math.max(0, box - PEEK_PX);
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
        maxHeight: cap ? `${cap}px` : undefined,
        transform: `translateY(${ty}px)`,
        // The sheet mounts already placed, with NO transition on the first
        // commit.
        //
        // Its height is measured after the first render, so the resting offset
        // went 0 -> 518px one commit later — a CHANGE, which the 420ms
        // transition then owned. A transition that never advances holds its
        // first value, so on a throttled load the sheet sat at translateY(0):
        // measured, top 243 instead of 664, covering the transcript, Listen and
        // the type row. On a phone that is the entire call screen gone, and
        // reduce-motion does not save it because even 1ms needs one frame.
        //
        // A transition never runs on an element's FIRST style, only on a later
        // change — so the fix is to make the placed position the first style
        // the element ever has. Dragging still bypasses it, and every real
        // detent change after that animates normally.
        transition: y !== null || !painted ? "none" : `transform 420ms ${IOS}`,
      }}
      data-animating={animating || undefined}
    >
      <div className="sheet-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="sheet-handle" aria-hidden="true" />
        {/* A real button, not a div with a click handler. On a phone this head is
            the ONLY way into the sheet, and every sign lives inside it — so a
            keyboard user had no route to the signs at all, and a screen reader
            was told "expanded" by an element it could not operate. */}
        <button
          type="button"
          className="sheet-head-row"
          onClick={() => settle(detent === "full" ? "peek" : "full")}
          aria-expanded={detent === "full"}
          aria-label={detent === "full" ? "Collapse the signs" : "Expand the signs"}
        >
          {head}
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}
