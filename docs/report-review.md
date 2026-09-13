# Report branch review

Scope: the 28 reviewable code, test and migration files in PR #5 relative to
main, including the Claude-attributed commits and subsequent integration fixes.
OCR delegate mode supplied file selection and rules; Codex performed the review.
All 28 files reviewed (100% coverage); no reviewable files skipped. Three Markdown
files were excluded by OCR's file rules; handoff instructions were checked separately.

## Findings resolved

| Severity | Location | Failure and correction |
| --- | --- | --- |
| High | src/lib/sync.ts | Stored score_unverified was dropped on read, allowing a withheld score to become eligible. Preserve it while checking item verdicts. Replace constant score stubs with the actual predicate in sync tests. |
| High | supabase/functions/_shared/reportItems.ts | Guessed staff responses could support missed, and an unknown or missing referenced trigger could support a definitive verdict. Require attributable triggers and absence evidence; known positive handling evidence still works. |
| High | supabase/functions/_shared/reportInput.ts | Current detector kind/persist fields were ignored, promoting requests into report obligations. Validate those fields, exclude requests/cues/non-persistent flags, preserve legacy inputs. |
| Medium | src/lib/store.ts | Reload changed unknown coaching mode into true. Preserve absence. |
| Medium | eval/tier.test.mjs | The offline glob could call Gemini when a key was present, and appeared as a passing file when it exited for lack of a key. Move the live experiment to eval/tier-live.mjs and expose npm run eval:tier. |

Eight new negative regressions failed before fixes; a positive verified-score
round trip already passed and remains covered. Existing transcript-evidence,
account-switching, fallback, publication and tier regression tests remain.

Rules-detector integration now exercises four fixtures, including a request-only
call. Reports consume final detector output; streaming can emit a provisional
request that is later withdrawn. Gemini was mocked only for report judgement.

## Limits

This is code/integration review, not a legal validation of hardship thresholds,
model accuracy evaluation or acoustic diarization test. No deployment, database
migration, live API calls or browser testing were performed. The migration's
actual schema compatibility and RLS behavior remain unverified. Cross-device
conflict handling lacks shared tombstones. Canonical flag filtering does not
prove privacy of legacy live-session inputs or generated free text. The live
model path still attaches signs to the currently processed line; unlike the
local detector bridge it does not return a distinct source-line reference for
quotes from earlier turns. That needs a coordinated response-contract follow-up.
