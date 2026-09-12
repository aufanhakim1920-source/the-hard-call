// One thin door to Gemini. Every function goes through here so the model,
// the JSON contract and the fallback live in one place.
//
// Why Gemini: the flag engine runs on every sentence of a live call, so it
// has to answer in about a second. gemini-2.5-flash with thinking switched
// off does that on the free tier; the eval script (eval/run.mjs) is how we
// checked it is also accurate enough. Swap GEMINI_MODEL in the env to try
// another model without touching code.

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

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

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  return key;
}

async function callOnce<T>(model: string, c: GeminiCall, thinkingOff: boolean): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey()}`;
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
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gemini ${model} ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error(`gemini ${model}: empty answer`);
  return JSON.parse(text) as T;
}

export async function askGemini<T>(c: GeminiCall): Promise<GeminiResult<T>> {
  const models = c.model ? [c.model] : (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : DEFAULT_MODELS);
  let lastErr: unknown;
  for (const model of models) {
    for (const thinkingOff of [true, false]) {
      const t0 = Date.now();
      try {
        const data = await callOnce<T>(model, c, thinkingOff);
        return { data, model, ms: Date.now() - t0 };
      } catch (err) {
        lastErr = err;
        const msg = String(err);
        // thinkingBudget is rejected by some models; retry the same model without it.
        if (thinkingOff && /thinking/i.test(msg)) continue;
        break;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("body must be JSON");
  }
}
