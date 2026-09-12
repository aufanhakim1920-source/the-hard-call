// The accessibility panel, reachable from the top bar on every screen.
// Each switch says what it does in plain words, and the risky one says why.

import { useEffect, useRef, useState } from "react";
import { announce, setA11y, stopSpeaking, useA11y } from "../lib/a11y";
import { play } from "../lib/sfx";

function Switch({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      className={"a11y-row" + (on ? " on" : "")}
      role="switch"
      aria-checked={on}
      onClick={() => {
        onChange(!on);
        play("tap");
      }}
    >
      <span className="a11y-track" aria-hidden="true">
        <span className="a11y-knob" />
      </span>
      <span className="a11y-text">
        <b>{label}</b>
        <span className="small muted">{hint}</span>
      </span>
    </button>
  );
}

export function AccessibilityPanel() {
  const a = useA11y();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="acct" ref={panel}>
      <button
        className={"btn ghost sm" + (open ? " on" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Accessibility options"
        title="Accessibility"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
          <path d="M4 8h16M12 8v5m0 0-3.5 7M12 13l3.5 7" strokeLinecap="round" />
        </svg>
        <span className="a11y-chip-label">Access</span>
      </button>
      {open && (
        <div className="acct-panel a11y-panel" role="dialog" aria-label="Accessibility">
          <div className="label">Accessibility</div>
          <p className="small muted" style={{ margin: "4px 0 10px" }}>
            Saved on this device. The app already follows your system's reduced-motion setting.
          </p>
          <Switch on={a.bigText} onChange={(v) => setA11y({ bigText: v })} label="Bigger text" hint="Larger words on the call and the signs" />
          <Switch
            on={a.highContrast}
            onChange={(v) => setA11y({ highContrast: v })}
            label="Higher contrast"
            hint="Stronger text and edges, no other change to the colours"
          />
          <Switch on={a.reduceMotion} onChange={(v) => setA11y({ reduceMotion: v })} label="Less motion" hint="Signs and pages appear without sliding" />
          <Switch on={a.underlineLinks} onChange={(v) => setA11y({ underlineLinks: v })} label="Underline links" hint="So a link is never colour alone" />
          <Switch
            on={a.announce}
            onChange={(v) => setA11y({ announce: v })}
            label="Announce signs"
            hint="A screen reader reads each new sign as it appears"
          />
          <Switch
            on={a.speak}
            onChange={(v) => {
              setA11y({ speak: v });
              if (!v) stopSpeaking();
            }}
            label="Read signs aloud"
            hint="⚠ On a headset the customer may hear it. Off unless you need it."
          />
          <button
            className="btn sm"
            style={{ marginTop: 10 }}
            onClick={() => announce("Accessibility test. This is how a new sign will be announced.", true)}
          >
            Test an announcement
          </button>
        </div>
      )}
    </div>
  );
}

/** The two live regions. Rendered once, near the top of the app. */
export function LiveRegions({ politeRef, urgentRef }: { politeRef: React.Ref<HTMLParagraphElement>; urgentRef: React.Ref<HTMLParagraphElement> }) {
  return (
    <>
      <p ref={politeRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      <p ref={urgentRef} className="sr-only" aria-live="assertive" aria-atomic="true" />
    </>
  );
}
