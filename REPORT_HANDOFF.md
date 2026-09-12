# Report card handoff

Shawn's branch: `part/report-lessons`.

The report now supports `unverified` when the model omits a judgement,
duplicates it, or cannot cite a worker response for handled/partly.
Ticking a sign never substitutes for transcript evidence. Missing worker
responses are unverified, not automatically missed.

## API changes to coordinate with live-call and detection owners

Request shape remains `{ session, lessons }`. Signs should preserve `lineId`
pointing to the triggering transcript line. This avoids treating detector
latency as the start of the worker's response window.

Response additions:

- `items[].verdict` can now be `unverified`.
- `items[].evidence` contains `{ lineId, offsetMs }` references.
- `unverified` counts these items separately from `missed`.
- `scoreUnverified` tells consumers to withhold the numeric score. The legacy
  numeric `score` remains in the payload for compatibility; it is not a
  verified score when this flag is true.

The report screen resolves quotes from the current in-memory session. New
evidence fields persist references and offsets only, not transcript quotes.
Old reports without these optional fields remain renderable.

## Still pending

- Laural's validated rules and `flag events` contract; adapt `staff`/`turns`
  to the current `worker`/`lines` format after agreement.
- Cause-based sign keys/titles remain in the detector and saved reports.
  The prompt requests cause-free prose but this is not a privacy guarantee.
- The model still produces the score and semantic judgement. Reference
  validation proves that a worker line exists, not that the judgement is correct.
- Actual Gemini accuracy and visual/browser verification are not covered by
  the local automated tests. Deploy the frontend and report function together
  after review; the hosted function has not been changed by this work.

## Validation

`node --test eval/report.test.mjs` runs offline tests, including a mocked
Gemini response through the report endpoint. No real customer data or API
key is required. Run `npm run build` and `npm run lint` for frontend checks.
