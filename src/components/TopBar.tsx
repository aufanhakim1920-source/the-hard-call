import { useLayoutEffect, useRef, useState } from "react";
import type { AssistantState } from "../lib/types";
import { actions, useStore } from "../lib/store";
import { play } from "../lib/sfx";
import { AccountChip } from "./Account";

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
    if (el) setInk({ left: el.offsetLeft + 12, width: Math.max(0, el.offsetWidth - 24) });
  }, [view, openDeadlines, store.lessons.length]);
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
        title={store.settings.sound ? "Sounds on" : "Sounds off"}
      >
        {store.settings.sound ? "Sound on" : "Sound off"}
      </button>
    </header>
  );
}
