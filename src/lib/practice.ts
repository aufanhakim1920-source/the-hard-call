// Practice mode: the customer is an ElevenLabs voice agent. The agent is
// PUBLIC with overrides enabled, so the browser starts it with just its id
// and hands it the practice customer's script. No key in the browser, and
// no key needed on our server for this.

import { Conversation } from "@elevenlabs/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildPrompt, voiceFor } from "./scenarios";
import type { Scenario, Speaker } from "./types";

export type PracticeStatus = "idle" | "connecting" | "connected" | "ended" | "error";

export const AGENT_ID: string = (import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined) ?? "";

/**
 * The agent's own error strings are written for a developer, and the commonest
 * one is literally "Unknown error" — which tells a worker nothing and made it
 * look like our app had broken. Name the causes we actually know about.
 */
function humanError(raw: string): string {
  const m = (raw ?? "").toLowerCase();
  if (/quota|limit|exceed|insufficient|credit/.test(m)) {
    return "The practice voice has used up this month's free minutes. The live call and the report card still work.";
  }
  if (/unauthor|forbidden|401|403/.test(m)) {
    return "The practice voice refused the connection. The agent may no longer be public.";
  }
  if (/microphone|permission|notallowed/.test(m)) {
    return "This browser blocked the microphone. Allow it in the address bar, then start the call again.";
  }
  if (/network|timeout|websocket|disconnect/.test(m)) {
    return "Lost the connection to the practice voice. Check the network and try again.";
  }
  if (!raw || /unknown/.test(m)) {
    // Almost always the free plan's 15 minutes a month, which the SDK reports
    // without a reason. Say the likely cause AND the raw text, so we can tell.
    return "Couldn't start the practice voice — most likely this month's free minutes are used up. The live call and the report card are unaffected.";
  }
  return raw;
}

export function usePractice(opts: { onLine: (speaker: Speaker, text: string) => void }) {
  const [status, setStatus] = useState<PracticeStatus>("idle");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const conv = useRef<Conversation | null>(null);
  const lastLine = useRef<{ speaker: Speaker; text: string } | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const raf = useRef(0);

  const stop = useCallback(async () => {
    cancelAnimationFrame(raf.current);
    const c = conv.current;
    conv.current = null;
    if (c) {
      try {
        await c.endSession();
      } catch {
        /* already closed */
      }
    }
    setStatus((s) => (s === "idle" ? s : "ended"));
    setVolume(0);
  }, []);

  const start = useCallback(
    async (scenario: Scenario) => {
      if (!AGENT_ID) {
        setError("No practice agent is configured yet (VITE_ELEVENLABS_AGENT_ID).");
        setStatus("error");
        return;
      }
      setError(null);
      setStatus("connecting");
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const c = await Conversation.startSession({
          agentId: AGENT_ID,
          connectionType: "webrtc",
          overrides: {
            agent: {
              prompt: { prompt: buildPrompt(scenario) },
              firstMessage: scenario.firstMessage,
              language: "en",
            },
            tts: { voiceId: voiceFor(scenario).id },
          },
          onConnect: () => setStatus("connected"),
          onDisconnect: () => {
            setStatus((s) => (s === "error" ? s : "ended"));
          },
          onError: (message) => {
            setError(humanError(message));
            setStatus("error");
          },
          onModeChange: ({ mode }) => setMode(mode),
          onMessage: (m) => {
            const who = (m as { role?: string }).role;
            const isUser = who === "user" || m.source === "user";
            const text = m.message?.trim();
            if (!text) return;
            const speaker: Speaker = isUser ? "worker" : "customer";
            // The agent sends a tentative transcript and then a corrected one
            // for the same utterance, so the same sentence arrived twice and
            // the call read as if the customer had repeated themselves. Drop a
            // line that only extends or repeats the last one from the same side.
            const prev = lastLine.current;
            if (prev && prev.speaker === speaker) {
              const a = prev.text.toLowerCase();
              const b = text.toLowerCase();
              if (a === b || b.startsWith(a) || a.startsWith(b)) {
                lastLine.current = { speaker, text };
                return;
              }
            }
            lastLine.current = { speaker, text };
            optsRef.current.onLine(speaker, text);
          },
        });
        conv.current = c;
        const tick = () => {
          const cc = conv.current;
          if (!cc) return;
          try {
            setVolume(Math.max(cc.getOutputVolume(), cc.getInputVolume()));
          } catch {
            /* not ready */
          }
          raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    },
    [],
  );

  useEffect(() => () => void stop(), [stop]);

  return { status, mode, error, volume, start, stop, configured: Boolean(AGENT_ID) };
}
