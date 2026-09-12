export { detect, LiveDetector } from "./detect.js";
export type { Mode } from "./detect.js";
export { geminiAdjudicator, ADJUDICATION_PROMPT } from "./adjudicate.js";
export { RULES } from "./rules.js";
export { findCandidates, classifyTurn } from "./lexicon.js";
export type {
  Flag,
  Transcript,
  Turn,
  TurnRef,
  Resolution,
  ResolutionStatus,
  Candidate,
  Adjudicator,
} from "./types.js";
