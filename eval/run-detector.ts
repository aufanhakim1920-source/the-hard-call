/**
 * Runs the detector against every fixture and diffs against
 * fixtures/expected/expected_flags.json.
 *
 *   npx tsx eval/run-detector.ts
 *
 * Deterministic mode only — no API key, no network, no rate limit.
 *
 * The three event kinds are asserted separately: "no statutory notice" and
 * "no live cues" are different claims and must be able to fail independently.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { detect } from "../src/detector/index.js";
import type { Flag, Transcript } from "../src/detector/index.js";

const FIXTURES = join(process.cwd(), "fixtures");
const expected = JSON.parse(readFileSync(join(FIXTURES, "expected", "expected_flags.json"), "utf8"));
const TOLERANCE = expected.tolerance_ms ?? 3000;

type Want = {
  rule_id: string;
  kind?: string;
  trigger_turn_start_ms?: number;
  escalated_at_ms?: number;
  expect_superseded?: boolean;
  deadline_days?: number | null;
};

type Expect = {
  must_flag: Want[];
  must_not_flag: Array<{ rule_id: string }>;
  must_not_emit_kinds?: string[];
  staff_handling?: string;
};

const log = (s: string) => console.log(s);
let failures = 0;
const fail = (s: string) => {
  log(`  FAIL ${s}`);
  failures++;
};

async function main() {
  for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort()) {
    const transcript = JSON.parse(readFileSync(join(FIXTURES, file), "utf8")) as Transcript;
    const exp: Expect | undefined = expected[transcript.call_id];
    if (!exp) {
      log(`SKIP ${file} — no expectation for ${transcript.call_id}`);
      continue;
    }

    const before = failures;
    const flags: Flag[] = await detect(transcript, { mode: "rules" });

    log(`\n${transcript.call_id} (${file})`);
    log(`  emitted ${flags.length} event(s)`);
    for (const f of flags) {
      const bits = [
        `[${f.kind}]`,
        f.rule_id,
        `@${f.raised_at.start_ms}ms`,
        f.escalated_at ? `escalated ${f.escalated_at.start_ms}ms` : null,
        f.superseded_by ? `superseded by ${f.superseded_by}` : null,
        `-> ${f.resolution?.status}`,
        f.resolution?.evidence ? `(evidence @${f.resolution.evidence.start_ms}ms)` : null,
        f.persist ? null : "NOT PERSISTED",
      ].filter(Boolean);
      log(`    ${bits.join(" ")}`);
    }

    // 1. every must_flag present, right kind, right moment
    for (const want of exp.must_flag) {
      const got = flags.find((f) => f.rule_id === want.rule_id);
      if (!got) {
        fail(`missing ${want.rule_id}`);
        continue;
      }
      if (want.kind && got.kind !== want.kind) {
        fail(`${want.rule_id} kind is "${got.kind}", expected "${want.kind}"`);
      }
      if (want.trigger_turn_start_ms != null) {
        const drift = Math.abs(got.raised_at.start_ms - want.trigger_turn_start_ms);
        if (drift > TOLERANCE) {
          fail(
            `${want.rule_id} raised at ${got.raised_at.start_ms}ms, expected ~${want.trigger_turn_start_ms}ms (drift ${drift}ms)`
          );
        }
      }
      if (want.escalated_at_ms != null) {
        const at = got.escalated_at?.start_ms;
        if (at == null || Math.abs(at - want.escalated_at_ms) > TOLERANCE) {
          fail(`${want.rule_id} escalated_at ${at ?? "missing"}, expected ~${want.escalated_at_ms}ms`);
        }
      }
      if (want.expect_superseded && !got.superseded_by) {
        fail(`${want.rule_id} should carry superseded_by`);
      }
      if (want.deadline_days !== undefined && got.deadline_days !== want.deadline_days) {
        fail(`${want.rule_id} deadline_days is ${got.deadline_days}, expected ${want.deadline_days}`);
      }
    }

    // 2. nothing in must_not_flag was emitted
    for (const forbidden of exp.must_not_flag) {
      if (flags.some((f) => f.rule_id === forbidden.rule_id)) {
        fail(`false positive: ${forbidden.rule_id} must not fire on this call`);
      }
    }

    // 3. forbidden kinds — asserted separately from rule ids, so a regression
    //    that starts classifying the customer fails here and nowhere else
    for (const kind of exp.must_not_emit_kinds ?? []) {
      const leaked = flags.filter((f) => f.kind === kind);
      if (leaked.length > 0) {
        fail(`emitted ${leaked.length} "${kind}" event(s): ${leaked.map((f) => f.rule_id).join(", ")}`);
      }
    }

    // 4. the privacy invariant: nothing marked non-persistable may claim to persist
    for (const f of flags) {
      if (f.kind === "cue" && f.persist) fail(`${f.rule_id} is a cue but persist is true`);
    }

    // 5. resolution matches how the staff member actually handled it.
    //    Superseded requests are excluded — they are not scored.
    const scored = flags.filter((f) => !f.superseded_by);
    if (exp.staff_handling === "correct") {
      const missed = scored.filter((f) => f.resolution?.status === "missed");
      if (missed.length > 0) {
        fail(`well-handled call has missed events: ${missed.map((f) => f.rule_id).join(", ")}`);
      }
    }
    if (exp.staff_handling === "failed") {
      const missed = scored.filter((f) => f.resolution?.status === "missed");
      if (missed.length === 0) fail(`failed call produced no missed events`);
    }

    if (failures === before) log(`  ok`);
  }

  log("");
  if (failures > 0) {
    log(`${failures} failure(s)`);
    process.exit(1);
  }
  log("all fixtures pass");
}

main();
