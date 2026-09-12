import { readFileSync } from "node:fs";
import { LiveDetector, detect } from "../src/detector/index.js";
async function main() {
  const t = JSON.parse(readFileSync("fixtures/call_003_missed_notice.json","utf8"));
  const live = new LiveDetector(t.call_id);
  for (const turn of t.turns) {
    const fresh = await live.push(turn);
    for (const f of fresh) console.log(`LIVE @${turn.start_ms}ms -> ${f.rule_id}: ${f.staff_prompt}`);
  }
  const final = await live.finalise();
  console.log("finalise:", final.map(f=>`${f.rule_id}=${f.resolution?.status}`).join(", "));

  // hybrid with a stub adjudicator that accepts everything, to prove unclear candidates route
  const t2 = JSON.parse(readFileSync("fixtures/call_002_temporary_difficulty.json","utf8"));
  const greedy = async () => ({ is_hardship_notice: true, basis: "inability" as const, confidence: 0.9 });
  console.log("call_002 rules :", (await detect(t2,{mode:"rules"})).length, "flags");
  console.log("call_002 hybrid(greedy stub):", (await detect(t2,{mode:"hybrid",adjudicator:greedy})).length, "flags  <- 0 means the 'delay' verdict was never sent to the model");

}
main();
