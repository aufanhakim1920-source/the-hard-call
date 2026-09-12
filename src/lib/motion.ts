// The two pieces of motion CSS cannot do on its own.
//
// 1. An EXIT. React removes a `{open && …}` child on the same frame the state
//    flips, so by the time a transition could run there is no element left to
//    run it on. Everything in this build opened with motion and closed by
//    vanishing. `useExit` holds the node for one leave and says which half of
//    the transition it is in.
//
// 2. A REORDER. A row that moves because the list re-sorted is re-laid-out,
//    not moved, so no transition fires — ticking a deadline teleported it to
//    the bottom. `useFlip` records where every row was, lets React paint the
//    new order, then plays the difference backwards (First, Last, Invert,
//    Play). It also gives a genuinely new row its arrival.
//
// Both check `motionOff()` themselves: the `.reduce-motion` rule squashes CSS
// durations to 1ms, and that override does not reach the Web Animations API.
//
// An exit may animate opacity — the element is leaving, so a frozen animation
// costs it nothing it was not about to lose. An ENTRANCE may not; see the
// vault note "An Entrance Must Not Gate Visibility".

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motionOff } from "./a11y";

/** Durations, taken off this build's existing motion rather than invented:
 *  a row moving to a new place travels like the tab underline (340ms), and a
 *  row arriving rises like a view (260ms). An exit is shorter than its own
 *  entrance, because waiting on something you have already dismissed is the
 *  part that feels slow. */
const MOVE = 340;
const ENTER = 260;
const EASE = "cubic-bezier(.23,1,.32,1)"; // --ease-out

/**
 * Where every row in `el` currently sits.
 *
 * offsetTop, not getBoundingClientRect: the two measurements are taken in
 * different commits, and a rect moves when the page is scrolled between them —
 * which would fling the whole list on an ordinary scroll.
 */
function measure(el: HTMLElement): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of el.querySelectorAll<HTMLElement>("[data-flip]")) m.set(String(row.dataset.flip), row.offsetTop);
  return m;
}

/**
 * Keep a node mounted while it leaves.
 *
 * The state it follows is NOT delayed: the caller still flips `open` on the
 * click, focus still goes back on the same frame, and only the DOM node
 * lingers. Use it as `{mounted && <div className={leaving ? "x is-leaving" : "x"}>}`.
 */
export function useExit(open: boolean, ms = 160): { mounted: boolean; leaving: boolean } {
  const [seen, setSeen] = useState(open);
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);

  // Adjusted during render, not in an effect: the node has to be mounted on
  // the same frame the switch opens, and there must be no frame in between.
  if (open !== seen) {
    setSeen(open);
    if (open) {
      setMounted(true);
      setLeaving(false);
    } else if (mounted) {
      if (motionOff()) setMounted(false);
      else setLeaving(true);
    }
  }

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, ms);
    return () => window.clearTimeout(t);
  }, [leaving, ms]);

  return { mounted, leaving };
}

/**
 * Animate a list's rows from where they were to where they are.
 *
 * Put the returned ref on the container and `data-flip={id}` on every row.
 * Pass whatever the order depends on as `key` so the measurement happens on
 * the same commit as the change.
 */
export function useFlip<T extends HTMLElement>(key: unknown) {
  const box = useRef<T>(null);
  const seen = useRef<Map<string, number> | null>(null);

  // A row can also move for reasons that are not a reorder — a bigger text
  // size, a narrower window, the phone breakpoint restacking the grid. Those
  // are not moves to animate, so re-record the positions and animate nothing.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      seen.current = measure(el);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-flip]"));
    const now = measure(el);

    const was = seen.current;
    seen.current = now;
    // The first paint of a list is not a change. Rows arriving with the page
    // is motion nobody asked for.
    if (!was || motionOff()) return;

    for (const row of rows) {
      const k = String(row.dataset.flip);
      const from = was.get(k);
      const to = now.get(k) as number;
      // Two changes in quick succession must not leave two transforms on one
      // row fighting over it. The id is what makes a flip findable later.
      for (const old of row.getAnimations()) if (old.id === "flip") old.cancel();
      if (from === undefined) {
        row.animate([{ transform: "translateY(10px)" }, { transform: "none" }], { duration: ENTER, easing: EASE, id: "flip" });
      } else if (Math.abs(from - to) > 0.5) {
        // Move further than your own height and you are passing other rows,
        // not closing ranks with them — so the traveller is lifted for the
        // trip and put back down. Without it the two rows' words draw on top
        // of each other for a third of a second and neither can be read.
        const far = Math.abs(from - to) > row.offsetHeight;
        if (far) row.classList.add("is-moving");
        const a = row.animate([{ transform: `translateY(${from - to}px)` }, { transform: "none" }], { duration: MOVE, easing: EASE, id: "flip" });
        if (far) {
          // Put it down on whichever comes first. A tab that is not painting
          // never advances the animation, so `finished` can hang for as long as
          // the throttling lasts, and a row left permanently lifted is a
          // visible bug — the timer backs it up. The sequence number stops an
          // old trip putting down a row that has since set off again.
          const seq = String(Number(row.dataset.flipSeq ?? 0) + 1);
          row.dataset.flipSeq = seq;
          const down = () => {
            if (row.dataset.flipSeq === seq) row.classList.remove("is-moving");
          };
          void a.finished.then(down).catch(down);
          window.setTimeout(down, MOVE + 60);
        }
      }
    }
  }, [key]);

  return box;
}

/**
 * Play a row out, then remove it.
 *
 * The row cannot animate away after it is gone from the store, so the store
 * write waits for the exit — 200ms, and instant when motion is off. The rows
 * below then close the gap under `useFlip`, so a removal reads as two moves:
 * the row leaves, the list heals.
 */
export function useRowExit(ms = 200) {
  const [leaving, setLeaving] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const remove = (id: string, done: () => void) => {
    if (leaving) return; // a second click on a row already on its way out
    if (motionOff()) {
      done();
      return;
    }
    setLeaving(id);
    timer.current = window.setTimeout(() => {
      done();
      setLeaving(null);
    }, ms);
  };

  return { leaving, remove };
}
