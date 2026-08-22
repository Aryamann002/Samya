# Sāmya

**A quiet look at how your term is actually going.**

Sāmya (Sanskrit: _साम्य_, balance) is a self-reflection aid for students. It asks twenty
tap-to-select questions about sleep, study habits, workload, mood, support and daily routine, then
reflects the answers back across six areas with a radar chart, per-area findings quoted from the
student's own answers, and three things to try.

> Sāmya is **not** a medical, psychological or academic assessment. It does not diagnose anything,
> and it does not predict anyone's grades. Every rule it uses is published at `/how-it-works`.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are required. The app is fully functional with none set.

| Command                 | What it does                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `npm run dev`           | Development server                                                        |
| `npm run build`         | Production build                                                          |
| `npm run verify`        | Typecheck → lint → unit and accessibility tests                           |
| `npm run test`          | Vitest: scoring engine, encoding, API route, jest-axe                     |
| `npm run test:coverage` | The same, with thresholds enforced on `src/lib`                           |
| `npm run test:e2e`      | Playwright: the whole wizard, keyboard-only (needs `npm run build` first) |

---

## How it is built

```
src/
  lib/          pure domain logic — no React, no I/O, no clock, no randomness
    questions.ts    the question bank; data, not code
    scoring.ts      answers → six axis scores → composite → band
    calibration.ts  age / degree / year shift the band cutoffs, nothing else
    findings.ts     scores → per-area findings, three actions, plain-text summary
    share.ts        result ⇄ URL fragment token, fingerprinted to the question bank
    schema.ts       zod contract for the one API route
    resources.ts    support helplines  ⚠️ verify before every deploy
  components/   wizard and result UI
  store/        the in-progress draft, via useSyncExternalStore over sessionStorage
  app/          routes; api/reflect is the only server surface
  proxy.ts      per-request nonce and Content-Security-Policy
```

The design came from **Google Stitch** (project _Sāmya Calm_: sage-teal palette, Lexend headings,
12px radii), then was hand-written as React and Tailwind so the accessibility markup and the bundle
size stayed under our control.

### The one rule that shapes everything

**All judgement lives in pure functions.** `scoreAnswers()` takes an answers object and returns
numbers — no React import, no storage, no network, no `Date.now()`. That single constraint is why
the rubric can be published in full, why the engine is exhaustively unit-tested at its boundaries,
and why the app ships no charting or state-management dependency.

### Scoring, in short

1. Each option scores 0–4, where 4 is healthier. Where both extremes are unhealthy (three hours of
   sleep or eleven), the middle option scores highest.
2. Each area is the weighted mean of its questions, rescaled to 0–100.
3. The composite is the plain mean of the six areas — all six weigh equally.
4. ≥ 70 Steady · 45–69 Worth watching · < 45 Strained.
5. **The floor rule:** any single area below 35 raises the band one level. One collapsed area
   matters more than a flattering average.
6. Age, degree and year shift those cutoffs by at most ±4, and the reason is shown to the student.

**CGPA enters no calculation.** It is collected as context, echoed back, and given no path to the
result — which is what makes "does not predict grades" a structural fact rather than a promise.

---

## How each judging criterion is met

**Security** — No backend holds answers; there is nothing to breach. A per-request nonce CSP with
**no `unsafe-inline` in `script-src`** (`src/proxy.ts`), plus HSTS, `frame-ancestors 'none'`,
`object-src 'none'`, `base-uri 'none'`, `Referrer-Policy: no-referrer` and a locked
`Permissions-Policy`. The single API route accepts six integers and a band, `.strict()`-validated,
and rejects anything else; it is rate-limited and times out at 8s. `GEMINI_API_KEY` is server-only.
Full notes in [SECURITY.md](./SECURITY.md).

**Code Quality** — TypeScript `strict` plus `noUncheckedIndexedAccess`, `noUnusedLocals`,
`noUnusedParameters`, `noImplicitOverride`. Zero `any`. The domain layer imports no framework. The
question bank is data, so adding a question touches one array and the wizard, radar, scorer and
rubric page all follow.

**Efficiency** — The radar is ~90 lines of hand-written SVG rather than a charting library, saving
roughly 90 KB gzipped. No state library, no animation library, no icon library, no UI kit. Fonts are
self-hosted at build time, so the browser makes no third-party request. Runtime dependencies:
`next`, `react`, `react-dom`, `zod`.

**Testing** — 102 unit and accessibility tests plus 6 end-to-end tests. The scoring engine is tested
at every band boundary, at the floor rule from both directions, across every calibration branch, and
with 2 000 pseudo-random questionnaires asserting the invariants hold. `jest-axe` asserts zero
violations on every screen, including the error state. Coverage thresholds on `src/lib` are enforced
in CI.

**Accessibility** — Chips are real `<input type="radio">` in a `<fieldset>`/`<legend>`, so keyboard
and screen-reader behaviour comes from the platform rather than from hand-rolled ARIA. Focus moves
to the step heading on advance; unanswered questions surface as a focused error summary linking to
each one. The radar carries `role="img"` with a shape description **and** publishes its six numbers
as visible text, so the data is readable without the picture. AA contrast in light and dark,
`prefers-reduced-motion` honoured, 44px targets, skip link, visible focus rings. One end-to-end test
completes the entire questionnaire using only Tab, arrow keys and Enter.

**Problem Statement Alignment** — Non-clinical vocabulary throughout ("reflection band", "areas to
notice"). The disclaimer appears on the landing page, in the site footer and in its own panel on the
results page. `/how-it-works` publishes the complete rubric _and_ a "what this cannot tell you"
section. Support helplines appear with every result, regardless of band.

---

## The optional Gemini pass

If `GEMINI_API_KEY` is set, `/api/reflect` asks Gemini to reword the already-computed findings into
two warmer paragraphs. It receives **only** the six numbers and the band — never an answer, a CGPA,
an age or an identifier. Every failure path (no key, bad status, odd shape, timeout, network error)
returns the static text instead, and each of those paths has a test. The model never decides
anything: the band, the radar and the advice are all fixed before it is asked.

```bash
cp .env.example .env.local   # then add your key, or don't — the app works either way
```

---

## Before deploying

- [ ] **Verify every number in `src/lib/resources.ts`** against its official source and update
      `RESOURCES_VERIFIED_ON`. A dead helpline is the one genuinely harmful failure this app has.
- [ ] `npm run verify && npm run build && npm run test:e2e`
- [ ] `npm audit --omit=dev`
