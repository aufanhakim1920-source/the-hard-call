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

export function usePractice(opts: { onLine: (speaker: Speaker, text: string) => void }) {
  const [status, setStatus] = useState<PracticeStatus>("idle");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const conv = useRef<Conversation | null>(null);
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
            setError(message);
            setStatus("error");
          },
          onModeChange: ({ mode }) => setMode(mode),
          onMessage: (m) => {
            const who = (m as { role?: string }).role;
            const isUser = who === "user" || m.source === "user";
            if (m.message?.trim()) optsRef.current.onLine(isUser ? "worker" : "customer", m.message.trim());
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
