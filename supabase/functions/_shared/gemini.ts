// One thin door to Gemini. Every function goes through here so the model,
// the JSON contract and the fallback live in one place.
//
// Why Gemini: the sign engine runs on every sentence of a live call, so it
// has to answer in about a second. gemini-2.5-flash with thinking switched
// off does that on the free tier; eval/run.mjs is how we checked it is also
// accurate enough. Set GEMINI_MODEL to try another model without touching code.

import { getEnv } from "./env.ts";

export const DEFAULT_MODELS = ["gemini-flash-latest"];

export type JsonSchema = Record<string, unknown>;

export interface GeminiCall {
  system: string;
  user: string;
  schema: JsonSchema;
  temperature?: number;
  model?: string;
}

export interface GeminiResult<T> {
  data: T;
  model: string;
  ms: number;
}

// More than one key, tried in order. Google's free tier is rate limited per
// KEY, and a demo that dies because one key is exhausted mid-judging is the
// failure we can actually prevent. GEMINI_API_KEY is the first; GEMINI_API_KEY_2
// and _3 are optional spares. A comma-separated GEMINI_API_KEY also works.
function apiKeys(): string[] {
  const keys = [getEnv("GEMINI_API_KEY"), getEnv("GEMINI_API_KEY_2"), getEnv("GEMINI_API_KEY_3")]
    .flatMap((k) => (k ?? "").split(","))
    .map((k) => k.trim())
    .filter(Boolean);
  const unique = [...new Set(keys)];
  if (!unique.length) throw new Error("GEMINI_API_KEY is not set on the server");
  return unique;
}

/**
 * Does this failure belong to the KEY rather than to the request?
 * 429 is the quota wall, 403 a disabled key, and 400 API_KEY_INVALID a typo.
 * All three mean the spare is worth trying — a demo lost to one mistyped key
 * is exactly the failure the spare exists to prevent. A bad prompt or a bad
 * schema is NOT in here, because retrying those on another key just burns it.
 */
function shouldTryNextKey(err: unknown): boolean {
  return /(429|403)|quota|rate.?limit|exhausted|API_KEY_INVALID|api key not valid/i.test(String(err));
}

async function callOnce<T>(model: string, c: GeminiCall, thinkingOff: boolean, key: string): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: c.system }] },
    contents: [{ role: "user", parts: [{ text: c.user }] }],
    generationConfig: {
      temperature: c.temperature ?? 0.2,
      responseMimeType: "application/json",
      responseSchema: c.schema,
      ...(thinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };
  // The key goes in a header, never in the URL: query strings end up in logs.
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gemini ${model} ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error(`gemini ${model}: empty answer`);
  return JSON.parse(text) as T;
}

export async function askGemini<T>(c: GeminiCall): Promise<GeminiResult<T>> {
  const envModel = getEnv("GEMINI_MODEL");
  const models = c.model ? [c.model] : envModel ? [envModel] : DEFAULT_MODELS;
  const keys = apiKeys();
  let lastErr: unknown;
  let keyFailures = 0;
  for (const key of keys) {
    for (const model of models) {
      for (const thinkingOff of [true, false]) {
        const t0 = Date.now();
        try {
          const data = await callOnce<T>(model, c, thinkingOff, key);
          return { data, model, ms: Date.now() - t0 };
        } catch (err) {
          lastErr = err;
          // thinkingBudget is rejected by some models; retry the same model without it.
          if (thinkingOff && /thinking/i.test(String(err))) continue;
          break;
        }
      }
      // The key is the problem, not the model: every model says the same. Take the spare.
      if (shouldTryNextKey(lastErr)) break;
    }
    if (!shouldTryNextKey(lastErr)) break;
    keyFailures += 1;
  }
  // Say how many keys were burned, so a silent fall-through is still findable.
  const tail = keyFailures ? ` (after ${keyFailures} of ${keys.length} key(s) failed)` : "";
  const msg = (lastErr instanceof Error ? lastErr.message : String(lastErr)) + tail;
  throw new Error(msg);
}

/** How many keys the server has. Reported by /health so we can see it is armed. */
export function keyCount(): number {
  try {
    return apiKeys().length;
  } catch {
    return 0;
  }
}
