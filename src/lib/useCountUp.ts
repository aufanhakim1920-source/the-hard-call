import { useEffect, useState } from "react";

// Strong ease-out (cubic-bezier(.23,1,.32,1) is close to this in feel).
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.2);

/** Counts from 0 to `to` over `ms`. Jumps straight there when the user prefers reduced motion. */
export function useCountUp(to: number, ms = 700, delay = 0): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(to);
      return;
    }
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
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return v;
}
