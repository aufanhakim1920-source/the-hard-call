/**
 * Optional stage-2 adjudicator, for candidates the deterministic pass can't
 * settle. Only "unclear" candidates reach this, so a typical call makes zero
 * or one model call — which matters while we're on a shared free-tier quota.
 *
 * PRIVACY CONTRACT: the response schema has no field for the cause. The model
 * is asked one question — inability or delay — and cannot return "illness",
 * "job loss" or any other classification of the customer, because there is
 * nowhere to put it. Do not add one.
 */

import type { Adjudicator, Turn } from "./types.js";

export const ADJUDICATION_PROMPT = `You apply one legal test from the Australian National Credit Code.

Under s 72, a borrower gives a hardship notice when they state they ARE or WILL BE
unable to meet their obligations under a credit contract. The test turns on
inability, not on distress, and not on temporary timing problems.

INABILITY (this IS a hardship notice):
- states they cannot meet the repayment over the medium term
- a problem they cannot resolve within roughly six months
- example: "I can't make the repayment. Not this month and honestly not for a while."

DELAY (this is NOT a hardship notice):
- temporary difficulty with a stated near-term recovery
- example: "We had some difficulty but it will all be in order within one month."
- example: "My pay cycle shifted, I'll be square once the 20th lands."

Customers rarely use legal language. Words like "struggling", "can't afford",
"low on funds" or "strapped" appear in BOTH cases, so they do not decide it.
What decides it is whether the customer expects to recover in the near term.

Judge ONLY the marked turn, using the surrounding turns for context.

Respond with JSON only:
{"is_hardship_notice": boolean, "basis": "inability" | "delay", "confidence": number}

Do not include any other field. Do not describe why the customer cannot pay.`;

function renderWindow(windowTurns: Turn[], candidate: Turn): string {
  return windowTurns
    .map((t) => {
      const mark = t === candidate ? " <-- JUDGE THIS TURN" : "";
      return `[${t.speaker}] ${t.text}${mark}`;
    })
    .join("\n");
}

/**
 * Gemini-backed adjudicator. Reads the key from the environment — in production
 * this runs inside the Supabase function where the secret lives, never client-side.
 */
export function geminiAdjudicator(opts: {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Adjudicator {
  const model = opts.model ?? "gemini-flash-latest";
  const doFetch = opts.fetchImpl ?? fetch;

  return async (windowTurns, candidate) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`;
    const res = await doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ADJUDICATION_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: renderWindow(windowTurns, candidate) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              is_hardship_notice: { type: "BOOLEAN" },
              basis: { type: "STRING", enum: ["inability", "delay"] },
              confidence: { type: "NUMBER" },
            },
            required: ["is_hardship_notice", "basis", "confidence"],
          },
        },
      }),
    });

    if (!res.ok) {
      // Rate limited or down: fail CLOSED (no flag) rather than guessing.
      // The deterministic pass has already caught every unambiguous notice.
      return { is_hardship_notice: false, basis: "delay", confidence: 0 };
    }

    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try {
      const parsed = JSON.parse(text);
      return {
        is_hardship_notice: Boolean(parsed.is_hardship_notice),
        basis: parsed.basis === "inability" ? "inability" : "delay",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      };
    } catch {
      return { is_hardship_notice: false, basis: "delay", confidence: 0 };
    }
  };
}
