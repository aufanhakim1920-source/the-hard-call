import { useEffect, useState } from "react";
import { motionOff } from "./a11y";

// Strong ease-out (cubic-bezier(.23,1,.32,1) is close to this in feel).
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.2);

/** Counts from 0 to `to` over `ms`. Jumps straight there when the user prefers reduced motion. */
export function useCountUp(to: number, ms = 700, delay = 0): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    // motionOff() is the OS setting OR the app's own "Less motion" switch. The
    // raw media query alone ignored the switch the user can actually reach.
    if (typeof window !== "undefined" && (motionOff() || document.hidden)) {
      setV(to);
      return;
    }
    // A hidden tab gets no animation frames; never leave the number at 0.
    const safety = window.setTimeout(() => setV(to), ms + delay + 150);
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start - delay) / ms);
      if (t < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      setV(Math.round(to * easeOut(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
    };
  }, [to, ms, delay]);
  return v;
}
