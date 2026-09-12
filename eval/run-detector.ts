/**
 * Runs the detector against every fixture and diffs the result against
 * fixtures/expected/expected_flags.json.
 *
 *   npx tsx eval/run-detector.ts
 *
 * Deterministic mode only — no API key, no network, no rate limit.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { detect } from "../src/detector/index.js";
import type { Flag, Transcript } from "../src/detector/index.js";

const FIXTURES = join(process.cwd(), "fixtures");
const expected = JSON.parse(readFileSync(join(FIXTURES, "expected", "expected_flags.json"), "utf8"));
const TOLERANCE = expected.tolerance_ms ?? 3000;

type Expect = {
  must_flag: Array<{ rule_id: string; trigger_turn_start_ms?: number; escalated_at_ms?: number }>;
  must_not_flag: Array<{ rule_id: string }>;
  staff_handling?: string;
};

const log = (s: string) => console.log(s);
let failures = 0;

async function main() {

  for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort()) {
    const transcript = JSON.parse(readFileSync(join(FIXTURES, file), "utf8")) as Transcript;
    const exp: Expect | undefined = expected[transcript.call_id];
    if (!exp) {
      log(`SKIP ${file} — no expectation for ${transcript.call_id}`);
      continue;
    }

    const flags: Flag[] = await detect(transcript, { mode: "rules" });
    log(`\n${transcript.call_id} (${file})`);
    log(`  emitted ${flags.length} flag(s)`);
    for (const f of flags) {
      const esc = f.escalated_at ? `, escalated ${f.escalated_at.start_ms}ms` : "";
      log(
        `    ${f.rule_id} @${f.raised_at.start_ms}ms${esc} -> ${f.resolution?.status}` +
          (f.resolution?.evidence ? ` (evidence @${f.resolution.evidence.start_ms}ms)` : "")
      );
    }

    // 1. every must_flag present, at the right moment
    for (const want of exp.must_flag) {
      const got = flags.find((f) => f.rule_id === want.rule_id);
      if (!got) {
        log(`  FAIL missing flag ${want.rule_id}`);
        failures++;
        continue;
      }
      if (want.trigger_turn_start_ms != null) {
        const drift = Math.abs(got.raised_at.start_ms - want.trigger_turn_start_ms);
        if (drift > TOLERANCE) {
          log(
            `  FAIL ${want.rule_id} raised at ${got.raised_at.start_ms}ms, expected ~${want.trigger_turn_start_ms}ms (drift ${drift}ms)`
          );
          failures++;
        }
      }
      if (want.escalated_at_ms != null) {
        const at = got.escalated_at?.start_ms;
        if (at == null || Math.abs(at - want.escalated_at_ms) > TOLERANCE) {
          log(`  FAIL ${want.rule_id} escalated_at ${at ?? "missing"}, expected ~${want.escalated_at_ms}ms`);
          failures++;
        }
      }
    }

    // 2. nothing in must_not_flag was emitted
    for (const forbidden of exp.must_not_flag) {
      if (flags.some((f) => f.rule_id === forbidden.rule_id)) {
        log(`  FAIL false positive: ${forbidden.rule_id} must not fire on this call`);
        failures++;
      }
    }

    // 3. resolution status matches how the staff member actually handled it
    if (exp.staff_handling === "correct" && exp.must_flag.length > 0) {
      const unresolved = flags.filter(
        (f) => f.resolution?.status === "missed"
      );
      if (unresolved.length > 0) {
        log(`  FAIL well-handled call has missed flags: ${unresolved.map((f) => f.rule_id).join(", ")}`);
        failures++;
      }
    }
    if (exp.staff_handling === "failed") {
      const missed = flags.filter((f) => f.resolution?.status === "missed");
      if (missed.length === 0) {
        log(`  FAIL failed call produced no missed flags`);
        failures++;
      }
    }

    if (failures === 0) log(`  ok`);
  }

  log("");
  if (failures > 0) {
    log(`${failures} failure(s)`);
    process.exit(1);
  }
  log("all fixtures pass");

}

main();
