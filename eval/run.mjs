// eval/run.mjs — scores the live flag engine against eval/cases.json.
//
// It runs the real Netlify handler in-process (Node 24 strips the TypeScript
// itself), so what gets measured is exactly what the app calls. It reports;
// it never gates. Exit code is always 0.
//
//   node eval/run.mjs                              default model chain
//   node eval/run.mjs --model gemini-2.5-flash-lite
//   node eval/run.mjs --limit 10 --concurrency 2
//   node eval/run.mjs --blind    send the newest line as speaker "unknown" so
//                                speaker accuracy measures inference, not echo
//
// Preview by default. --publish writes both artifacts after a full, error-free
// standard run. Never pass --publish with mocked model responses.

import fs from "node:fs";
import { publishResults } from "./publish.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const ENV_FILES = [path.join(ROOT, ".env"), "C:/Coding/.env.shared"];
const MAX_ATTEMPTS = 5;
const RETRYABLE = /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|fetch failed/i;

// ---------------------------------------------------------------- args
function parseArgs(argv) {
  const out = { model: undefined, limit: Infinity, concurrency: 3, blind: false, publish: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--model") out.model = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--concurrency") out.concurrency = Number(argv[++i]);
    else if (a === "--blind") out.blind = true;
    else if (a === "--publish") out.publish = true;
  }
  if (!Number.isFinite(out.concurrency) || out.concurrency < 1) out.concurrency = 3;
  if (!(out.limit > 0)) out.limit = Infinity;
  return out;
}

// ---------------------------------------------------------------- env
// Only GEMINI_API_KEY is read. Nothing from these files is ever printed.
function loadKey() {
  if (process.env.GEMINI_API_KEY) return "environment";
  for (const file of ENV_FILES) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
      if (key !== "GEMINI_API_KEY") continue;
      let value = line.slice(eq + 1).trim();
      if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
      if (value) {
        process.env.GEMINI_API_KEY = value;
        return file;
      }
    }
  }
  return null;
}

