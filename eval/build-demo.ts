/**
 * Builds demo/ab-demo.html — a self-contained A/B demo page.
 *
 *   npx tsx eval/build-demo.ts
 *
 * The page is a PLAYER, not a second detector. Every event in it is produced
 * here by the real detector and inlined, so there is exactly one source of
 * truth for what fires and when. Re-run this after any change to the rules.
 *
 * No network, no API key, no fonts, no CDN. Open the file from disk and it
 * works, which is the point: it is the demo and the fallback in one artefact.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { detect } from "../src/detector/index.js";
import { compareCoaching } from "../src/demo/replay.js";
import type { Transcript } from "../src/detector/index.js";

const ROOT = process.cwd();
const SILENT = "call_003_missed_notice.json";
const COACHED = "call_003c_coached.json";

const load = (f: string): Transcript & { diverges_at_ms?: number } =>
  JSON.parse(readFileSync(join(ROOT, "fixtures", f), "utf8"));

async function main() {
  const silent = load(SILENT);
  const coached = load(COACHED);

  const silentFlags = await detect(silent, { mode: "rules" });
  const coachedFlags = await detect(coached, { mode: "rules" });
  const cmp = await compareCoaching(silent);

  const divergesAt = coached.diverges_at_ms ?? 45000;

  // The claim the demo makes, checked rather than asserted: identical customer
  // words up to the divergence, and the same events at the same milliseconds.
  const prefix = (t: Transcript) =>
    JSON.stringify(t.turns.filter((x) => x.start_ms <= divergesAt));
  if (prefix(silent) !== prefix(coached)) {
    throw new Error("the two transcripts differ before the divergence point");
  }
  const sig = (fs: typeof silentFlags) =>
    fs.map((f) => f.rule_id + "@" + f.raised_at.start_ms).join(",");
  const shared = (fs: typeof silentFlags) => fs.filter((f) => f.raised_at.start_ms <= divergesAt);
  if (sig(shared(silentFlags)) !== sig(shared(coachedFlags))) {
    throw new Error("the two runs raise different events before the divergence point");
  }
  console.log(
    "verified: identical up to " + divergesAt + "ms, same events raised, " +
      silentFlags.filter((f) => f.resolution?.status === "missed").length + " missed silent vs " +
      coachedFlags.filter((f) => f.resolution?.status === "satisfied").length + " satisfied coached"
  );

  // The invariant the demo is built on: identical analysis, different display.
  if (cmp.shownWithoutCoaching.length !== 0) {
    throw new Error("coaching off displayed something — the switch is leaking");
  }
  if (cmp.shownWithCoaching.length === 0) {
    throw new Error("coaching on displayed nothing — no events to demo");
  }
  console.log(
    `display gate holds: shown with coaching ${cmp.shownWithCoaching.length}, without 0`
  );

  const data = JSON.stringify(
    {
      divergesAt,
      off: { transcript: silent, flags: silentFlags },
      on: { transcript: coached, flags: coachedFlags },
    },
    null,
    0
  ).replace(/</g, "\\u003c");
  const html = PAGE.replace("__DATA__", data);

  mkdirSync(join(ROOT, "demo"), { recursive: true });
  const out = join(ROOT, "demo", "ab-demo.html");
  writeFileSync(out, html);
  console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} kB)`);
}

const PAGE = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Hard Call — coaching off vs on</title>
<style>
  :root{
    --ink:#0a1628; --ink-2:#12213c; --line:#1e3358; --paper:#f6f8fc;
    --muted:#8aa0c4; --white:#ffffff;
    --gold:#e8b53f; --gold-dim:#8a6c25;
    --bad:#e8654f; --good:#4fc98a;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ink);color:var(--paper);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    padding-block:24px;padding-left:20px;padding-right:20px}
  .wrap{max-width:1080px;margin:0 auto}
  h1{font-size:20px;margin:0 0 4px;letter-spacing:-0.01em}
  .sub{color:var(--muted);font-size:13px;margin:0 0 20px}
  .controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:20px}
  button{font:inherit;font-weight:600;padding:9px 16px;border-radius:8px;cursor:pointer;
    border:1px solid var(--line);background:var(--ink-2);color:var(--paper)}
  button.primary{background:var(--gold);border-color:var(--gold);color:#241a04}
  button:disabled{opacity:.45;cursor:default}
  select{font:inherit;padding:8px 10px;border-radius:8px;background:var(--ink-2);
    color:var(--paper);border:1px solid var(--line)}
  .mode{margin-left:auto;font-size:13px;color:var(--muted)}
  .grid{display:grid;grid-template-columns:1fr 380px;gap:18px;align-items:start}
  @media (max-width:820px){.grid{grid-template-columns:1fr}}
  .panel{background:var(--ink-2);border:1px solid var(--line);border-radius:12px;padding:16px;min-height:120px}
  .panel h2{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);
    margin:0 0 12px;font-weight:600}
  .turn{margin:0 0 12px;display:flex;gap:10px}
  .who{flex:0 0 62px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;
    color:var(--muted);padding-top:3px}
  .who.cust{color:var(--gold)}
  .said{flex:1}
  .t{font-variant-numeric:tabular-nums;color:var(--muted);font-size:11px;margin-left:6px}
  .empty{color:var(--muted);font-size:13px;font-style:italic}
  .flag{border:1px solid var(--gold-dim);background:#1a1405;border-radius:10px;
    padding:12px;margin-bottom:10px;animation:in .35s ease}
  .flag.req{border-color:var(--line);background:#101c33}
  @keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .tag{display:inline-block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;
    font-weight:700;padding:2px 7px;border-radius:999px;background:var(--gold);color:#241a04}
  .tag.req{background:var(--line);color:var(--paper)}
  .flag h3{font-size:14px;margin:8px 0 4px}
  .flag p{margin:0;font-size:13px;color:#cfdcf2}
  .due{margin-top:10px;padding-top:9px;border-top:1px solid var(--gold-dim);
    font-size:13px;font-weight:700;color:var(--gold);font-variant-numeric:tabular-nums}
  .auth{font-size:11px;color:var(--muted);margin-top:6px}
  .card{margin-top:18px}
  .row{display:flex;gap:10px;padding:11px 0;border-top:1px solid var(--line);align-items:flex-start}
  .row:first-of-type{border-top:0}
  .pill{flex:0 0 auto;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
    padding:3px 8px;border-radius:999px}
  .pill.missed{background:#3a1410;color:var(--bad);border:1px solid var(--bad)}
  .pill.satisfied{background:#0d2a1d;color:var(--good);border:1px solid var(--good)}
  .pill.unverified{background:#2a2410;color:var(--gold);border:1px solid var(--gold-dim)}
  .row .body{flex:1}
  .row .body b{display:block;font-size:13px;margin-bottom:2px}
  .row .body span{font-size:12px;color:var(--muted)}
  .diverge{display:flex;align-items:center;gap:10px;margin:4px 0 14px;color:var(--gold);
    font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
  .diverge::before,.diverge::after{content:"";flex:1;height:1px;background:var(--gold-dim)}
  .note{margin-top:16px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px}
  .note b{color:var(--paper)}
</style>
</head>
<body>
<div class="wrap">
  <h1>The Hard Call</h1>
  <p class="sub">The same call, twice. Identical up to 0:45, then the coaching fires. Nothing here touches the network.</p>

  <div class="controls">
    <button id="off">Run without coaching</button>
    <button id="on" class="primary">Run with coaching</button>
    <select id="speed">
      <option value="4">4&times;</option>
      <option value="8" selected>8&times;</option>
      <option value="1">real time</option>
    </select>
    <span class="mode" id="mode"></span>
  </div>

  <div class="grid">
    <div>
      <div class="panel">
        <h2>Call</h2>
        <div id="transcript"><p class="empty">Press a button to start.</p></div>
      </div>
      <div class="panel card" id="cardWrap" hidden>
        <h2>Report card</h2>
        <div id="card"></div>
      </div>
    </div>
    <div class="panel">
      <h2>On the worker's screen</h2>
      <div id="flags"><p class="empty">Nothing yet.</p></div>
    </div>
  </div>

  <p class="note" id="verdict" hidden></p>
</div>

<script>
const DATA = __DATA__;
const SET = (coaching) => (coaching ? DATA.on : DATA.off);
const $ = (id) => document.getElementById(id);
let timer = null, run = 0;

const fmt = (ms) => {
  const s = Math.floor(ms/1000);
  return String(Math.floor(s/60)) + ":" + String(s%60).padStart(2,"0");
};
const due = (days) => {
  if (days == null) return null;
  const d = new Date(); d.setDate(d.getDate()+days);
  return d.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
};

function reset() {
  run++;
  if (timer) { clearTimeout(timer); timer = null; }
  $("transcript").innerHTML = "";
  $("flags").innerHTML = '<p class="empty">Nothing yet.</p>';
  $("card").innerHTML = "";
  $("cardWrap").hidden = true;
  $("verdict").hidden = true;
}

function addTurn(turn) {
  const el = document.createElement("div");
  el.className = "turn";
  const cust = turn.speaker === "customer";
  el.innerHTML =
    '<div class="who ' + (cust ? "cust" : "") + '">' + (cust ? "Customer" : "Worker") + '</div>' +
    '<div class="said">' + turn.text.replace(/&/g,"&amp;").replace(/</g,"&lt;") +
    '<span class="t">' + fmt(turn.start_ms) + '</span></div>';
  $("transcript").appendChild(el);
  el.scrollIntoView({block:"nearest"});
}

function addFlag(f) {
  if ($("flags").querySelector(".empty")) $("flags").innerHTML = "";
  const isReq = f.kind === "request";
  const el = document.createElement("div");
  el.className = "flag" + (isReq ? " req" : "");
  const d = due(f.deadline_days);
  el.innerHTML =
    '<span class="tag' + (isReq ? " req" : "") + '">' +
      (isReq ? "Check this" : "Legal · clock started") + '</span>' +
    '<h3>' + f.obligation + '</h3>' +
    '<p>' + f.staff_prompt + '</p>' +
    (d ? '<div class="due">Decision due ' + d + ' · ' + f.deadline_days + ' days</div>' : '') +
    '<div class="auth">' + f.authority + ' · raised at ' + fmt(f.raised_at.start_ms) + '</div>';
  $("flags").appendChild(el);
}

function divider() {
  const el = document.createElement("div");
  el.className = "diverge";
  el.innerHTML = '<span>coaching fired here \u2014 everything above is identical in both runs</span>';
  $("transcript").appendChild(el);
}

function showCard(coaching) {
  const scored = SET(coaching).flags.filter(f => !f.superseded_by);
  $("card").innerHTML = scored.map(f => {
    const r = f.resolution || {};
    const ev = r.evidence ? " Evidence at " + fmt(r.evidence.start_ms) + "." : "";
    return '<div class="row">' +
      '<span class="pill ' + r.status + '">' + r.status + '</span>' +
      '<div class="body"><b>' + f.obligation + '</b>' +
      '<span>' + f.authority + '. Raised at ' + fmt(f.raised_at.start_ms) + '.' + ev + '</span></div></div>';
  }).join("");
  $("cardWrap").hidden = false;

  const missed = scored.filter(f => (f.resolution||{}).status === "missed").length;
  const ok = scored.filter(f => (f.resolution||{}).status === "satisfied").length;
  $("verdict").hidden = false;
  $("verdict").innerHTML = coaching
    ? '<b>With coaching \u2014 every duty that can be settled on the call was settled.</b> ' + ok + ' handled, and the written-notice duty is marked unverified because it is discharged after the call by a system action, not by anything said on it. The prompt fired at 0:45, the moment Mei said she could not cover the repayment for four or five months. The worker named the hardship process, started the clock on the record and paused collections. Up to 0:45 this is the same call as the other run, word for word.'
    : '<b>Without coaching \u2014 ' + missed + ' obligations missed.</b> Identical words from the customer, identical analysis underneath. The worker simply never saw it, and offered an informal arrangement instead, which starts no clock and leaves no record that a decision is owed. That is the failure ASIC penalised NAB and AFSH $15.5m for in August 2025, across 345 customers.';
}

async function play(coaching) {
  reset();
  const mine = run;
  const speed = Number($("speed").value);
  $("mode").textContent = coaching ? "coaching ON" : "coaching OFF";
  $("on").disabled = $("off").disabled = true;

  const set = SET(coaching);
  const turns = set.transcript.turns;
  let clock = 0, i = 0, marked = false;

  const step = () => {
    if (mine !== run) return;
    if (i >= turns.length) {
      showCard(coaching);
      $("on").disabled = $("off").disabled = false;
      return;
    }
    const turn = turns[i];
    if (!marked && turn.start_ms > DATA.divergesAt) { divider(); marked = true; }
    addTurn(turn);
    if (coaching) {
      set.flags
        .filter(f => f.raised_at.start_ms === turn.start_ms)
        .forEach(addFlag);
    }
    clock = turn.start_ms;
    const next = i + 1 < turns.length ? turns[i+1].start_ms : clock + 800;
    i++;
    timer = setTimeout(step, Math.max(120, (next - clock) / speed));
  };
  step();
}

$("off").onclick = () => play(false);
$("on").onclick = () => play(true);
</script>
</body>
</html>
`;

main();
