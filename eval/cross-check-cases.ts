/**
 * Runs the detector over eval/cases.json — the sign engine's case set — and
 * reports agreement. This is the cross-test between the two systems:
 *
 *   cases.json says       "hardship-request" (broad: hints and asks both count)
 *   the detector emits    kind "request" (broad) or kind "obligation" (narrow)
 *
 * Agreement rule: a case expecting "hardship-request" should produce at least a
 * request. A case expecting no hardship label should produce neither a request
 * nor an obligation. Cue labels (health, gambling, safety, scam, stress,
 * separation, bereavement, disaster, job-loss, complaint) are the sign engine's
 * job and are ignored here — the detector never emits them by design.
 *
 *   npx tsx eval/cross-check-cases.ts
 *
 * Exit code is always 0. This is a report, not a gate: the two systems are
 * allowed to differ, we just need to know where.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detect } from "../src/detector/index.js";
import { caseToTranscript } from "../src/lib/speaker.js";

type Case = {
  id: string;
  context?: Array<{ speaker: string; text: string }>;
  line: { speaker: string; text: string };
  expect: string[];
  note?: string;
};

/** Labels the detector now covers as obligations of their own. */
const OBLIGATION_LABELS: Record<string, string> = { complaint: "RG271_COMPLAINT_30D" };

const CUE_LABELS = new Set([
  "health",
  "gambling",
  "safety",
  "scam",
  "stress",
  "separation",
  "bereavement",
  "disaster",
  "job-loss",
]);

async function main() {
  const path = join(process.cwd(), "eval", "cases.json");
  const cases: Case[] = JSON.parse(readFileSync(path, "utf8"));

  const agree: string[] = [];
  const missed: Case[] = [];
  const overfired: Case[] = [];
  const complaintMissed: Case[] = [];
  const complaintOverfired: Case[] = [];

  for (const c of cases) {
    // The sign engine judges one line; only the customer's own words can
    // trigger anything, so a worker line must always come back silent.
    const transcript = caseToTranscript(c);
    const flags = await detect(transcript, { mode: "rules" });

    // Hardship comparison only. The complaint obligation is its own clock and
    // is compared separately below, so it must not count as a hardship fire.
    const emitted = flags.filter(
      (f) =>
        (f.kind === "request" || f.kind === "obligation") &&
        f.rule_id !== OBLIGATION_LABELS.complaint
    );
    const wantsHardship = c.expect.includes("hardship-request");
    const cues = c.expect.filter((e) => CUE_LABELS.has(e));

    const kinds = emitted.map((f) => `${f.kind}:${f.rule_id}`).join(", ") || "silent";

    if (wantsHardship && emitted.length > 0) {
      agree.push(`${c.id}  ${kinds}`);
    } else if (wantsHardship && emitted.length === 0) {
      missed.push(c);
    } else if (!wantsHardship && emitted.length > 0) {
      overfired.push(c);
    } else {
      agree.push(`${c.id}  silent (correctly)`);
    }

    // complaint is its own statutory clock (RG 271, 30 days), so it is
    // compared rather than ignored.
    const wantsComplaint = c.expect.includes("complaint");
    const firedComplaint = flags.some((f) => f.rule_id === OBLIGATION_LABELS.complaint);
    if (wantsComplaint && !firedComplaint) complaintMissed.push(c);
    if (!wantsComplaint && firedComplaint) complaintOverfired.push(c);
  }

  const total = cases.length;
  console.log(`\ncases.json cross-check — ${total} cases, rules mode (no API calls)\n`);
  console.log(`agree      ${agree.length}/${total}`);
  console.log(`detector silent where cases.json expects hardship-request   ${missed.length}`);
  console.log(`detector fires where cases.json expects none                ${overfired.length}`);

  if (missed.length > 0) {
    console.log(`\n--- detector stays silent, cases.json wants hardship-request ---`);
    console.log(`(these need the model tier, or a lexicon addition — decide case by case)`);
    for (const c of missed) {
      console.log(`\n  ${c.id}  "${c.line.text}"`);
      if (c.note) console.log(`        note: ${c.note}`);
    }
  }

  if (overfired.length > 0) {
    console.log(`\n--- detector fires, cases.json expects nothing (REAL FALSE POSITIVES) ---`);
    for (const c of overfired) {
      console.log(`\n  ${c.id}  "${c.line.text}"`);
      if (c.note) console.log(`        note: ${c.note}`);
    }
  }

  console.log(`\ncomplaint (RG 271, 30 days)`);
  console.log(`  expected but silent   ${complaintMissed.length}`);
  console.log(`  fired unexpectedly    ${complaintOverfired.length}`);
  for (const c of [...complaintMissed, ...complaintOverfired]) {
    console.log(`    ${c.id}  "${c.line.text}"`);
  }

  console.log(
    `\nCue labels (${[...CUE_LABELS].join(", ")}) are the sign engine's job.\n` +
      `The detector emits none of them by design, so they are not compared here.\n`
  );
}

main();