// Strip the key from any text that might echo it (defensive; the engine's
// error messages should never contain it, but the URL carries it).
function scrub(text) {
  let s = String(text ?? "");
  const key = process.env.GEMINI_API_KEY;
  if (key) s = s.split(key).join("[redacted]");
  return s.replace(/([?&]key=)[^&\s"']+/gi, "$1[redacted]");
}

// ---------------------------------------------------------------- helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const fmt = (x) => (x == null ? "  -  " : x.toFixed(3));
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function prf(tp, fp, fn) {
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  let f1 = null;
  if (precision != null && recall != null) f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  else if (precision != null || recall != null) f1 = 0;
  return { precision, recall, f1 };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function pool(items, n, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------- main
async function main() {
  const args = parseArgs(process.argv.slice(2));

  const keySource = loadKey();
  if (!keySource) {
    console.log("GEMINI_API_KEY not found in the environment, ./.env or C:/Coding/.env.shared. Nothing to run.");
    return;
  }
  console.log(`key: ${keySource === "environment" ? "environment" : path.basename(keySource)}`);

  const [{ handle: handler }, { SIGN_KEYS, REQUEST_KEY }] = await Promise.all([
    import("../supabase/functions/api/flags.ts"),
    import("../supabase/functions/_shared/signs.ts"),
  ]);

  const allCases = JSON.parse(fs.readFileSync(path.join(HERE, "cases.json"), "utf8"));
  const cases = allCases.slice(0, args.limit);
  for (const c of cases) {
    for (const k of [...c.expect, ...(c.existingKeys ?? [])]) {
      if (!SIGN_KEYS.includes(k)) console.log(`WARNING ${c.id}: key "${k}" is not in signs.ts`);
    }
    // The engine drops the ABA tip unless a notice is on record, so a case that
    // expects it without one can never pass — say so rather than scoring a zero.
    if (c.expect.includes("inform-hardship-provisions") &&
        !c.expect.includes("hardship-request") && !(c.existingKeys ?? []).includes("hardship-request")) {
      console.log(`WARNING ${c.id}: expects inform-hardship-provisions with no hardship-request on record`);
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  console.log(
    `running ${cases.length} cases, concurrency ${args.concurrency}, model ${args.model ?? "(engine default)"}${args.blind ? ", blind speaker" : ""}\n`,
  );

  async function runCase(c) {
    const lines = [...c.context, c.line].map((l, i) => ({ id: `l${i + 1}`, speaker: l.speaker, text: l.text }));
    const newLine = lines[lines.length - 1];
    if (args.blind) newLine.speaker = "unknown";
    const body = {
      lines,
      newLineId: newLine.id,
      // A case may name signs already on screen. inform-hardship-provisions
      // cannot be scored without this: its whole rule is that the duty exists
      // only once a notice has been raised, and with this hardcoded to [] its
      // precondition was unexpressible, which is why it sat at support 0.
      existingKeys: c.existingKeys ?? [],
      lessons: c.lessons ?? [],
      todayISO,
      direction: c.direction,
    };
    if (args.model) body.model = args.model;

    let lastError = "";
    let attempts = 0;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attempts = attempt;
      const t0 = Date.now();
      let res;
      try {
        res = await handler(
          new Request("http://x/api/flags", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        );
      } catch (e) {
        // The handler threw instead of returning a Response: that is an engine fault, not a rate limit.
        lastError = scrub(e?.stack ?? e?.message ?? e);
        break;
      }
      const ms = Date.now() - t0;
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.status === 200) {
        const signs = Array.isArray(data.signs) ? data.signs : [];
        return {
          id: c.id,
          ok: true,
          got: signs.map((s) => s.key),
          signs,
          speaker: data.speaker ?? "unknown",
          model: data.model,
          ms,
          modelMs: data.ms ?? null,
          attempts,
        };
      }
      lastError = scrub(data.error ?? `HTTP ${res.status}`);
      if (!RETRYABLE.test(lastError) || attempt === MAX_ATTEMPTS) break;
      await sleep(1500 * attempt + Math.floor(Math.random() * 500));
    }
    return { id: c.id, ok: false, got: [], signs: [], speaker: "error", model: undefined, ms: null, modelMs: null, attempts, error: lastError.slice(0, 400) };
  }

  // The two tiers are different outcomes, and cases.json has no vocabulary for
  // the second one: every label is a flat key, written before the request tier
  // existed. So the headline score is computed on the NOTICE tier alone — the
  // same arithmetic over the same labels as every previous run, directly
  // comparable — and requests are reported beside it, never folded into it.
  // Relabelling a case to absorb the new outcome is the one thing that would
  // make these numbers meaningless.
  const isRequest = (key) => key === REQUEST_KEY;
  const noticeKeys = (keys) => keys.filter((k) => !isRequest(k));
  const requestKeys = (keys) => keys.filter(isRequest);

  const results = await pool(cases, args.concurrency, async (c) => {
    const r = await runCase(c);
    const exp = new Set(c.expect);
    const got = new Set(noticeKeys(r.got));
    const asked = requestKeys(r.got);
    const verdict = !r.ok ? "ERR " : setEq(exp, got) ? "PASS" : "FAIL";
    const spk = r.ok && r.speaker !== c.line.speaker ? `  speaker=${r.speaker}!` : "";
    const req = asked.length ? `  +request` : "";
    console.log(
      `${verdict} ${c.id}  ${padL(r.ms ?? "-", 5)}ms  expect [${c.expect.join(", ")}]  got [${noticeKeys(r.got).join(", ")}]${req}${spk}${r.ok ? "" : "  " + r.error.split("\n")[0].slice(0, 120)}`,
    );
    return r;
  });

  // ---------------------------------------------------------------- score
  const perKey = {};
  for (const k of SIGN_KEYS) perKey[k] = { support: 0, predicted: 0, tp: 0, fp: 0, fn: 0 };
  let exact = 0;
  let speakerRight = 0;
  const failures = [];

  const naive = { tp: 0, fp: 0, fn: 0 };
  const tierRows = [];

  results.forEach((r, i) => {
    const c = cases[i];
    const exp = new Set(c.expect);
    const got = new Set(noticeKeys(r.got));

    // The second, deliberately unflattering number: score the request as if it
    // were a prediction against these labels. It is what the flat label set
    // would say, and it is why a tier-aware label set is a question for laural.
    const gotAll = new Set(r.got);
    for (const k of exp) {
      if (gotAll.has(k)) naive.tp++;
      else naive.fn++;
    }
    for (const k of gotAll) if (!exp.has(k)) naive.fp++;

    if (c.expect.includes("hardship-request")) {
      tierRows.push({
        id: c.id,
        outcome: got.has("hardship-request") ? "notice" : requestKeys(r.got).length ? "request" : "silent",
        text: c.line.text,
      });
    }
    for (const k of exp) {
      perKey[k].support++;
      if (got.has(k)) perKey[k].tp++;
      else perKey[k].fn++;
    }
    for (const k of got) {
      if (!perKey[k]) perKey[k] = { support: 0, predicted: 0, tp: 0, fp: 0, fn: 0 };
      perKey[k].predicted++;
      if (!exp.has(k)) perKey[k].fp++;
    }
    const isExact = r.ok && setEq(exp, got);
    if (isExact) exact++;
    if (r.ok && r.speaker === c.line.speaker) speakerRight++;
    if (!isExact) {
      failures.push({
        id: c.id,
        direction: c.direction,
        text: c.line.text,
        expect: c.expect,
        got: noticeKeys(r.got),
        requests: requestKeys(r.got),
        missing: c.expect.filter((k) => !got.has(k)),
        extra: noticeKeys(r.got).filter((k) => !exp.has(k)),
        speaker: r.speaker,
        evidence: r.signs.map((s) => `${s.key}: "${s.evidence}" (${s.confidence})`),
        ...(r.ok ? {} : { error: r.error }),
      });
    }
  });

  let TP = 0, FP = 0, FN = 0;
  for (const k of Object.keys(perKey)) {
    const v = perKey[k];
    TP += v.tp; FP += v.fp; FN += v.fn;
    Object.assign(v, prf(v.tp, v.fp, v.fn));
  }
  const overallPRF = prf(TP, FP, FN);
  const n = cases.length;
  const errors = results.filter((r) => !r.ok).length;
  const lat = results.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
  const latency = {
    p50: percentile(lat, 50),
    p95: percentile(lat, 95),
    mean: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
    min: lat[0] ?? null,
    max: lat[lat.length - 1] ?? null,
  };
  const modelName = args.model ?? results.find((r) => r.model)?.model ?? "unknown";

  // ---------------------------------------------------------------- print
  console.log("");
  console.log(`${pad("key", 18)} ${padL("sup", 4)} ${padL("pred", 4)} ${padL("tp", 3)} ${padL("fp", 3)} ${padL("fn", 3)}   ${pad("P", 5)}  ${pad("R", 5)}  ${pad("F1", 5)}`);
  for (const k of Object.keys(perKey)) {
    const v = perKey[k];
    if (!v.support && !v.predicted) continue;
    console.log(`${pad(k, 18)} ${padL(v.support, 4)} ${padL(v.predicted, 4)} ${padL(v.tp, 3)} ${padL(v.fp, 3)} ${padL(v.fn, 3)}   ${fmt(v.precision)}  ${fmt(v.recall)}  ${fmt(v.f1)}`);
  }
  console.log(`${pad("MICRO overall", 18)} ${padL(TP + FN, 4)} ${padL(TP + FP, 4)} ${padL(TP, 3)} ${padL(FP, 3)} ${padL(FN, 3)}   ${fmt(overallPRF.precision)}  ${fmt(overallPRF.recall)}  ${fmt(overallPRF.f1)}`);
  console.log("");
  console.log(`model              ${modelName}`);
  console.log(`exact-set accuracy ${exact}/${n} = ${fmt(n ? exact / n : null)}`);
  console.log(`speaker accuracy   ${speakerRight}/${n} = ${fmt(n ? speakerRight / n : null)}${args.blind ? "  (blind)" : "  (speaker label was in the transcript)"}`);
  console.log(`latency            p50 ${latency.p50 ?? "-"}ms  p95 ${latency.p95 ?? "-"}ms  mean ${latency.mean ?? "-"}ms  (${lat.length} ok, ${errors} errors)`);
  if (failures.length) {
    console.log(`\nFAILURES (${failures.length})`);
    for (const f of failures) {
      const why = f.error
        ? `ERROR ${f.error.split("\n")[0].slice(0, 100)}`
        : `missing [${f.missing.join(", ")}] extra [${f.extra.join(", ")}]${f.requests?.length ? " raised-a-request" : ""}`;
      console.log(`  ${f.id}  ${why}  "${f.text.length > 70 ? f.text.slice(0, 67) + "..." : f.text}"`);
    }
  }

  // ------------------------------------------------------- the second tier
  // Not folded into the score above. cases.json labels a case
  // "hardship-request" or nothing; it cannot say "this is a request, not a
  // notice", so the only honest thing to print is what actually happened.
  const naivePRF = prf(naive.tp, naive.fp, naive.fn);
  const counts = { notice: 0, request: 0, silent: 0 };
  for (const row of tierRows) counts[row.outcome]++;
  console.log(`\nTIER — the ${tierRows.length} cases labelled hardship-request`);
  console.log(`  notice   ${counts.notice}   s72 engaged, 21-day clock, stored and scored`);
  console.log(`  request  ${counts.request}   worker prompted to ask; no clock, not stored, not scored`);
  console.log(`  silent   ${counts.silent}   nothing raised`);
  for (const row of tierRows.filter((r) => r.outcome !== "notice")) {
    console.log(`    ${pad(row.outcome, 8)} ${row.id}  "${row.text.length > 62 ? row.text.slice(0, 59) + "..." : row.text}"`);
  }
  console.log(
    `\n  cases.json has no label for a request, so the score above counts only the notice tier —\n  the same arithmetic over the same labels as every earlier run. Scored the other way, with\n  a request treated as a prediction against these flat labels: P ${fmt(naivePRF.precision)}  R ${fmt(naivePRF.recall)}  F1 ${fmt(naivePRF.f1)}.`,
  );

  // ---------------------------------------------------------------- write
  const out = {
    model: modelName,
    ranAt: new Date().toISOString(),
    n,
    blind: args.blind,
    errors,
    overall: {
      precision: round(overallPRF.precision),
      recall: round(overallPRF.recall),
      f1: round(overallPRF.f1),
      exact: round(n ? exact / n : null),
      tp: TP,
      fp: FP,
      fn: FN,
    },
    perKey: Object.fromEntries(
      Object.entries(perKey).map(([k, v]) => [
        k,
        { support: v.support, predicted: v.predicted, tp: v.tp, fp: v.fp, fn: v.fn, precision: round(v.precision), recall: round(v.recall), f1: round(v.f1) },
      ]),
    ),
    // The headline `overall` above is the NOTICE tier only. These two are the
    // request tier, kept separate on purpose: a request is a different
    // outcome, and no label in cases.json expresses it.
    requestTier: {
      key: REQUEST_KEY,
      scored: false,
      labelledHardship: tierRows.length,
      outcomes: counts,
      rows: tierRows,
      ifScoredAgainstFlatLabels: {
        precision: round(naivePRF.precision),
        recall: round(naivePRF.recall),
        f1: round(naivePRF.f1),
        tp: naive.tp,
        fp: naive.fp,
        fn: naive.fn,
      },
    },
    speakerAccuracy: round(n ? speakerRight / n : null),
    latency,
    failures,
    cases: results.map((r, i) => ({
      id: cases[i].id,
      expect: cases[i].expect,
      got: noticeKeys(r.got),
      requests: requestKeys(r.got),
      ok: r.ok,
      speaker: r.speaker,
      ms: r.ms,
      attempts: r.attempts,
    })),
  };
  console.log(publishResults({
    publish: args.publish, blind: args.blind, total: allCases.length, results: out,
    paths: [path.join(HERE, "results.json"), path.join(ROOT, "public/eval-results.json")],
  }));
}

try {
  await main();
} catch (e) {
  console.log(`eval crashed: ${scrub(e?.stack ?? e?.message ?? e)}`);
}
process.exitCode = 0;
