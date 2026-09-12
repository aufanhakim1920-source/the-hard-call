// One listbox for every picker in the app.
//
// A native <select> opens the operating system's own list — a system popup no
// stylesheet reaches, with no relationship to the palette and no motion at all.
// This is the same control drawn in the app's own vocabulary (hairline surface,
// a 2px gold leading edge on the chosen row, the iOS-family ease already used by
// the bottom sheet), with the keyboard behaviour the native one gives for free
// written out by hand against the ARIA combobox pattern.
//
// Four decisions worth the words:
//
//   1. The entrance animates TRANSFORM only. A running animation whose clock is
//      frozen in a throttled tab pins the element at its `from` keyframe and
//      beats the element's own opacity, so `from { opacity: 0 }` would leave the
//      popup permanently invisible. The exit may fade — it is on its way out.
//   2. The popup is position: fixed, measured off the trigger, and portalled to
//      <body>. Nothing an ancestor does with overflow can clip it and opening it
//      never changes the width of the page. The portal is not belt-and-braces:
//      `.view` carries a translateY entrance, and ANY transformed ancestor
//      becomes the containing block for a fixed child — measured here at 89px
//      off, because a throttled tab left that entrance frozen mid-animation.
//   3. aria-controls is set only while the list is on screen. A combobox that
//      points at an id nothing owns is worse than one that points at nothing.
//   4. Every key the trigger handles stops propagating. The call screen listens
//      on window for H / E / T and only skips INPUT, TEXTAREA and SELECT — this
//      trigger is a BUTTON, so typing "e" here would otherwise end the call.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motionOff } from "../lib/a11y";
import { play } from "../lib/sfx";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** The accessible name — none of these pickers has a visible <label>. */
  label: string;
  className?: string;
}

interface Place {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  up: boolean;
}

const GAP = 6; // between the trigger and the popup
const EDGE = 8; // never closer than this to the window edge
const MIN_DROP = 168; // below this much room, prefer opening upward
const SHUT_MS = 130; // matches the closing animation in styles.css

const same = (a: Place, b: Place) =>
  a.left === b.left && a.width === b.width && a.top === b.top && a.bottom === b.bottom && a.maxHeight === b.maxHeight && a.up === b.up;

