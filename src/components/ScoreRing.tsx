import { useLayoutEffect, useRef } from "react";
import { motionOff } from "../lib/a11y";
import "./report-visuals.css";

// A canvas radial tick ring (Instruments §1a, value-bound): 96 ticks, the lit
// ones gold and longer, the rest slate. On mount the ring lights clockwise and
// the number counts up over ~700 ms; reduced motion jumps to the end.

const TICKS = 96;
const DURATION = 700;
const LIT_LEN = 9;
const DIM_LEN = 5;

// cubic-bezier(0.23, 1, 0.32, 1) is the standard easeOutQuint curve.
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

function token(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function ScoreRing({ score, size = 132, label = "score", unverified = false }: { score: number; size?: number; label?: string; unverified?: boolean }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const num = useRef<HTMLSpanElement | null>(null);
  // An unverified score is withheld, not shown as zero: no lit ticks, no number.
  const target = unverified ? 0 : Math.max(0, Math.min(100, Math.round(score)));

  useLayoutEffect(() => {
    const c = canvas.current;
    const n = num.current;
    if (!c || !n) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gold = token(c, "--gold");
    const slate = token(c, "--slate");
    const centre = size / 2;
    const r = centre - LIT_LEN - 2;

    const draw = (p: number) => {
      ctx.clearRect(0, 0, size, size);
      const lit = Math.round(TICKS * (target / 100) * p);
      for (let i = 0; i < TICKS; i++) {
        const on = i < lit;
        ctx.save();
        ctx.translate(centre, centre);
        ctx.rotate((i / TICKS) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, -r - (on ? LIT_LEN : DIM_LEN));
        ctx.strokeStyle = on ? gold : slate;
        ctx.lineWidth = on ? 1.5 : 1;
        ctx.stroke();
        ctx.restore();
      }
      n.textContent = unverified ? "—" : String(Math.round(target * p));
    };

    // motionOff() is the OS setting OR the app's own switch; a hidden tab gets
    // no frames at all. In both cases draw the finished ring, never the empty one.
    if (motionOff() || document.hidden) {
      draw(1);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      draw(easeOutQuint(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    draw(0);
    raf = requestAnimationFrame(step);
    // The score is the first number a judge reads. If the frames never come,
    // it must not sit at 0 out of 100 — that is a wrong answer, not a slow one.
    const safety = window.setTimeout(() => draw(1), DURATION + 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
    };
  }, [target, size, unverified]);

  return (
    <div className="rv-ring" style={{ width: size, height: size }} role="img" aria-label={unverified ? "score not verified" : `${label} ${target} out of 100`}>
      <canvas ref={canvas} className="rv-ring-canvas" style={{ width: size, height: size }} aria-hidden="true" />
      <div className="rv-ring-read">
        <div className="rv-ring-value" style={{ fontSize: Math.round(size * 0.27) }}>
          <span ref={num}>—</span>
          <span className="rv-unit">/100</span>
        </div>
        <div className="rv-label">{unverified ? "not verified" : label}</div>
      </div>
    </div>
  );
}
