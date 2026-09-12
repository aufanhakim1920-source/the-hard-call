// The accessibility panel. Every control says what it does in plain words,
// and the one with a cost says what the cost is.

import { useEffect, useRef, useState } from "react";
import { TEXT_SIZE_LABELS, announce, changedCount, resetA11y, setA11y, stopSpeaking, useA11y, type TextSize } from "../lib/a11y";
import { play } from "../lib/sfx";

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
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

function Segmented({
  value,
  options,
  onChange,
  label,
  hint,
}: {
  value: number;
  options: string[];
  onChange: (i: number) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="a11y-seg-wrap">
      <div className="a11y-text">
        <b>{label}</b>
        <span className="small muted">{hint}</span>
      </div>
      <div className="a11y-seg" role="radiogroup" aria-label={label}>
        {options.map((o, i) => (
          <button
            key={o}
            role="radio"
            aria-checked={i === value}
            className={i === value ? "on" : ""}
            onClick={() => {
              onChange(i);
              play("tap");
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AccessibilityPanel() {
  const a = useA11y();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const changed = changedCount();

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
        aria-label={`Accessibility options${changed ? `, ${changed} changed` : ""}`}
        title="Accessibility"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
          <path d="M4 8h16M12 8v5m0 0-3.5 7M12 13l3.5 7" strokeLinecap="round" />
        </svg>
        <span className="a11y-chip-label">Access</span>
        {changed > 0 && <span className="count">{changed}</span>}
      </button>
      {open && (
        <div className="acct-panel a11y-panel" role="dialog" aria-label="Accessibility">
          <div className="a11y-head">
            <div className="label">Accessibility</div>
            {changed > 0 && (
              <button
                className="btn ghost sm"
                onClick={() => {
                  resetA11y();
                  stopSpeaking();
                  play("tap");
                }}
              >
                Reset
              </button>
            )}
          </div>
          <p className="small muted" style={{ margin: "2px 0 12px" }}>
            Saved on this device. Your system's reduced-motion and colour settings are followed already.
          </p>

          <div className="label a11y-group">Reading</div>
          <Segmented
            label="Text size"
            hint="The words of the call and the signs"
            value={a.textSize}
            options={TEXT_SIZE_LABELS}
            onChange={(i) => setA11y({ textSize: i as TextSize })}
          />
          <Switch on={a.lineSpacing} onChange={(v) => setA11y({ lineSpacing: v })} label="More line spacing" hint="Looser lines and letters, easier to track" />
          <Switch
            on={a.hyperFont}
            onChange={(v) => setA11y({ hyperFont: v })}
            label="Hyperlegible typeface"
            hint="Atkinson Hyperlegible — letters drawn to be told apart"
          />

          <div className="label a11y-group">Seeing</div>
          <Segmented
            label="Ground"
            hint="Dark for a call centre, light for glare"
            value={a.theme === "light" ? 1 : 0}
            options={["Dark", "Light"]}
            onChange={(i) => setA11y({ theme: i === 1 ? "light" : "dark" })}
          />
          <Switch on={a.highContrast} onChange={(v) => setA11y({ highContrast: v })} label="Higher contrast" hint="Stronger text and edges; the hues do not change" />
          <Switch on={a.reduceTransparency} onChange={(v) => setA11y({ reduceTransparency: v })} label="Reduce transparency" hint="Solid panels instead of blur" />
          <Switch on={a.underlineLinks} onChange={(v) => setA11y({ underlineLinks: v })} label="Underline links" hint="So a link is never colour alone" />

          <div className="label a11y-group">Moving and touching</div>
          <Switch on={a.reduceMotion} onChange={(v) => setA11y({ reduceMotion: v })} label="Less motion" hint="Signs and pages appear without sliding" />
          <Switch on={a.bigTargets} onChange={(v) => setA11y({ bigTargets: v })} label="Bigger buttons" hint="Larger targets for a tremor or one free hand" />
          <Switch on={a.thickFocus} onChange={(v) => setA11y({ thickFocus: v })} label="Thicker focus ring" hint="Easier to see where the keyboard is" />

          <div className="label a11y-group">Hearing it</div>
          <Switch on={a.announce} onChange={(v) => setA11y({ announce: v })} label="Announce signs" hint="A screen reader reads each new sign as it appears" />
          <Switch
            on={a.speak}
            onChange={(v) => {
              setA11y({ speak: v });
              if (!v) stopSpeaking();
            }}
            label="Read signs aloud"
            hint="⚠ On a headset the customer may hear it. Off unless you need it."
          />
          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => announce("Accessibility test. This is how a new sign will be announced.", true)}>
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
