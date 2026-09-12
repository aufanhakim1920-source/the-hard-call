// Turns the commits of one push into rows in TEAM-LOG.md.
//
// Each row: when, who, which part (from the commit's `area:` prefix or the
// files it touched), what they said, and how much moved. Newest first, so the
// top of the file is always "what just happened".

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const LOG = "TEAM-LOG.md";
const HEADER = `# Team log

Written by GitHub Actions on every push to \`main\` — nobody types this. Newest first.

| When (AEST) | Who | Part | What | Files | Lines |
|---|---|---|---|---|---|
`;

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const before = process.argv[2];
const head = process.argv[3] ?? "HEAD";
const zero = /^0{40}$/;
const range = before === "ALL" ? head : !before || zero.test(before) ? `${head}~1..${head}` : `${before}..${head}`;

let raw = "";
try {
  raw = git("log", "--no-merges", "--reverse", "--pretty=format:%H%x1f%an%x1f%aI%x1f%s", range);
} catch {
  raw = git("log", "--no-merges", "-1", "--pretty=format:%H%x1f%an%x1f%aI%x1f%s");
}
if (!raw) {
  console.log("no commits to log");
  process.exit(0);
}

const PARTS = [
  [/^src\/components\/(CallScreen|SignStack|Transcript|Sheet)/, "live call"],
  [/^src\/lib\/(speech|engine|mask|sfx)/, "live call"],
  [/^src\/(lib\/(practice|scenarios)|components\/Practice)/, "practice voice"],
  [/^src\/components\/(ReportCard|Deadlines|Lessons|CallTimeline|ScoreRing|SignBars)/, "report"],
  [/^(supabase|eval)\//, "engine"],
  [/^src\/(lib\/(auth|supabase|sync)|components\/Account)/, "accounts"],
  [/^(README|CONTRIBUTING|TEAM-LOG|\.github)/, "project"],
  [/^src\/styles\.css$/, "design"],
];

function partFor(subject, files) {
  const prefix = /^([a-z-]+):/.exec(subject)?.[1];
  const known = ["live", "practice", "report", "engine", "accounts", "design", "pitch", "phone", "log", "hosting"];
  if (prefix && known.includes(prefix)) return prefix === "live" ? "live call" : prefix;
  const hits = new Set();
  for (const f of files) for (const [re, name] of PARTS) if (re.test(f)) hits.add(name);
  return hits.size ? [...hits].slice(0, 2).join(" + ") : "other";
}

const esc = (s) => s.replace(/\|/g, "\\|");
const rows = [];

for (const line of raw.split("\n")) {
  const [sha, author, iso, subject] = line.split("");
  if (/\[skip ci\]/i.test(subject) || /^log: update team log/.test(subject)) continue;
  const files = git("show", "--name-only", "--pretty=format:", sha).split("\n").filter(Boolean);
  const stat = git("show", "--shortstat", "--pretty=format:", sha);
  const add = Number(/(\d+) insertion/.exec(stat)?.[1] ?? 0);
  const del = Number(/(\d+) deletion/.exec(stat)?.[1] ?? 0);
  const when = new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const shown = files.slice(0, 3).map((f) => f.split("/").pop()).join(", ");
  const more = files.length > 3 ? ` +${files.length - 3}` : "";
  rows.push(
    `| ${when} | ${esc(author)} | ${partFor(subject, files)} | [${esc(subject.replace(/^[a-z-]+:\s*/, ""))}](../../commit/${sha}) | ${esc(shown)}${more} | +${add} / -${del} |`,
  );
}

if (!rows.length) {
  console.log("nothing worth logging");
  process.exit(0);
}

const existing = existsSync(LOG) ? readFileSync(LOG, "utf8") : HEADER;
const head_ = existing.slice(0, existing.indexOf("|---|") + 6 + existing.slice(existing.indexOf("|---|") + 6).indexOf("\n") + 1);
const body = existing.slice(head_.length);
writeFileSync(LOG, head_ + rows.reverse().join("\n") + "\n" + body);
console.log(`logged ${rows.length} commit(s)`);
