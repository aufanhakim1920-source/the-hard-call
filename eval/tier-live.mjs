// npm run eval:tier — the two-tier gate, checked end to end.
//
// One question matters more than the rest: CAN A REQUEST EAT A NOTICE?
// The engine refuses to fire a key that is already on screen, so if an early
// hint and the statutory notice shared a key, a hint raised at turn 2 would
// silently cancel the s72 flag at turn 4. That is the worst regression this
// change could introduce, so it is a test, not a comment.
//
// Three scripted calls, run turn by turn exactly as the live app does:
//   A  hint, then a stated inability   → request, THEN the notice
//   B  named recovery                  → nothing, ever
//   C  hint only                       → a request and no clock

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.GEMINI_API_KEY) {
  for (const f of [join(root, ".env"), "C:/Coding/.env.shared"]) {
    try {
      for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim());
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
      if (process.env.GEMINI_API_KEY) break;
    } catch { /* next candidate */ }
  }
}
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not found in .env or C:/Coding/.env.shared");
  process.exit(0);
}

const { handle } = await import("../supabase/functions/api/flags.ts");
const todayISO = new Date().toISOString().slice(0, 10);

async function turnByTurn(script, direction) {
  const lines = [];
  const keys = new Set();
  const perTurn = [];
  for (let i = 0; i < script.length; i++) {
    lines.push({ id: `t${i}`, speaker: script[i][0], text: script[i][1] });
    const res = await handle(new Request("http://local/api/flags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines, newLineId: `t${i}`, existingKeys: [...keys], lessons: [], todayISO, direction }),
    }));
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? `flags ${res.status}`);
    for (const s of body.signs ?? []) keys.add(s.key);
    perTurn.push(body.signs ?? []);
  }
  return perTurn;
}

const CALLS = [
  {
    name: "A  hint first, inability later — the notice must still fire",
    direction: "outbound",
    script: [
      ["worker", "Hi, it's the bank calling about the repayment that was due on Monday. Is now an okay time?"],
      ["customer", "Yeah look, I'm a bit behind at the moment, things are pretty tight."],
      ["worker", "Sorry to hear that. Has something changed?"],
      ["customer", "I've been signed off work since July and I won't be back until at least February. I can't cover the repayment next month or the month after — it's going to be like this for four or five months."],
    ],
    checks: [
      { turn: 1, want: ["ask-about-hardship"], not: ["hardship-request"], why: "difficulty language, no period stated — a prompt to ask, not a clock" },
      { turn: 3, want: ["hardship-request"], not: [], why: "THE REGRESSION TEST: the earlier request must not block the s72 notice" },
    ],
  },
  {
    name: "B  named recovery — silence, not even a request",
    direction: "inbound",
    script: [
      ["worker", "Thanks for calling, how can I help today?"],
      ["customer", "Any chance we can push the payment back a couple of weeks? I get paid on the twentieth and I'll be square after that, the normal repayment is fine."],
    ],
    checks: [
      { turn: 1, want: [], not: ["hardship-request", "ask-about-hardship"], why: "a person who is fine; firing anything here is the worst error this system can make" },
    ],
  },
  {
    name: "C  hint only — a request, and no clock on it",
    direction: "outbound",
    script: [
      ["worker", "Just calling about the personal loan repayment that bounced on Friday."],
      ["customer", "I'm going to need a bit more time. Is there something we can work out?"],
    ],
    checks: [
      { turn: 1, want: ["ask-about-hardship"], not: ["hardship-request"], why: "no period, no recovery" },
    ],
  },
];

let failures = 0;
for (const call of CALLS) {
  console.log(`\n${call.name}`);
  let perTurn;
  try {
    perTurn = await turnByTurn(call.script, call.direction);
  } catch (e) {
    console.log(`  ERROR ${String(e.message ?? e).slice(0, 160)}`);
    failures++;
    continue;
  }
  perTurn.forEach((signs, i) => {
    if (call.script[i][0] !== "customer" && !signs.length) return;
    console.log(`  turn ${i} [${call.script[i][0]}] -> ${signs.length ? signs.map((s) => `${s.key}(${s.tier ?? "-"}${s.dueDays ? `, ${s.dueDays}d` : ""})`).join(", ") : "(none)"}`);
  });
  for (const c of call.checks) {
    const got = (perTurn[c.turn] ?? []).map((s) => s.key);
    const missing = c.want.filter((k) => !got.includes(k));
    const banned = c.not.filter((k) => got.includes(k));
    const ok = !missing.length && !banned.length;
    if (!ok) failures++;
    console.log(`  ${ok ? "PASS" : "FAIL"} turn ${c.turn}: ${c.why}`);
    if (missing.length) console.log(`       missing [${missing.join(", ")}]  got [${got.join(", ") || "none"}]`);
    if (banned.length) console.log(`       must not fire [${banned.join(", ")}]`);
  }
  // A request must carry a question and nothing else.
  for (const signs of perTurn) {
    for (const s of signs.filter((x) => x.tier === "request")) {
      const leaked = ["dueDate", "dueDays", "dueLabel", "source"].filter((f) => s[f] != null);
      if (leaked.length) {
        failures++;
        console.log(`  FAIL request "${s.key}" carries ${leaked.join(", ")} — a request starts no clock`);
      } else {
        console.log(`  PASS request "${s.key}" carries no clock and no authority; asks "${s.askNext}"`);
      }
    }
  }
}

console.log(`\n${failures ? `${failures} check(s) FAILED` : "all checks passed"}\n`);
process.exit(0);
