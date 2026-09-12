// npm run team — what the others have done since you last looked.
//
// Run this BEFORE writing any code and again before saying anything is done.
// It fetches, then answers four questions in one screen:
//   1. Has main moved? (their merged work you don't have yet)
//   2. Is anything waiting on you? (open PRs)
//   3. What is moving on the part branches? (work in progress, not yet merged)
//   4. Are you about to lose anything? (unpushed commits, a dirty tree)
//
// Read-only apart from the fetch: it never pulls, commits or pushes for you.

import { execFileSync } from "node:child_process";

const git = (...a) => {
  try {
    return execFileSync("git", a, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};
const gh = (...a) => {
  try {
    return execFileSync("gh", a, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const B = "[1m";
const DIM = "[2m";
const GOLD = "[33m";
const RED = "[31m";
const GREEN = "[32m";
const R = "[0m";
const line = (s = "") => console.log(s);
const rule = () => line(DIM + "─".repeat(64) + R);

git("fetch", "--quiet", "--prune", "origin");

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const behind = git("rev-list", "--count", `${branch}..origin/main`);
const ahead = git("rev-list", "--count", `origin/main..${branch}`);
const dirty = git("status", "--porcelain");

line();
line(`${B}Team sync${R} ${DIM}· you are on ${branch}${R}`);
rule();

// 1 — main moved
if (Number(behind) > 0) {
  line(`${GOLD}${behind} commit(s) on main you do not have:${R}`);
  line(git("log", "--no-merges", "--pretty=format:  %C(dim)%ad%Creset  %an — %s", "--date=format:%d %b %H:%M", `${branch}..origin/main`));
  line(`${DIM}  → git pull origin main${R}`);
} else {
  line(`${GREEN}main: up to date${R}`);
}

// 2 — open PRs
const prs = gh("pr", "list", "--state", "open", "--json", "number,title,headRefName,author,isDraft,mergeable", "--limit", "20");
if (prs) {
  const list = JSON.parse(prs);
  line();
  if (list.length === 0) {
    line(`${GREEN}no open pull requests${R}`);
  } else {
    line(`${GOLD}${list.length} open pull request(s):${R}`);
    for (const p of list) {
      const flag = p.mergeable === "CONFLICTING" ? `${RED} CONFLICTS${R}` : "";
      line(`  #${p.number} ${p.title} ${DIM}· ${p.author.login} · ${p.headRefName}${p.isDraft ? " · draft" : ""}${R}${flag}`);
    }
    line(`${DIM}  → gh pr view <n>   ·   gh pr diff <n>${R}`);
  }
}

// 3 — the part branches
line();
const heads = git("for-each-ref", "--format=%(refname:short)|%(committerdate:relative)|%(authorname)|%(subject)", "refs/remotes/origin/part")
  .split("\n")
  .filter(Boolean);
if (heads.length) {
  line(`${B}Branches${R}`);
  for (const h of heads) {
    const [ref, when, who, subject] = h.split("|");
    const n = git("rev-list", "--count", `origin/main..${ref}`);
    const state = Number(n) > 0 ? `${GOLD}${n} ahead${R}` : `${DIM}merged${R}`;
    line(`  ${ref.replace("origin/", "").padEnd(20)} ${state}  ${DIM}${who} · ${when}${R}`);
    if (Number(n) > 0) line(`    ${DIM}${subject}${R}`);
  }
}

// 4 — your own state
line();
if (Number(ahead) > 0) line(`${GOLD}${ahead} commit(s) of yours are not pushed${R} ${DIM}→ git push origin ${branch}${R}`);
if (dirty) line(`${GOLD}${dirty.split("\n").length} file(s) changed and not committed${R}`);
if (!Number(ahead) && !dirty) line(`${GREEN}nothing of yours is waiting${R}`);
rule();
line(`${DIM}TEAM-LOG.md has the full history. Read the group chat too — half the decisions live there.${R}`);
line();
