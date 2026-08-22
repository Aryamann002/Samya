# Sāmya — design record

**Date:** 2026-08-22
**Status:** implemented

## Problem

Students carry a rough sense of how a term is going but rarely have a structured way to look at it.
Existing tools tend to fail in one of two directions: either they are clinical screening instruments
that a student should not be self-administering, or they are engagement-optimised wellness apps that
collect identity, build a profile, and gamify the result.

Sāmya takes a third position. It is a **self-reflection aid**: it reads a student's own reported
habits back to them, across six areas, with the reasoning shown. It is not a medical, psychological
or academic assessment, it diagnoses nothing, and it makes no prediction about anyone's grades.

Built for a Google-organised hackathon judged by agentic models on Security, Code Quality,
Efficiency, Testing, Accessibility, and Problem Statement Alignment.

## Decisions

| Decision | Choice                                                                       | Why                                                                      |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Platform | Next.js 16 App Router, TypeScript, Tailwind 4, PWA                           | One URL for a judge to open; strongest accessibility and testing tooling |
| Data     | 100% on-device, no backend for answers                                       | The privacy claim becomes structural rather than a policy page           |
| AI       | Deterministic rubric decides; Gemini only rewords                            | Keeps the result reproducible, testable and non-diagnostic               |
| Axes     | Sleep, Study Habits, Academic Load, Stress & Mood, Social Support, Lifestyle | Six reads well on a radar; each is something a student can act on        |
| Design   | Google Stitch first, then hand-coded                                         | Coherent visual system; full control of markup and bundle                |
| Testing  | Vitest unit + jest-axe + Playwright keyboard E2E                             | Directly serves three judging criteria                                   |
| CGPA     | Collected, echoed, **never scored**                                          | The only honest way to promise "does not predict grades"                 |

## Architecture

The single organising constraint: **all judgement lives in pure functions.** `src/lib` imports no
React and performs no I/O — no storage, no network, no clock, no randomness. `scoreAnswers()` takes
answers and returns numbers.

Three consequences follow, and each maps to a judging criterion:

- The rubric can be published verbatim at `/how-it-works`, generated from the same constants and
  question bank the engine uses, so the page cannot drift from the code. _(Alignment)_
- The engine is testable at its exact boundaries without constructing UI. _(Testing)_
- No charting or state-management dependency is needed to render or hold the result. _(Efficiency)_

### Data flow

```
question bank (data)
        ↓  wizard writes answers into sessionStorage draft
    Answers  ──encodeAnswers──▶  /result#v1.<fingerprint>.<digits>
        ↓                              │
   scoreAnswers()  ◀──decodeAnswers────┘
        ↓
  axes → composite → band  →  findings + actions  →  radar, cards, summary
        ↓ (six numbers + band only)
   /api/reflect  →  Gemini rewording, or static fallback
```

The result token lives in the **fragment**, which browsers never transmit. A shared link, a refresh
and a bookmark all rebuild the same page from the same rules with no storage and no server involved.
The token carries a fingerprint of the question bank, so a bank change invalidates old links rather
than silently decoding them into the wrong answers.

### Scoring

1. Options score 0–4, 4 healthiest. Where both extremes are unhealthy, the middle option scores
   highest.
2. Axis = weighted mean of its questions, rescaled to 0–100.
3. Composite = plain mean of the six axes. All six weigh equally; we make no claim that one area
   matters more than another.
4. ≥ 70 Steady · 45–69 Watch · < 45 Strained.
5. **Floor rule:** any axis < 35 raises the band one level. One collapsed area matters more than a
   flattering average.
6. Age, degree and year shift the two cutoffs by at most ±4, with the reason shown to the student.
   CGPA appears in neither `scoring.ts` nor `calibration.ts`.

## What was deliberately not built

- **No accounts, no history, no trend view.** Each of these requires identity or storage, which
  would dismantle the privacy property that makes the rest defensible. The Stitch design proposed a
  bottom tab bar with a Profile tab; it was not implemented for this reason.
- **No charting library.** ~90 lines of SVG instead, which gave full control of the accessible
  markup and kept a dependency out of the client bundle. Measured client JS is 171–182 KB gzipped
  per page, of which ~16 KB is Sāmya's own code; the rest is the Next and React runtime.
- **No red/amber/green scale.** A traffic light reads as medical triage. Bands are distinguished by
  tone, label and wording.
- **No free-text input anywhere.** This is what makes PII collection impossible rather than merely
  discouraged, and a test asserts it.

## Known limitations

- Question weights are considered judgements, not empirical findings. They are published so a reader
  can disagree with them, and `/how-it-works` says so plainly.
- The API rate limit is process-local (documented in `SECURITY.md` with its upgrade path).
- `style-src` permits `unsafe-inline`; `script-src` does not. The reasoning is recorded in
  `SECURITY.md`.
- **Helpline numbers in `src/lib/resources.ts` require manual verification before each deploy.** The
  file carries a `RESOURCES_VERIFIED_ON` marker that is currently unset.
