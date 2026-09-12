# Transcript schema + call fixtures

This is the integration contract between the live call, the detection layer, and the report card. Everything downstream reads this shape. Change it here first, not in your own module.

## Transcript

```json
{
  "call_id": "call_001",
  "turns": [
    { "speaker": "customer", "start_ms": 0,    "end_ms": 4200, "text": "..." },
    { "speaker": "staff",    "start_ms": 4500, "end_ms": 8100, "text": "..." }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `call_id` | string | Unique per call. |
| `turns` | array | Ordered by `start_ms`. |
| `turns[].speaker` | `"customer"` \| `"staff"` | Only these two values. |
| `turns[].start_ms` | int | Milliseconds from the start of the call. |
| `turns[].end_ms` | int | Milliseconds from the start of the call. |
| `turns[].text` | string | What was said. |

**Streaming and complete are the same shape.** Live coaching receives turns one at a time as they're transcribed; the report card receives the full array once the call ends. Nobody needs two parsers.

`scenario`, `notes` and `duration_ms` appear in the fixture files for human readers. They are not part of the schema — production transcripts won't have them, so don't depend on them.

## Flag events

What the detector emits. One per obligation triggered.

```json
{
  "flag_id": "f_001",
  "call_id": "call_001",
  "raised_at": { "speaker": "customer", "start_ms": 51200 },
  "rule_id": "NCC_72_ORAL_NOTICE",
  "obligation": "Assess hardship notice and notify the decision",
  "deadline_days": 21,
  "deadline_from": "notice_received",
  "authority": "National Credit Code s 72(4)",
  "confidence": 0.82,
  "staff_prompt": "Hardship notice received. 21-day clock started. Tell the customer the hardship process exists."
}
```

`raised_at` points into the transcript instead of copying the customer's words, so the sensitive utterance is never duplicated into the flag store.

## The privacy rule, in one line

**Flag the obligation, never the person.**

No classification of the customer is produced or stored — no "gambling", no "illness", no vulnerability label. The flag names the duty and the deadline. The cause stays in the audio and is never logged.

This matters for the report card too: score the *handling*, not the customer's situation. There should be no "reason for hardship" field anywhere. The obligation is identical regardless of why they can't pay, so nothing is lost, and there is no sensitive category sitting in a database waiting to leak.

PII (names, addresses, account numbers) is stripped before any transcript, flag, or report card is persisted. The fixtures deliberately contain names and street addresses so the redaction pass has something to catch.

## The three fixtures

| File | What it is | Detector must |
|---|---|---|
| `call_001_clear_hardship.json` | Unambiguous oral hardship notice, staff member handles it correctly | **Fire** at 51200ms |
| `call_002_temporary_difficulty.json` | Informal hardship vocabulary, but a stated near-term recovery | **Stay silent** |
| `call_003_missed_notice.json` | Clear oral notice, staff member never recognises it | **Fire** at 45000ms + 103200ms |

`fixtures/expected/expected_flags.json` is the ground truth — which flags, at which timestamp, and why. Run the detector against all three and diff. Call 002 is the one that matters most: it uses the exact words the ABA trains staff to listen for ("struggling", "couldn't afford") in a situation that is legally *not* a hardship notice. Any keyword matcher fails it.

## Why these three

A hardship notice can be given **orally** under s 72 of the National Credit Code, and once given the bank has **21 days** to assess and notify a decision (s 72(4)). The hard part, per the legal commentary, is working out when an oral notice has actually been given — which is the line these fixtures draw:

- **001** is over the line — stated inability, medium term.
- **002** is under it — temporary, with a date.
- **003** is over the line and gets missed, which is the failure ASIC penalised NAB and AFSH **$15.5m** for in August 2025: 345 customers who never got a response in time.

They double as the demo script. The dialogue you see here is the dialogue the judges will hear, so treat edits as pitch edits.

## Sources

- [ASIC — FAQs: Dealing with consumers and credit](https://www.asic.gov.au/regulatory-resources/credit/credit-notices-and-offences/faqs-dealing-with-consumers-and-credit)
- [ASIC 25-165MR — NAB and AFSH penalised $15.5 million](https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2025-releases/25-165mr-nab-and-afsh-penalised-155-million-for-failing-customers-facing-financial-hardship)
- [When is a Hardship Notice given? (Lexology)](https://www.lexology.com/library/detail.aspx?g=32a3961d-542f-48e0-948f-12de3d1616d5)
- [ABA industry guideline — Banks' financial difficulty programs, 1 July 2025](https://www.ausbanking.org.au/wp-content/uploads/2025/06/ABA-Financial-Difficulty-Guideline-FA-Accessible.pdf)
