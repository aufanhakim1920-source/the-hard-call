import { useEffect, useState } from "react";
import { motionOff } from "../lib/a11y";

/**
 * Every bar on the report and on the compare board grows once, on arrival.
 *
 * The decision is made at FIRST PAINT, not after one: reduced motion or a
 * hidden tab means there will be no animation frames to watch, so the chart
 * starts finished rather than empty. The timeout is the second net — a bar
 * stuck at 0% is not a subtler bar, it is a wrong number, and the same
 * discipline is why the score ring draws its final state on a safety timer.
 *
 * It lives in its own file so the components that use it stay component-only
 * files and hot reload keeps working.
 */
export function useGrown(safetyMs = 900): boolean {
  const [grown, setGrown] = useState(() => motionOff() || document.hidden);
  useEffect(() => {
    if (grown) return;
    const raf = requestAnimationFrame(() => setGrown(true));
    const safety = window.setTimeout(() => setGrown(true), safetyMs);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
    };
  }, [grown, safetyMs]);
  return grown;
}
