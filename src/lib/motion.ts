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
 * Pick a row up for its trip, and put it down again.
 *
 * The lift is a class — a ground, a layer, and full opacity. The trap is that
 * the rows it is applied to ALREADY transition the very property the lift
 * changes: a ticked deadline transitions `opacity`, a practice card
 * transitions `background`. So adding the class does not set the property, it
 * starts a CSS TRANSITION towards it — and a running transition outranks every
 * rule in the stylesheet, `!important` included.
 *
 * Measured before this: the carried deadline row reported opacity 0.45 at 0,
 * 85, 170, 255 and 340ms of its own 340ms trip — see-through for the whole
 * journey, which is the exact thing the lift exists to prevent. Worse in a tab
 * that is not painting, where the transition never advances off its first
 * frame and the row travels at 0.45 for as long as the throttling lasts.
 *
 * So the carry is taken out of the transition's hands. Nothing interpolates
 * while a row is in the air; the transitions come back when it lands, which is
 * where the dimming belonged in the first place.
 */
function lift(row: HTMLElement) {
  row.style.transition = "none";
  row.classList.add("is-moving");
}
function drop(row: HTMLElement) {
  row.classList.remove("is-moving");
  // Cleared AFTER the class, so the style the browser settles on is the one
  // with the transition in it and the row dims where it landed.
  row.style.transition = "";
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

    // Every delta first, because whether a row PASSES anyone is a fact about
    // the list, not about that row. Rows closing the gap after a removal all
    // travel the same way and never cross; a re-sort sends one row against the
    // traffic, and that one is the only one that needs carrying.
    const moves = rows.map((row) => {
      const k = String(row.dataset.flip);
      const from = was.get(k);
      const to = now.get(k) as number;
      return { row, from, d: from === undefined ? 0 : from - to };
    });
    const travelling = moves.filter((m) => m.from !== undefined && Math.abs(m.d) > 0.5);
    const sinking = travelling.filter((m) => m.d < -0.5);
    const rising = travelling.filter((m) => m.d > 0.5);
    const opposed = sinking.length > 0 && rising.length > 0;
    // Which one is the row the click moved? The one going AGAINST the traffic.
    // A re-sort displaces exactly one row and everybody else shifts a single
    // place to close the gap it left, so the minority direction is the
    // traveller — and it works for "Reopen", where the moving row goes up and
    // the majority goes down. Only it is carried: two carried rows on the same
    // layer would cover each other anyway.
    const against = opposed ? (sinking.length <= rising.length ? sinking : rising) : travelling;
    const lead = against.reduce<(typeof travelling)[number] | null>((a, b) => (a && Math.abs(a.d) >= Math.abs(b.d) ? a : b), null);
    // Own height was the only test before, which misses the commonest case of
    // all: two neighbours swapping travel exactly one row each, cross in the
    // middle, and were both left see-through for the whole trip.
    const carried = lead && (opposed || Math.abs(lead.d) > lead.row.offsetHeight) ? lead.row : null;

    for (const { row, from, d } of moves) {
      // Two changes in quick succession must not leave two transforms on one
      // row fighting over it. The id is what makes a flip findable later.
      for (const old of row.getAnimations()) if (old.id === "flip") old.cancel();
      if (from === undefined) {
        row.animate([{ transform: "translateY(10px)" }, { transform: "none" }], { duration: ENTER, easing: EASE, id: "flip" });
      } else if (Math.abs(d) > 0.5) {
        if (row === carried) lift(row);
        const a = row.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], { duration: MOVE, easing: EASE, id: "flip" });
        if (row === carried) {
          // Put it down on whichever comes first. A tab that is not painting
          // never advances the animation, so `finished` can hang for as long as
          // the throttling lasts, and a row left permanently lifted is a
          // visible bug — the timer backs it up. The sequence number stops an
          // old trip putting down a row that has since set off again.
          const seq = String(Number(row.dataset.flipSeq ?? 0) + 1);
          row.dataset.flipSeq = seq;
          const down = () => {
            if (row.dataset.flipSeq === seq) drop(row);
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
