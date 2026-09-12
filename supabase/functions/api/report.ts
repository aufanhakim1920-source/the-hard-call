// POST /api/report — the report card after a call.
//
// Judges the WORKER, not the customer: was each sign acted on, what was
// missed, one tip for next time. Deterministic parts (counts, deadlines)
// are computed here; the model only writes the judgement.

import { askGemini } from "../_shared/gemini.ts";
import { json, preflight, readJson } from "../_shared/env.ts";

interface Line {
  id: string;
  t: number;
  speaker: string;
  text: string;
}
interface Sign {
  id: string;
  key: string;
  kind: "legal" | "tip";
  title: string;
  askNext: string;
  evidence: string;
  handled: boolean;
  t: number;
  dueDate?: string;
  dueLabel?: string;
}
interface Session {
  id: string;
  mode: "live" | "practice" | "demo";
  customer: { name: string; product: string; direction: string };
  lines: Line[];
  signs: Sign[];
  startedAt: number;
  endedAt?: number;
  scenarioExpected?: string[];
}
interface ReportRequest {
  session: Session;
  lessons?: string[];
}

interface ModelReport {
  summary: string;
  items: { signId: string; verdict: "handled" | "partly" | "missed"; note: string }[];
  missedByAI: string[];
  tip: string;
  score: number;
}

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          signId: { type: "string" },
          verdict: { type: "string", enum: ["handled", "partly", "missed"] },
          note: { type: "string" },
        },
        required: ["signId", "verdict", "note"],
      },
    },
    missedByAI: { type: "array", items: { type: "string" } },
    tip: { type: "string" },
    score: { type: "number" },
  },
  required: ["summary", "items", "missedByAI", "tip", "score"],
};

const SYSTEM = `You write the report card for a bank worker after a hardship call. You are a kind, specific coach. Judge the WORKER only.

For each sign the app raised during the call, decide from the transcript:
- handled: the worker acted on it (asked the suggested question or an equivalent, offered a repayment change, slowed down, checked safety, logged the complaint...).
- partly: they touched it but pushed on (e.g. acknowledged the job loss then asked for the full amount).
- missed: they did not act on it.
The app's "ticked" flag tells you what the worker CLAIMED to handle; the transcript decides.

missedByAI: things in the customer's words that deserved a sign but got none (max 2, short). Empty if nothing.

summary: two sentences, plain Australian English, addressed to the worker as "you".
tip: ONE sentence, the single most useful change for next time, concrete.
score: 0-100 for this call. 100 = every sign handled well and the customer left with a next step.
Never write a diagnosis or a label about the customer. Return JSON only.`;

export async function handle(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, 405, { error: "POST only" });
  let body: ReportRequest;
  try {
    body = await readJson<ReportRequest>(req);
  } catch (e) {
    return json(req, 400, { error: String(e) });
  }
  const s = body.session;
  if (!s?.lines?.length) return json(req, 400, { error: "empty session" });

  const t0 = s.startedAt;
  const transcript = s.lines
    .map((l) => `[${fmt(l.t - t0)}] ${l.speaker}: ${l.text}`)
    .join("\n");
  const signs = s.signs
    .map(
      (g) =>
        `- id=${g.id} key=${g.key} kind=${g.kind} at ${fmt(g.t - t0)} "${g.title}" evidence="${g.evidence}" askNext="${g.askNext}" ticked=${g.handled ? "yes" : "no"}`,
    )
    .join("\n");

  const user = `Call (${s.mode}, ${s.customer.direction}) with ${s.customer.name} about their ${s.customer.product}.

Transcript:
${transcript || "(no words)"}

Signs raised by the app:
${signs || "(none)"}
${s.scenarioExpected?.length ? `\nThis was a practice call. Signs the scenario was built to test: ${s.scenarioExpected.join(", ")}` : ""}`;

  try {
    const { data, model } = await askGemini<ModelReport>({ system: SYSTEM, user, schema: SCHEMA, temperature: 0.2 });
    const byId = new Map(s.signs.map((g) => [g.id, g]));
    const items = (data.items ?? [])
      .filter((i) => byId.has(i.signId))
      .map((i) => ({ ...i, key: byId.get(i.signId)!.key, title: byId.get(i.signId)!.title, kind: byId.get(i.signId)!.kind }));
    // Any sign the model forgot to judge falls back to the tick.
    for (const g of s.signs) {
      if (!items.find((i) => i.signId === g.id)) {
        items.push({ signId: g.id, key: g.key, title: g.title, kind: g.kind, verdict: g.handled ? "handled" : "missed", note: g.handled ? "Ticked during the call." : "Not ticked during the call." });
      }
    }
    const caught = s.signs.length;
    const handled = items.filter((i) => i.verdict === "handled").length;
    const partly = items.filter((i) => i.verdict === "partly").length;
    const missed = items.filter((i) => i.verdict === "missed").length;
    const deadlines = s.signs
      .filter((g) => g.kind === "legal" && g.dueDate)
      .map((g) => ({ key: g.key, label: g.dueLabel ?? "Due", date: g.dueDate!, title: g.title, customer: s.customer.name, callId: s.id }));
    const durationSec = Math.round(((s.endedAt ?? Date.now()) - t0) / 1000);

    return json(req, 200, {
      callId: s.id,
      summary: data.summary,
      items,
      missedByAI: (data.missedByAI ?? []).slice(0, 2),
      tip: data.tip,
      score: Math.round(Math.max(0, Math.min(100, data.score))),
      caught,
      handled,
      partly,
      missed,
      deadlines,
      durationSec,
      model,
    });
  } catch (e) {
    return json(req, 502, { error: String(e instanceof Error ? e.message : e) });
  }
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