export function Select({ value, onChange, options, label, className }: SelectProps) {
  const uid = useId();
  const listId = uid + "-list";
  const optId = (i: number) => uid + "-o" + i;

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [active, setActive] = useState(0);

  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const shutTimer = useRef(0);
  const typed = useRef({ q: "", at: 0 });

  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  /** Where the popup goes, in viewport coordinates. Read fresh every time. */
  const measure = useCallback((): Place | null => {
    const el = trigger.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // clientWidth, not innerWidth: innerWidth includes the scrollbar, and a
    // popup placed under it would push the page sideways.
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const width = Math.min(Math.max(r.width, 150), vw - EDGE * 2);
    const left = Math.min(Math.max(r.left, EDGE), vw - EDGE - width);
    const below = vh - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    const up = below < MIN_DROP && above > below;
    return up
      ? { left, width, bottom: vh - r.top + GAP, maxHeight: Math.max(96, above), up }
      : { left, width, top: r.bottom + GAP, maxHeight: Math.max(96, below), up };
  }, []);

  const show = useCallback(
    (index: number) => {
      setActive(Math.max(0, Math.min(index, options.length - 1)));
      setPlace(measure());
      window.clearTimeout(shutTimer.current);
      setClosing(false);
      setOpen(true);
    },
    [measure, options.length],
  );

  // Closing animates too: an instant close after an animated open reads worse
  // than neither. The popup stays mounted, inert, until the animation is done.
  const hide = useCallback(
    (refocus: boolean) => {
      if (!open) return;
      setOpen(false);
      setClosing(true);
      window.clearTimeout(shutTimer.current);
      shutTimer.current = window.setTimeout(() => setClosing(false), motionOff() ? 0 : SHUT_MS);
      if (refocus) trigger.current?.focus();
    },
    [open],
  );

  const commit = useCallback(
    (i: number) => {
      const opt = options[i];
      if (opt) {
        if (opt.value !== value) onChange(opt.value);
        play("tap");
      }
      hide(true);
    },
    [options, onChange, value, hide],
  );

  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    const cur = open ? active : selected;
    const stop = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    switch (e.key) {
      case "ArrowDown":
        stop();
        if (!open) show(e.altKey ? cur : Math.min(cur + 1, last));
        else setActive(Math.min(cur + 1, last));
        return;
      case "ArrowUp":
        stop();
        if (e.altKey && open) hide(true);
        else if (!open) show(Math.max(cur - 1, 0));
        else setActive(Math.max(cur - 1, 0));
        return;
      case "Home":
        stop();
        if (!open) show(0);
        else setActive(0);
        return;
      case "End":
        stop();
        if (!open) show(last);
        else setActive(last);
        return;
      case "Enter":
      case " ":
        // These pickers live inside <form>s — Enter must never submit one.
        stop();
        if (open) commit(active);
        else show(selected);
        return;
      case "Escape":
        if (open) {
          stop();
          hide(true);
        }
        return;
      case "Tab":
        // No preventDefault: focus is meant to move on.
        if (open) hide(false);
        return;
      default:
        break;
    }
    // Typeahead. A second letter within 600ms extends the search instead of
    // starting a new one, so "wo" finds "Worker" rather than cycling the Ws.
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    stop();
    const now = Date.now();
    const q = (now - typed.current.at < 600 ? typed.current.q : "") + e.key.toLowerCase();
    typed.current = { q, at: now };
    const n = options.length;
    const from = q.length === 1 ? cur + 1 : cur;
    for (let k = 0; k < n; k++) {
      const i = (from + k + n) % n;
      if (options[i].label.toLowerCase().startsWith(q)) {
        if (open) setActive(i);
        else show(i);
        return;
      }
    }
  };

  // Keep the highlighted row in view when the arrows run past the fold.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const outside = (ev: Event) => {
      const t = ev.target as Node;
      if (trigger.current?.contains(t) || pop.current?.contains(t)) return;
      hide(false);
    };
    // Escape has to work even when focus has drifted off the trigger. The
    // trigger's own handler stops propagation, so this never fires twice.
    const esc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") hide(true);
    };
    window.addEventListener("mousedown", outside);
    window.addEventListener("touchstart", outside, { passive: true });
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", outside);
      window.removeEventListener("touchstart", outside);
      window.removeEventListener("keydown", esc);
    };
  }, [open, hide]);

  // Re-anchor every frame while it is open. Scroll and resize listeners are not
  // enough: the trigger also moves under a view's entrance animation, a sheet
  // drag, or a line arriving in the transcript — opening a picker during the
  // page's own 260ms entrance put the popup 7px out of place. setPlace keeps the
  // previous object when nothing moved, so a still page costs no re-render.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const next = measure();
      if (next) setPlace((prev) => (prev && same(prev, next) ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, measure]);

  useEffect(() => () => window.clearTimeout(shutTimer.current), []);

  return (
    <span className={"sel" + (className ? " " + className : "")} data-open={open ? "true" : "false"}>
      <button
        ref={trigger}
        type="button"
        className="sel-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optId(active) : undefined}
        aria-label={label}
        onClick={() => (open ? hide(true) : show(selected))}
        onKeyDown={onKey}
      >
        <span className="sel-label-box">
          <span className="sel-value">{options[selected]?.label ?? ""}</span>
          {/* Holds the column open at the widest option, so choosing a shorter
              one does not make the button jump narrower under the pointer. */}
          <span className="sel-sizer" aria-hidden="true">
            {options.map((o) => (
              <span key={o.value}>{o.label}</span>
            ))}
          </span>
        </span>
        <span className="sel-caret" aria-hidden="true" />
      </button>

      {(open || closing) &&
        place &&
        createPortal(
          <div
            ref={pop}
            className={"sel-pop" + (place.up ? " up" : "") + (closing ? " closing" : "")}
            style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
            aria-hidden={closing ? true : undefined}
          >
            <ul ref={list} id={listId} className="sel-list" role="listbox" aria-label={label}>
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={optId(i)}
                  data-i={i}
                  role="option"
                  aria-selected={o.value === value}
                  className={"sel-opt" + (i === active ? " on" : "") + (o.value === value ? " is" : "")}
                  style={{ ["--d" as string]: i }}
                  onMouseMove={() => setActive(i)}
                  onClick={() => commit(i)}
                >
                  {o.label}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </span>
  );
}
