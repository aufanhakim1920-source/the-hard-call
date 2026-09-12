# Working on The Hard Call as a team of four

`main` is always deployable — it is what the judges open. Nobody commits straight to it.

## One branch per part

| Branch | Part | Files you own |
|---|---|---|
| `part/live-call` | the live screen: mic, transcript, signs, keyboard, sounds | `src/components/CallScreen.tsx`, `SignStack.tsx`, `Transcript.tsx`, `src/lib/speech.ts`, `engine.ts` |
| `part/practice-voice` | the ElevenLabs practice customer, scenarios, the orb | `src/lib/practice.ts`, `scenarios.ts`, `src/components/Practice.tsx` |
| `part/report-lessons` | report card, deadlines, lessons, the sign engine's prompts and eval | `src/components/ReportCard.tsx`, `Deadlines.tsx`, `Lessons.tsx`, `netlify/**`, `eval/**` |
| `part/pitch-video` | README, the 3–5 minute video, the About page, the pitch | `README.md`, `src/components/About.tsx`, `video/**` |

Pick your branch, and stay mostly inside your files. If you need to touch someone else's file, say so in the group chat first.

## The loop

```bash
git checkout part/live-call            # your branch
git pull origin main                   # start from the latest main
# ...work...
npm run build                          # must pass before you push
git add -A && git commit -m "live: mic level meter"
git push
```

Then open a **pull request into `main`** on GitHub. Netlify builds a **preview URL for every PR** — paste it in the chat so the others can click it. One other person reads the diff, presses **Merge**. Small PRs, often. A PR that has sat for an hour is too big.

If `main` moved while you were working: `git pull origin main` on your branch, fix any conflict, push again.

## Rules that keep the demo alive

- **Never commit a key.** `.env` is ignored. Keys live in Netlify's environment settings and in your own `.env`.
- **`npm run build` must pass** before you push. The site will not deploy otherwise.
- **Don't change the API contract** (`netlify/functions/*` request and response shapes) without telling the person on `part/live-call` — the screen depends on it.
- **No AI attribution on commits.** Plain messages, your name as author.
- Commit messages: `area: what changed` — `live: ...`, `practice: ...`, `report: ...`, `engine: ...`, `pitch: ...`.

## Running locally

```bash
npm install
cp .env.example .env     # ask Aufan for the values; never paste them in chat
npx netlify dev          # http://localhost:8888  (app + functions)
npm run eval             # scores the sign engine, writes public/eval-results.json
```

Deadline: **Monday 14 Sep, 12:00pm**. Freeze `main` at 11:00am — after that only the video link and README go in.
