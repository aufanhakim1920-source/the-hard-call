# Hardship Flagging Rules — The Hard Call

Source of truth for the flagging layer. Every flag the system raises must trace to a rule here.

## The legal core (this is the whole product thesis)

Under **s 72 of the National Credit Code**, a borrower may give a hardship notice **orally** — including over the phone. Once given, **s 72(4)** requires the lender to consider varying the contract and **notify the borrower of the decision within 21 days**.

The consequence: the moment a customer says the right thing on a call, a 21-day statutory clock starts — whether or not the staff member on the phone recognises it.

Legal commentary names this exact gap: *"the biggest difficulty for many lenders will be to determine when an oral hardship notice has been given."* That is the problem we are solving, and it is unsolved in the industry rather than merely done badly.

**The price of getting it wrong:** in August 2025 NAB and AFSH were penalised **$15.5 million** for failing to respond to hardship applications in time — 345 customers, breaches of s 72(4) between 2018 and 2023, partly caused by staff misusing a "reject" button so customers heard nothing at all. A human-process failure at the front line, not a technology failure.

## Timeframe rules

| Situation | Obligation | Clock |
|---|---|---|
| Hardship notice given (oral or written), lender has enough information | Notify borrower of decision | **21 days** from receipt of notice |
| Lender needs more information | Request it from the borrower | within **21 days** of the notice |
| Borrower provides the information | Notify borrower of decision | **21 days** from receiving the information |
| Borrower does not respond to the information request | Notify borrower of decision | **28 days** from the request |
| Variation agreed that defers/reduces obligations **more than 90 days** | Send written notice of contract changes | **30 days** from agreement |
| Variation of 90 days or less | No written notice required | — |
| Request declined | Must tell borrower: the refusal, the reasons, and AFCA contact + complaint rights | with the decision |

The 2025 Banking Code carries the same 21-day response expectation for formal hardship requests, and notes it may be inadequate where the customer is vulnerable.

## What counts as a hardship notice

**Triggers it** — the customer states an inability to meet obligations, not a passing wobble:

- inability to meet obligations over the **medium term**
- a problem they cannot resolve **within about 6 months**
- clear statements of inability: can't make the repayments, won't be able to pay going forward

**Does not trigger it** — temporary difficulty with a stated near-term recovery:

- "we had some difficulty but it'll be in order within a month"

**The detection problem is that customers don't use the legal words.** ABA guidance tells banks to train staff to listen for informal language: *"money problems", "low on funds", "strapped", "can't afford", "struggling"*. Our detection layer keys off this informal register plus a duration signal, then asks: inability, or delay?

## Other staff-level duties worth flagging live

From the ABA financial difficulty guideline — each of these is a candidate flag because each is a thing a junior staff member forgets under pressure:

- **Tell the customer hardship provisions exist** under the National Credit Code. Non-obvious and frequently missed.
- **Respond promptly** to a request from the customer *or their representative* (a financial counsellor, a family member).
- **Extra care for vulnerability**, including family and domestic violence — specialised teams, expedited handling.
- **Proactive contact** where the bank has already spotted arrears indicators.

Arrears-side indicators staff are trained to notice: in arrears, persistent debt or repeatedly over limit, frequently rescheduling or cancelling direct debits, chronic late payments, not responding to overdue notices.

## Design rule: flag the obligation, never the person

We do not classify the customer. No "depressed", no "gambling problem", no vulnerability label written anywhere.

The detector's output names the **duty and the deadline**, not the cause:

> Hardship notice received — assess and notify the decision within 21 days.

The cause stays in the audio and is never logged. This is materially stronger than redacting after the fact: the sensitive category is never collected, so there is nothing to leak, and the flag stays useful either way because the obligation is identical regardless of why the customer can't pay.

PII (names, addresses, account numbers) is stripped before any transcript, flag, or report card is persisted.

## Flag schema

```json
{
  "flag_id": "f_001",
  "call_id": "call_001",
  "rule_id": "NCC_72_ORAL_NOTICE",
  "raised_at": { "speaker": "customer", "start_ms": 51200 },
  "obligation": "Assess the hardship notice and notify the customer of the decision",
  "deadline_days": 21,
  "deadline_from": "notice_received",
  "authority": "National Credit Code s 72(4)",
  "confidence": 0.91,
  "staff_prompt": "Hardship notice received. 21-day clock started. Tell the customer the hardship process exists and lodge it.",
  "resolution": {
    "status": "satisfied",
    "evidence": { "speaker": "staff", "start_ms": 86600 },
    "reason": "Staff named the hardship notice and set the 21-day expectation."
  }
}
```

`raised_at` and `resolution.evidence` point into the transcript rather than copying the customer's words, so the sensitive utterance is never duplicated into the flag store.

**A flag is only resolved by evidence, never by acknowledgement.** Three states:

- `satisfied` — a turn in the transcript discharges the obligation; `evidence` names it.
- `missed` — the call ended and nothing satisfied it.
- `unverified` — the obligation is discharged after the call by a system action, so no transcript evidence can settle it either way.

## Transcript schema (the integration contract)

```json
{
  "call_id": "call_001",
  "turns": [
    { "speaker": "customer", "start_ms": 0, "end_ms": 4200, "text": "..." },
    { "speaker": "staff", "start_ms": 4500, "end_ms": 8100, "text": "..." }
  ]
}
```

Same shape streamed (live coaching) or complete (report card). `speaker` is `customer` or `staff`.

## Sources

- [ASIC — FAQs: Dealing with consumers and credit](https://www.asic.gov.au/regulatory-resources/credit/credit-notices-and-offences/faqs-dealing-with-consumers-and-credit)
- [ASIC 25-165MR — NAB and AFSH penalised $15.5 million](https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2025-releases/25-165mr-nab-and-afsh-penalised-155-million-for-failing-customers-facing-financial-hardship)
- [When is a Hardship Notice given? (Lexology)](https://www.lexology.com/library/detail.aspx?g=32a3961d-542f-48e0-948f-12de3d1616d5)
- [ABA industry guideline — Banks' financial difficulty programs, 1 July 2025](https://www.ausbanking.org.au/wp-content/uploads/2025/06/ABA-Financial-Difficulty-Guideline-FA-Accessible.pdf)
- [2025 Banking Code of Practice](https://bankingcode.org.au/resources/2025-banking-code-of-practice/)
