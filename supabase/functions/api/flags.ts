// POST /api/flags — the live flag engine.
//
// Called once per finished sentence during a call. Gets the last few lines,
// the signs already on screen (so nothing fires twice) and the manager's
// lessons (so the engine learns). Returns the speaker of the new line and
// any NEW signs, each with a question the worker can ask next.

import { askGemini } from "../_shared/gemini.ts";
import { json, preflight, readJson } from "../_shared/env.ts";
import { SIGN_KEYS, addDays, signDef, taxonomyText } from "../_shared/signs.ts";

interface Line {
  id: string;
  speaker: "customer" | "worker" | "unknown";
  text: string;
}

interface FlagsRequest {
  lines: Line[];
  newLineId: string;
  existingKeys: string[];
  lessons: string[];
  todayISO: string;
  direction: "inbound" | "outbound";
  model?: string;
}

interface ModelSign {
  key: string;
  title: string;
  detail: string;
  askNext: string;
  evidence: string;
  confidence: number;
}

interface ModelAnswer {
  speaker: "customer" | "worker" | "unknown";
  signs: ModelSign[];
}

const SCHEMA = {
  type: "object",
  properties: {
    speaker: { type: "string", enum: ["customer", "worker", "unknown"] },
    signs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: SIGN_KEYS },
          title: { type: "string" },
          detail: { type: "string" },
          askNext: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["key", "title", "detail", "askNext", "evidence", "confidence"],
      },
    },
  },
  required: ["speaker", "signs"],
};

function systemPrompt(lessons: string[], direction: string): string {
  return `You listen to a live phone call between a worker at an Australian bank and a customer, and you help the WORKER in real time.
The call is ${direction === "outbound" ? "outbound: the bank rang the customer, usually about a missed payment" : "inbound: the customer rang the bank"}.

Your job, for the NEWEST line only:
1. Say who spoke it: "customer" or "worker" (use the whole conversation for context; "unknown" only if it is genuinely impossible).
2. Decide whether it reveals a NEW sign from the list below. Fire a sign only when the words clearly support it. Quote the exact words as evidence. Never fire a key that is already on screen.

Signs:
${taxonomyText()}

Rules for what you write:
- title: 3 to 7 words, plain Australian English, about the situation, never a label on the person. "She said she lost her job", not "Unemployed customer". Use "they" if gender is unclear.
- detail: one short sentence on what to DO right now. For legal signs leave detail as an empty string; the app fills in the deadline.
- askNext: ONE question the worker can say word for word, under 20 words, warm, open, no jargon. For hardship: offer a change to repayments rather than asking for money. For stress: slow down and ask what would help. For safety: ask if it is a safe time to talk. Never promise an outcome.
- evidence: the exact words from the newest line that triggered the sign.
- confidence: 0 to 1. Only fire at 0.6 or above.
- Health: never write a diagnosis or condition name in the title or detail.
- A sign must be about the CUSTOMER'S OWN money or situation. A matching word alone is never a sign: "behind on my emails" is not hardship, a brother losing his job is not job-loss, a power outage is not a disaster, a bounced debit that has since cleared is not hardship. When in doubt, do not fire.
- Worker lines almost never trigger signs. A customer line can trigger more than one.
${lessons.length ? `\nLessons from this team's manager (these override your defaults):\n${lessons.map((l) => "- " + l).join("\n")}\n` : ""}
Return JSON only.`;
}

export async function handle(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, 405, { error: "POST only" });
  let body: FlagsRequest;
  try {
    body = await readJson<FlagsRequest>(req);
  } catch (e) {
    return json(req, 400, { error: String(e) });
  }
  const lines = (body.lines ?? []).slice(-14);
  const newLine = lines.find((l) => l.id === body.newLineId) ?? lines[lines.length - 1];
  if (!newLine) return json(req, 400, { error: "no lines" });
  const existing = new Set(body.existingKeys ?? []);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.todayISO ?? "") ? body.todayISO : new Date().toISOString().slice(0, 10);

  const transcript = lines
    .map((l) => `${l.id === newLine.id ? ">>" : "  "} [${l.speaker}] ${l.text}`)
    .join("\n");
  const user = `Conversation so far (newest line marked >>):
${transcript}

Signs already on screen (never repeat these): ${[...existing].join(", ") || "none"}
Today's date: ${today}`;

  try {
    const { data, model, ms } = await askGemini<ModelAnswer>({
      system: systemPrompt(body.lessons ?? [], body.direction ?? "inbound"),
      user,
      schema: SCHEMA,
      temperature: 0.1,
      model: body.model,
    });

    const seen = new Set<string>();
    const signs = (data.signs ?? [])
      .filter((s) => s && SIGN_KEYS.includes(s.key) && !existing.has(s.key) && s.confidence >= 0.6)
      .filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true)))
      .map((s) => {
        const def = signDef(s.key)!;
        const dueDate = def.dueDays ? addDays(today, def.dueDays) : undefined;
        return {
          key: s.key,
          kind: def.kind,
          title: s.title || def.label,
          detail: def.kind === "legal" && dueDate ? "" : s.detail,
          askNext: s.askNext,
          evidence: s.evidence,
          confidence: Math.max(0, Math.min(1, s.confidence)),
          dueDate,
          dueLabel: def.dueLabel,
          dueDays: def.dueDays,
          source: def.source,
        };
      });

    return json(req, 200, { speaker: data.speaker ?? "unknown", signs, model, ms });
  } catch (e) {
    return json(req, 502, { error: String(e instanceof Error ? e.message : e) });
  }
}
