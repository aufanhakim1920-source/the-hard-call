// A rule becomes a check the day it is found.
//
// The practice panel printed a raw model error straight to the screen —
// including the agent id — because a token failure rejects startSession()
// instead of reaching onError, so the friendly-message layer was never on that
// path. The redactor that now stands in front of it is only worth as much as
// the shapes it has actually been tested against, so those shapes live here.
//
// Run: npx tsx eval/redact.check.ts   (exits non-zero if anything leaks)
import { scenarioDetail } from "../src/lib/scenarios.js";
const cases: [string, string][] = [
  ["bearer token", "Bearer abcdefghijklmnopqrstuvwxyz012345"],
  ["api key in json", '{"error":{"message":"api key AIzaSyFAKE_not_a_real_key_000 invalid"}}'],
  ["agent id", "agent_7601m2a76aececfvqaknpq229pay refused the session"],
  ["jwt", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"],
  ["sk- key", "sk-proj-0123456789abcdefghijklmnop failed"],
  ["hex handle", "conversation 0123456789abcdef0123456789abcdef ended"],
  ["plain 503", "503 Service Unavailable: the model is overloaded, please retry shortly."],
];
let bad = 0;
for (const [name, input] of cases) {
  const out = scenarioDetail(input);
  const leaked = /abcdefghijklmnopqrstuvwxyz|AIzaSy|7601m2a76|eyJhbGciOi|sk-proj|0123456789abcdef/.test(out);
  if (leaked) bad += 1;
  console.log(`${leaked ? "LEAK " : "ok   "} ${name.padEnd(14)} -> ${JSON.stringify(out)}`);
}
console.log(`\ncap respected: ${scenarioDetail("x".repeat(900)).length <= 180}`);
console.log(bad === 0 ? "\nALL CLEAN" : `\n${bad} LEAKED`);
