import { useLayoutEffect, useRef, useState } from "react";
import type { AssistantState } from "../lib/types";
import { actions, useStore } from "../lib/store";
import { play } from "../lib/sfx";
import { AccountChip } from "./Account";
import { AccessibilityPanel } from "./Accessibility";

export type View = "live" | "practice" | "deadlines" | "lessons" | "about";

export function Mark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 8 L58 54 H6 Z" fill="#C79C5A" />
      <rect x="29.6" y="24" width="4.8" height="15" rx="1.6" fill="#1C1F24" />
      <circle cx="32" cy="46" r="2.8" fill="#1C1F24" />
    </svg>
  );
}

export function TopBar({ view, onView, assistant }: { view: View; onView: (v: View) => void; assistant: AssistantState }) {
  const store = useStore();
  const openDeadlines = store.deadlines.filter((d) => !d.done).length;
  const tabs: { id: View; label: string; count?: number }[] = [
    { id: "live", label: "Live call" },
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
  }, [view, openDeadlines, store.lessons.length]);

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
  }, [tabs.length]);
  return (
    <header className="topbar">
      <div className="wordmark">
        <Mark />
        The Hard Call
      </div>
      <nav className="tabs" aria-label="Sections" ref={navRef}>
        <span className="tab-ink" style={{ transform: `translateX(${ink.left}px)`, width: ink.width }} aria-hidden="true" />
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"tab" + (view === t.id ? " on" : "")}
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
      <AccessibilityPanel />
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
