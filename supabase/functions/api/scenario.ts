// POST /api/scenario — turn a finished call into a practice customer.
//
// This is the learning loop's first half: the situations staff actually
// meet become the situations they rehearse. De-identified by design: the
// model is told to change the name, job, suburb and every number, and the
// result is shown to a human before it can be used.

import { askGemini } from "../_shared/gemini.ts";
import { json, preflight, readJson } from "../_shared/env.ts";
import { SIGN_KEYS } from "../_shared/signs.ts";

interface ScenarioRequest {
  session: {
    id: string;
    customer: { name: string; product: string; direction: string };
    lines: { speaker: string; text: string }[];
    signs: { key: string; title: string; evidence: string; handled: boolean }[];
  };
  report?: { summary?: string; tip?: string; items?: { verdict: string; key: string }[] };
}

interface ModelScenario {
  name: string;
  age: number;
  voice: "female" | "male";
  job: string;
  product: string;
  situation: string;
  hiddenProblem: string;
  firstMessage: string;
  level: number;
  expectedSigns: string[];
  whyThisOne: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" },
    voice: { type: "string", enum: ["female", "male"] },
    job: { type: "string" },
    product: { type: "string" },
    situation: { type: "string" },
    hiddenProblem: { type: "string" },
    firstMessage: { type: "string" },
    level: { type: "number" },
    expectedSigns: { type: "array", items: { type: "string", enum: SIGN_KEYS } },
    whyThisOne: { type: "string" },
  },
  required: ["name", "age", "voice", "job", "product", "situation", "hiddenProblem", "firstMessage", "level", "expectedSigns", "whyThisOne"],
};

const SYSTEM = `You design a practice customer for bank staff, built from a real call, so the team can rehearse the exact kind of situation they just met.

De-identify completely. This step is important: invent a NEW first name and surname, change the age, job, suburb, product amounts and every number, and drop anything that could identify the real person. Keep only the SHAPE of the situation and what made it hard.

Fields:
- name: new, ordinary Australian name.
- voice: female or male, whichever fits the new persona.
- situation: 2-3 sentences the practice customer knows about their own life and money (in third person).
- hiddenProblem: the thing they will only reveal if the worker asks a caring open question (one sentence).
- firstMessage: the first thing the customer says on the call, spoken, hesitant, under 25 words. They never say the word "hardship".
- level: 1 easy (opens up quickly), 2 medium, 3 hard (defensive, hides it, gets upset if pushed for money). Make it one level harder than the real call went if the worker missed something.
- expectedSigns: the sign keys a good worker should catch in this scenario.
- whyThisOne: one sentence to the team on why this scenario is worth practising, referring to what went wrong or right.
Return JSON only.`;

export async function handle(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, 405, { error: "POST only" });
  let body: ScenarioRequest;
  try {
    body = await readJson<ScenarioRequest>(req);
  } catch (e) {
    return json(req, 400, { error: String(e) });
  }
  const s = body.session;
  if (!s?.lines?.length) return json(req, 400, { error: "empty session" });
  const user = `Real call (${s.customer.direction}) about a ${s.customer.product}.
Transcript:
${s.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n")}

Signs raised: ${s.signs.map((g) => `${g.key} (${g.handled ? "handled" : "not handled"}) "${g.evidence}"`).join("; ") || "none"}
${body.report?.summary ? `Report card summary: ${body.report.summary}\nTip given: ${body.report.tip ?? ""}` : ""}`;
  try {
    const { data, model } = await askGemini<ModelScenario>({ system: SYSTEM, user, schema: SCHEMA, temperature: 0.7 });
    const level = Math.max(1, Math.min(3, Math.round(data.level))) as 1 | 2 | 3;
    return json(req, 200, {
      ...data,
      level,
      expectedSigns: (data.expectedSigns ?? []).filter((k) => SIGN_KEYS.includes(k)),
      model,
    });
  } catch (e) {
    return json(req, 502, { error: String(e instanceof Error ? e.message : e) });
  }
}
