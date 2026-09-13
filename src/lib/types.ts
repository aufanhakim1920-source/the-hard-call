export type Speaker = "customer" | "worker" | "unknown";
/** How the speaker of a turn was decided. Absent means "known".
    known    — the source told us (practice: two streams; a person corrected it).
    inferred — a model guessed it from the words. Live dictation on one mic.
    unknown  — nobody could tell.
    Only a `known` turn may assert an obligation: a staff line read as the
    customer would start a statutory clock on the bank's own words, and a
    customer line read as staff would mark a duty handled that nobody handled. */
export type SpeakerConfidence = "known" | "inferred" | "unknown";
export type Mode = "live" | "practice" | "demo";
export type SignKind = "legal" | "tip";
export type Direction = "inbound" | "outbound";

export interface Line {
  id: string;
  t: number;
  speaker: Speaker;
  text: string;
  masked?: boolean;
  /** Absent = "known". Set it when a model decided the speaker. */
  speakerConfidence?: SpeakerConfidence;
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
  /** Operational callback for an unresolved request. This is not a legal deadline. */
  followUpDays?: number;
  followUpDate?: string;
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
  /** False = the assistant listened but said nothing during the call. */
  coaching: boolean;
}

export type Verdict = "handled" | "partly" | "missed" | "unverified";

export interface ReportItem {
  signId: string;
  key: string;
  title: string;
  kind: SignKind;
  verdict: Verdict;
  note: string;
  evidence?: { lineId: string; offsetMs: number }[];
  /** Requests are retained for follow-up but excluded from compliance scoring. */
  tier?: "obligation" | "request";
  followUpDays?: number;
  followUpDate?: string;
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
  /** Absent means a statutory deadline for records written before this field existed. */
  type?: "statutory" | "followup";
}

export interface Report {
  callId: string;
  summary: string;
  items: ReportItem[];
  missedByAI: string[];
  tip: string;
  score: number;
  scoreUnverified?: boolean;
  /** True when the write-up could not be produced (quota, or the model was
      unreachable) and the card was built from what the call itself recorded.
      A degraded report never carries a score. */
  degraded?: boolean;
  degradedReason?: "quota" | "unreachable";
  unverified?: number;
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
  /** Which mode the call ran in. False = the worker was given nothing live, so
      a low score measures the gap, not a worker ignoring prompts.
      ⚠ Read it as `coaching === false`, never as `!coaching`: absent means the
      mode was not recorded; cache reloads preserve that absence.
      A card pulled from the server carries it once
      supabase/migrations/0001_report_metadata.sql has run; before that the
      column does not exist and the field comes back absent. */
  coaching?: boolean;
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
  voiceId?: string;
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
  pendingDeletes?: { lessons: string[]; scenarios: string[] };
  reports: Report[];
  deadlines: Deadline[];
  lessons: Lesson[];
  scenarios: Scenario[];
  settings: Settings;
}

export interface FlagsResponse {
  speaker: Speaker;
  /** "known" when the request already labelled the line, "inferred" when this
      answer is what decided it. The live screen should carry it onto the line
      so a person can correct it and the report card can see it. */
  speakerConfidence: SpeakerConfidence;
  signs: Omit<Sign, "id" | "t" | "lineId" | "handled" | "handledAt">[];
  model: string;
  ms: number;
}

export type AssistantState = "idle" | "thinking" | "paused";

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}
