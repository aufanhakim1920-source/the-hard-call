import { useLayoutEffect, useRef, useState } from "react";
import type { AssistantState } from "../lib/types";
import { actions, useStore } from "../lib/store";
import { play } from "../lib/sfx";
import { AccountChip } from "./Account";
import { AccessibilityPanel } from "./Accessibility";
import "./topbar.css";

export type View = "live" | "calls" | "practice" | "deadlines" | "lessons" | "about";

/**
 * The The Hard Call mark: a swallowtail flag knocked out of a disc.
 *
 * It lives at 20px in the bar and 16px in the tab, and on a phone the wordmark
 * is hidden entirely, so below 940px this is the whole brand. Every feature is
 * drawn at 6 units or more of the 64 viewBox — 1.5px at 16px — because the old
 * triangle's exclamation was 4.8 and vanished. Colours come from brand.css so
 * they answer the ground; a fill attribute here could not.
 */
export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
      <circle className="disc" cx="32" cy="32" r="29" />
      <path className="flag" d="M17 12h6v40h-6z" />
      <path className="flag" d="M17 18h30l-10 7.5 10 7.5H17z" />
    </svg>
  );
}

export function TopBar({ view, onView, assistant }: { view: View; onView: (v: View) => void; assistant: AssistantState }) {
  const store = useStore();
  const openDeadlines = store.deadlines.filter((d) => !d.done).length;
  const tabs: { id: View; label: string; count?: number }[] = [
    { id: "live", label: "Live call" },
    // Next to Live because it is where the card from the last call goes. Before
    // this tab existed, navigating away from a report card lost it for good.
    { id: "calls", label: "Calls", count: store.reports.length },
    { id: "practice", label: "Practice" },
    { id: "deadlines", label: "Deadlines", count: openDeadlines },
    { id: "lessons", label: "Lessons", count: store.lessons.length },
    { id: "about", label: "About" },
  ];
  const stateText = assistant === "thinking" ? "Listening" : assistant === "paused" ? "Assistant paused, retrying" : "Assistant ready";
  const navRef = useRef<HTMLElement>(null);
  const [ink, setInk] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = navRef.current?.querySelector(".tab.on") as HTMLElement | null;
    if (el) {
      setInk({ left: el.offsetLeft + 12, width: Math.max(0, el.offsetWidth - 24) });
      // On a phone the strip scrolls; bring the chosen tab fully into view.
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }, [view, openDeadlines, store.lessons.length, store.reports.length]);

  // The call screen sizes itself as viewport minus the bar, and it used to
  // subtract a fixed 56px. The bar is TWO rows below 980px and taller again at
  // the largest text, so the call screen was up to 34px too tall and pushed its
  // own header off the top — measured, the call header sat at -32.
  //
  // Publish the MEASURED height as its own variable, never back into --topbar:
  // the bar's own height is set from --topbar, so writing the measurement there
  // makes the bar define its own size from its own size. It latched at 90px and
  // stayed there even at 1440 where the bar is one row.
  const barRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty("--bar-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A cut-off tab must read as "there is more", not as broken. The edge fades
  // only on the side that actually has hidden tabs.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const mark = () => {
      const more = el.scrollWidth - el.clientWidth;
      el.dataset.edge = more < 2 ? "none" : el.scrollLeft < 2 ? "right" : el.scrollLeft > more - 2 ? "left" : "both";
    };
    mark();
    el.addEventListener("scroll", mark, { passive: true });
    const ro = new ResizeObserver(mark);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", mark);
      ro.disconnect();
    };
    // The observer catches the strip changing WIDTH; it does not catch the strip
    // changing CONTENT. A count badge appearing on Lessons, or Calls going from
    // 9 to 10, widens scrollWidth inside an unchanged box — and the fade would
    // still be describing the tabs from two calls ago. Same dependencies as the
    // ink, for the same reason.
  }, [tabs.length, openDeadlines, store.lessons.length, store.reports.length]);
  return (
    <header className="topbar" ref={barRef}>
      <div className="wordmark">
        <Mark />
        The Hard Call
      </div>
      <nav className="tabs" aria-label="Sections" ref={navRef}>
        {/* Not rendered until it has been measured. The ink's width is
            transitioned over 340ms, and a transition frozen in a throttled tab
            holds the FIRST value — measured on a backgrounded load, width 0,
            which left the underline missing and "which section am I in" carried
            by the tab's colour alone. Mounting it already placed skips that: a
            transition never runs on an element's first style, so it appears
            where it belongs and only later MOVES animate. */}
        {ink.width > 0 && <span className="tab-ink" style={{ transform: `translateX(${ink.left}px)`, width: ink.width }} aria-hidden="true" />}
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"tab" + (view === t.id ? " on" : "")}
            // The underline and the colour say which section is open; neither
            // reaches a screen reader, so without this the tab strip announces
            // six identical buttons.
            aria-current={view === t.id ? "page" : undefined}
            onClick={() => {
              play("tap");
              onView(t.id);
            }}
          >
            {t.label}
            {t.count ? <span className="count">{t.count}</span> : null}
          </button>
        ))}
      </nav>
      <div className="spacer" />
      <AccessibilityPanel view={view} />
      <AccountChip />
      <span className={"status-dot " + assistant} title={stateText}>
        <i />
        <span className="small">{stateText}</span>
      </span>
      <button
        className="btn ghost sm"
        onClick={() => {
          actions.setSound(!store.settings.sound);
          if (!store.settings.sound) play("tap");
        }}
        aria-pressed={store.settings.sound}
        aria-label={store.settings.sound ? "Sound on" : "Sound off"}
        title={store.settings.sound ? "Sounds on" : "Sounds off"}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
          {store.settings.sound ? <path d="M16 9.2a4 4 0 0 1 0 5.6M18.7 6.6a7.6 7.6 0 0 1 0 10.8" /> : <path d="m16.5 9.5 5 5m0-5-5 5" />}
        </svg>
        <span className="btn-label">{store.settings.sound ? "Sound on" : "Sound off"}</span>
      </button>
    </header>
  );
}
