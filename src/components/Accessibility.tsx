// The settings panel: how the app reads, and whether the assistant speaks up
// during a call. Every control says what it does in plain words, and the ones
// with a cost say what the cost is.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

/**
 * A segmented control that behaves like the radio group it claims to be.
 *
 * One tab stop for the whole group — the selected option owns it — and the
 * arrows move between the options, per the ARIA radiogroup pattern. Before
 * this, all six radios across the two groups were tabbable and no key did
 * anything: crossing the panel by keyboard cost six stops and the arrows were
 * dead.
 */
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
  const group = useRef<HTMLDivElement>(null);

  const move = (to: number) => {
    const next = (to + options.length) % options.length;
    onChange(next);
    play("tap");
    // The tab stop travels with the selection, so focus has to follow it —
    // otherwise the next Tab leaves from a radio that is no longer tabbable.
    group.current?.querySelectorAll("button")[next]?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    if (!back && !fwd && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    move(e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : value + (fwd ? 1 : -1));
  };

  return (
    <div className="a11y-seg-wrap">
      <div className="a11y-text">
        <b>{label}</b>
        <span className="small muted">{hint}</span>
      </div>
      <div className="a11y-seg" role="radiogroup" aria-label={label} ref={group} onKeyDown={onKey}>
        {options.map((o, i) => (
          <button
            key={o}
            role="radio"
            aria-checked={i === value}
            tabIndex={i === value ? 0 : -1}
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
  const wrap = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const changed = changedCount();

  const close = useCallback((giveFocusBack: boolean) => {
    setOpen(false);
    if (giveFocusBack) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    // role="dialog" is a promise that this is a place, so focus has to arrive
    // in it. It is deliberately NOT aria-modal: the worker may be on a live
    // call, and a modal would take the sign announcements off the page behind
    // it. Non-modal means Tab can leave, and leaving closes it.
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, close]);

  // More than half this panel is below the fold — 1131px of content in a 531px
  // box — and a cut-off list has to read as "there is more", not as the end.
  // Same device as the top bar's tab strip: the edge fades only on the side
  // that actually has something hidden.
  useLayoutEffect(() => {
    const el = scroll.current;
    if (!open || !el) return;
    const mark = () => {
      const more = el.scrollHeight - el.clientHeight;
      el.dataset.edge = more < 2 ? "none" : el.scrollTop < 2 ? "bottom" : el.scrollTop > more - 2 ? "top" : "both";
    };
    mark();
    el.addEventListener("scroll", mark, { passive: true });
    const ro = new ResizeObserver(mark);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", mark);
      ro.disconnect();
    };
  }, [open, a.textSize, a.lineSpacing, a.coaching]);

  return (
    <div
      className="acct"
      ref={wrap}
      // React's onBlur bubbles — it is focusout, and there is no onFocusOut.
      // Tabbing past the last control is a normal way to leave a non-modal
      // dialog. A null relatedTarget is the window losing focus, not the user.
      onBlur={(e) => {
        if (open && e.relatedTarget && !wrap.current?.contains(e.relatedTarget)) close(false);
      }}
    >
      <button
        ref={trigger}
        className={"btn ghost sm" + (open ? " on" : "")}
        onClick={() => (open ? close(false) : setOpen(true))}
        aria-expanded={open}
        aria-controls="settings-panel"
        aria-label={`Settings${changed ? `, ${changed} changed` : ""}`}
        title="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
          <path d="M4 8h16M12 8v5m0 0-3.5 7M12 13l3.5 7" strokeLinecap="round" />
        </svg>
        <span className="a11y-chip-label">Settings</span>
        {changed > 0 && <span className="count">{changed}</span>}
      </button>
      {open && (
        <div className="acct-panel a11y-panel" id="settings-panel" role="dialog" aria-modal="false" aria-labelledby="settings-title" tabIndex={-1} ref={dialog}>
          <div className="a11y-head">
            <div className="label" id="settings-title">
              Settings
            </div>
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

          <div className="a11y-scroll" ref={scroll}>
            <p className="small muted" style={{ margin: "2px 0 12px" }}>
              Saved on this device. Your system's reduced-motion and light-or-dark setting are followed until you change them here.
            </p>

            <div className="label a11y-group">The assistant</div>
            <Switch
              on={a.coaching}
              onChange={(v) => setA11y({ coaching: v })}
              label="Coaching during the call"
              hint="Off: it still listens, still judges, still writes the report card — it just says nothing while you are on the phone."
            />
            <p className="small muted a11y-note">
              {a.coaching
                ? "A sign appears the moment it is raised, once each."
                : "Signs are recorded but never shown, sounded or announced. The report card is unchanged, and it says the call ran silent."}
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
            {!a.coaching && <p className="small muted a11y-note">Coaching is off, so nothing is announced during a call. These take effect when you turn it back on.</p>}
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => announce("Settings test. This is how a new sign will be announced.", true)}>
              Test an announcement
            </button>
          </div>
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
