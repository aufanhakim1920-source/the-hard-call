// The call engine. One hook owns the session: lines in, signs out, report
// at the end. Every input source (microphone, typing, the demo script, the
// practice agent) feeds the same addLine, so the AI sees them identically.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { announce, coachingOn, getA11y } from "./a11y";
import { postFlags, postReport } from "./api";
import { maskSensitive } from "./mask";
import { play, playSigns } from "./sfx";
import { actions, getStore, lessonTexts } from "./store";
import type { AssistantState, Customer, Line, Mode, Report, Session, Sign, Speaker } from "./types";
import { uid } from "./types";

export interface EngineOptions {
  mode: Mode;
  customer: Customer;
  scenarioId?: string;
  scenarioExpected?: string[];
}

export function useCallEngine(opts: EngineOptions) {
  const [session, setSession] = useState<Session>(() => newSession(opts));
  const [interim, setInterim] = useState("");
  const [assistant, setAssistant] = useState<AssistantState>("idle");
  const [lastModel, setLastModel] = useState<string>("");
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  const reset = useCallback(() => {
    setSession(newSession(opts));
    setInterim("");
    setAssistant("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.mode, opts.customer.name, opts.scenarioId]);

  const runFlags = useCallback(async (lineId: string) => {
    const s = sessionRef.current;
    const lines = s.lines.slice(-14);
    if (!lines.some((l) => l.id === lineId)) return;
    const existingKeys = s.signs.map((g) => g.key);
    const lessons = lessonTexts(getStore());
    let attempt = 0;
    while (attempt < 3) {
      try {
        const res = await postFlags({ lines, newLineId: lineId, existingKeys, lessons, direction: s.customer.direction });
        setLastModel(res.model);
        const now = Date.now();
        setSession((cur) => {
          const have = new Set(cur.signs.map((g) => g.key));
          const fresh: Sign[] = res.signs
            .filter((g) => !have.has(g.key))
            .map((g) => ({ ...g, id: uid("sg"), t: now, lineId, handled: false }));
          const linesNext = cur.lines.map((l) =>
            l.id === lineId && l.speaker === "unknown" && res.speaker !== "unknown" ? { ...l, speaker: res.speaker } : l,
          );
          // Coaching off silences the call, not the engine: the signs above are
          // already on the session, so the report card, the deadlines and the
          // timeline all see them. Only the card, the sound and the
          // announcement — the three things the worker would notice — stop.
          if (fresh.length && coachingOn()) {
            playSigns(fresh);
            for (const g of fresh) {
              // A legal sign starts a clock, so it interrupts; a tip waits its turn.
              const due = g.dueDate ? `. ${g.dueLabel ?? "Reply due"} ${g.dueDate}` : "";
              announce(`${g.kind === "legal" ? "Legal sign" : "Tip"}. ${g.title}${due}. Ask next: ${g.askNext}`, g.kind === "legal");
            }
          }
          return { ...cur, lines: linesNext, signs: [...cur.signs, ...fresh] };
        });
        return;
      } catch (err) {
        attempt += 1;
        setAssistant("paused");
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        if (attempt >= 3) console.warn("flags failed", err);
      }
    }
  }, []);

  const addLine = useCallback(
    (text: string, speaker: Speaker = "unknown") => {
      const clean = text.trim();
      if (!clean) return;
      const { text: safe, masked } = maskSensitive(clean);
      const line: Line = { id: uid("ln"), t: Date.now(), speaker, text: safe, masked };
      setSession((cur) => ({ ...cur, lines: [...cur.lines, line] }));
      sessionRef.current = { ...sessionRef.current, lines: [...sessionRef.current.lines, line] };
      // Worker lines in a known-speaker mode rarely carry signs; still send them
      // so the model has context and can catch e.g. a worker skipping a sign.
      pending.current += 1;
      setAssistant("thinking");
      queue.current = queue.current
        .then(() => runFlags(line.id))
        .finally(() => {
          pending.current -= 1;
          if (pending.current === 0) setAssistant((a) => (a === "paused" ? "idle" : "idle"));
        });
    },
    [runFlags],
  );

  const markHandled = useCallback((id: string, handled = true) => {
    setSession((cur) => ({
      ...cur,
      signs: cur.signs.map((g) => (g.id === id ? { ...g, handled, handledAt: handled ? Date.now() : undefined } : g)),
    }));
    play(handled ? "handled" : "undo");
  }, []);

  const endCall = useCallback(async (): Promise<Report> => {
    const ended = { ...sessionRef.current, endedAt: Date.now() };
    setSession(ended);
    // Let any in-flight flag request land first so the report sees every sign.
    await queue.current.catch(() => {});
    const finalSession = { ...sessionRef.current, endedAt: ended.endedAt };
    const payload = await postReport(finalSession, lessonTexts(getStore()));
    const report: Report = {
      ...payload,
      mode: finalSession.mode,
      customer: finalSession.customer.name,
      at: Date.now(),
      scenarioId: finalSession.scenarioId,
      // Taken from the session, set when the call started — the card names the
      // mode the call was run in, not the switch's position an hour later.
      coaching: finalSession.coaching,
    };
    actions.addReport(report);
    play("report");
    return report;
  }, []);

  const elapsed = useElapsed(session.startedAt, session.endedAt);
  const newestOpen = useMemo(() => [...session.signs].reverse().find((g) => !g.handled), [session.signs]);

  return { session, interim, setInterim, assistant, lastModel, addLine, markHandled, endCall, reset, elapsed, newestOpen };
}

function newSession(o: EngineOptions): Session {
  return {
    id: uid("call"),
    mode: o.mode,
    customer: o.customer,
    startedAt: Date.now(),
    lines: [],
    signs: [],
    scenarioId: o.scenarioId,
    scenarioExpected: o.scenarioExpected,
    coaching: getA11y().coaching,
  };
}

function useElapsed(start: number, end?: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (end) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [end]);
  return (end ?? now) - start;
}
