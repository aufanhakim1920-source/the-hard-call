import type { FlagsResponse, Line, Report, Scenario, Session, Speaker } from "./types";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `${path} failed (${res.status})`);
  return data;
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function postFlags(args: {
  lines: Line[];
  newLineId: string;
  existingKeys: string[];
  lessons: string[];
  direction: string;
}): Promise<FlagsResponse> {
  return post<FlagsResponse>("/api/flags", { ...args, todayISO: todayISO() });
}

export type ReportPayload = Omit<Report, "mode" | "customer" | "at" | "scenarioId">;

export function postReport(session: Session, lessons: string[]): Promise<ReportPayload> {
  return post<ReportPayload>("/api/report", { session, lessons });
}

export type ScenarioPayload = Pick<
  Scenario,
  "name" | "age" | "voice" | "job" | "product" | "situation" | "hiddenProblem" | "firstMessage" | "level" | "expectedSigns" | "whyThisOne"
> & { model: string };

export function postScenario(session: Session, report?: ReportPayload): Promise<ScenarioPayload> {
  return post<ScenarioPayload>("/api/scenario", { session, report });
}

export async function getHealth(): Promise<{ ok: boolean; gemini: boolean; model: string }> {
  const res = await fetch("/api/health");
  return res.json();
}

export function speakerLabel(s: Speaker, mode: string): string {
  if (s === "worker") return mode === "practice" ? "You" : "Worker";
  if (s === "customer") return "Customer";
  return "…";
}
