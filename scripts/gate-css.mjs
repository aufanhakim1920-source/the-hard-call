// The check that stops one bug class coming back.
//
// A bare `1fr` grid track is `minmax(auto, 1fr)`: it will not shrink below its
// widest child. On a phone that is how a page ends up wider than the screen and
// scrolls sideways under a thumb. It cost us a 6px horizontal scroll on the live
// call screen, and the vault had already written the rule down once, after
// Biomate, which is why this is a check now and not another note.
//
// Run: npm run gate

import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const FILES = globSync("src/**/*.css");

// grid-template-columns / -rows / grid-auto-columns / -rows, up to the semicolon.
const DECL = /(grid-(?:template|auto)-(?:columns|rows))\s*:\s*([^;{}]+);/g;

/** Split a track list on top-level spaces, so `minmax(0, 1fr)` stays one token. */
function tracks(value) {
  const out = [];
  let cur = "";
  let depth = 0;
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === " " && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const BARE_FR = /^\d*\.?\d*fr$/;
const REPEAT_BARE = /^repeat\([^,]+,\s*\d*\.?\d*fr\s*\)$/;

const bad = [];
for (const file of FILES) {
  const text = readFileSync(file, "utf8");
  const lineOf = (index) => text.slice(0, index).split("\n").length;
  for (const m of text.matchAll(DECL)) {
    const value = m[2].replace(/\s+/g, " ").trim();
    if (value === "none" || value.startsWith("var(") || value.startsWith("subgrid")) continue;
    for (const t of tracks(value)) {
      if (BARE_FR.test(t) || REPEAT_BARE.test(t)) {
        bad.push({ file, line: lineOf(m.index), prop: m[1], value, track: t });
        break;
      }
    }
  }
}

if (bad.length === 0) {
  console.log(`css gate: ${FILES.length} file(s), every fr track has a zero floor.`);
  process.exit(0);
}

/** The correction to print — a repeat() wraps its own track, not the whole call. */
function suggest(track) {
  const rep = track.match(/^repeat\(([^,]+),\s*(\d*\.?\d*fr)\s*\)$/);
  return rep ? `repeat(${rep[1]}, minmax(0, ${rep[2]}))` : `minmax(0, ${track})`;
}

console.error(`\ncss gate FAILED — ${bad.length} grid track(s) cannot shrink below their widest child.\n`);
for (const b of bad) {
  console.error(`  ${b.file}:${b.line}`);
  console.error(`    ${b.prop}: ${b.value};`);
  console.error(`    write "${b.track}" as "${suggest(b.track)}"\n`);
}
console.error("Why: a bare 1fr is minmax(auto, 1fr). On a phone that is a sideways scroll.\n");
process.exit(1);
