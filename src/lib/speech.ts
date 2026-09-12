// Live words from the microphone. Uses the browser's own speech engine
// (Chrome / Edge), so the live-call screen needs no key and no upload of
// audio to our server — only the finished sentence, masked, goes to the
// flag engine.

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

function ctor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && ctor() !== null;
}

export function useSpeech(opts: { onFinal: (text: string) => void; onInterim: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);

  const stopMeter = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(a.raf);
    a.stream.getTracks().forEach((t) => t.stop());
    void a.ctx.close().catch(() => {});
    audio.current = null;
    setLevel(0);
  }, []);

  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        if (audio.current) audio.current.raf = requestAnimationFrame(tick);
      };
      audio.current = { ctx, stream, raf: requestAnimationFrame(tick) };
    } catch {
      /* meter is decoration; recognition still works without it */
    }
  }, []);

  const start = useCallback(() => {
    const C = ctor();
    if (!C) {
      setError("This browser has no speech engine. Use Chrome or Edge, or type the words.");
      return;
    }
    if (rec.current) return;
    setError(null);
    const r = new C();
    r.lang = "en-AU";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript?.trim() ?? "";
        if (!text) continue;
        if (res.isFinal) optsRef.current.onFinal(text);
        else interim += text + " ";
      }
      optsRef.current.onInterim(interim.trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone blocked. Allow it in the address bar, or type the words.");
        wantRef.current = false;
      }
      // "no-speech" and "network" just restart via onend
    };
    r.onend = () => {
      rec.current = null;
      if (wantRef.current) {
        try {
          start();
        } catch {
          /* ignore */
        }
      } else {
        setListening(false);
      }
    };
    rec.current = r;
    wantRef.current = true;
    try {
      r.start();
      setListening(true);
      if (!audio.current) void startMeter();
    } catch {
      rec.current = null;
    }
  }, [startMeter]);

  const stop = useCallback(() => {
    wantRef.current = false;
    rec.current?.stop();
    rec.current = null;
    setListening(false);
    optsRef.current.onInterim("");
    stopMeter();
  }, [stopMeter]);

  useEffect(() => () => stop(), [stop]);

  return { supported: speechSupported(), listening, error, level, start, stop };
}
