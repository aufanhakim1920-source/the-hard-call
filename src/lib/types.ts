export type Speaker = "customer" | "worker" | "unknown";
export type Mode = "live" | "practice" | "demo";
export type SignKind = "legal" | "tip";
export type Direction = "inbound" | "outbound";

export interface Line {
  id: string;
  t: number;
  speaker: Speaker;
  text: string;
  masked?: boolean;
}

export interface Sign {
  id: string;
  key: string;
  kind: SignKind;
  title: string;
  detail: string;
  askNext: string;
  evidence: string;
  confidence: number;
  t: number;
  lineId: string;
  handled: boolean;
  handledAt?: number;
  dueDate?: string;
  dueLabel?: string;
  dueDays?: number;
  source?: string;
}

export interface Customer {
  name: string;
  product: string;
  direction: Direction;
}

export interface Session {
  id: string;
  mode: Mode;
  customer: Customer;
  startedAt: number;
  endedAt?: number;
  lines: Line[];
  signs: Sign[];
  scenarioId?: string;
  scenarioExpected?: string[];
}

export type Verdict = "handled" | "partly" | "missed";

export interface ReportItem {
  signId: string;
  key: string;
  title: string;
  kind: SignKind;
  verdict: Verdict;
  note: string;
}

export interface Deadline {
  id: string;
  key: string;
  label: string;
  date: string;
  title: string;
  customer: string;
  callId: string;
  done: boolean;
  createdAt: number;
}

export interface Report {
  callId: string;
  summary: string;
  items: ReportItem[];
  missedByAI: string[];
  tip: string;
  score: number;
  caught: number;
  handled: number;
  partly: number;
  missed: number;
  deadlines: Omit<Deadline, "id" | "done" | "createdAt">[];
  durationSec: number;
  model: string;
  // added client-side
  mode: Mode;
  customer: string;
  at: number;
  scenarioId?: string;
}

export type LessonKind = "not-a-sign" | "missed-sign" | "wording";

export interface Lesson {
  id: string;
  t: number;
  kind: LessonKind;
  text: string;
  signKey?: string;
  evidence?: string;
  usedOn: number;
}

export interface Scenario {
  id: string;
  name: string;
  age: number;
  voice: "female" | "male";
  job: string;
  product: string;
  situation: string;
  hiddenProblem: string;
  firstMessage: string;
  level: 1 | 2 | 3;
  expectedSigns: string[];
  whyThisOne: string;
  source: "seed" | "generated";
  fromCallId?: string;
  createdAt: number;
  approved: boolean;
  plays: number;
  bestScore?: number;
}

export interface Settings {
  sound: boolean;
  workerName: string;
}

export interface Store {
  reports: Report[];
  deadlines: Deadline[];
  lessons: Lesson[];
  scenarios: Scenario[];
  settings: Settings;
}

export interface FlagsResponse {
  speaker: Speaker;
  signs: Omit<Sign, "id" | "t" | "lineId" | "handled" | "handledAt">[];
  model: string;
  ms: number;
}

export type AssistantState = "idle" | "thinking" | "paused";

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}
