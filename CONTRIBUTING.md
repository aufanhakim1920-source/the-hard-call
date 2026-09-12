# Working on The Hard Call as a team of four

`main` is always deployable — it is what the judges open. Nobody commits straight to it.

## One branch per part

| Branch | Part | Files you own |
|---|---|---|
| `part/live-call` | the live screen: mic, transcript, signs, keyboard, sounds | `src/components/CallScreen.tsx`, `SignStack.tsx`, `Transcript.tsx`, `src/lib/speech.ts`, `engine.ts` |
| `part/practice-voice` | the ElevenLabs practice customer, scenarios, the orb | `src/lib/practice.ts`, `scenarios.ts`, `src/components/Practice.tsx` |
| `part/report-lessons` | report card, deadlines, lessons, the sign engine's prompts and eval | `src/components/ReportCard.tsx`, `Deadlines.tsx`, `Lessons.tsx`, `supabase/**`, `eval/**` |
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

Then open a **pull request into `main`** on GitHub. One other person reads the diff, presses **Merge**, and GitHub Pages rebuilds the live site in about a minute. Small PRs, often. A PR that has sat for an hour is too big. To try your branch before merging, run it locally (`npm run dev`) — it talks to the same deployed engine.

If `main` moved while you were working: `git pull origin main` on your branch, fix any conflict, push again.

## Rules that keep the demo alive

- **Never commit a key.** `.env` is ignored. The Gemini key lives only as a Supabase secret; the `VITE_*` values are public.
- **`npm run build` must pass** before you push. The site will not deploy otherwise.
- **Don't change the API contract** (`supabase/functions/api/*` request and response shapes) without telling the person on `part/live-call` — the screen depends on it.
- **No AI attribution on commits.** Plain messages, your name as author.
- Commit messages: `area: what changed` — `live: ...`, `practice: ...`, `report: ...`, `engine: ...`, `pitch: ...`.

## The team log writes itself

Every push to `main` appends a row to [TEAM-LOG.md](TEAM-LOG.md): when, who, which part, what the commit said, the files, and the lines changed. Nobody types it — a GitHub Action does it — and the judges can see who built what.

Two things make your row read well:
- **Commit messages start with your part**: `live:`, `practice:`, `report:`, `engine:`, `accounts:`, `design:`, `pitch:`. Without a prefix the log guesses from the files you touched.
- **Say what changed, not that you changed it.** `practice: Frank keeps his voice between goes` beats `fix stuff`.

## Running locally

```bash
npm install
cp .env.example .env     # the VITE_* values in the example are all you need to run the app
npm run dev              # http://localhost:5173 — uses the deployed engine
npm run eval             # scores the sign engine; needs GEMINI_API_KEY in .env (ask Aufan, never paste it in chat)
```

Deadline: **Monday 14 Sep, 12:00pm**. Freeze `main` at 11:00am — after that only the video link and README go in.
