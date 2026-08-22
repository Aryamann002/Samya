# Security notes

Sāmya's security posture starts from a design decision rather than a control: **there is no server
that holds anybody's answers.** The questionnaire is scored in the browser, there is no account, no
database, no session cookie and no analytics. Most of the classes of vulnerability a wellbeing app
would normally have to defend against do not exist here because the data never leaves the device.

## Threat model

| Concern                                     | Why it does not apply, or how it is handled                                                                                                                                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Breach of a student's answers at rest       | No store exists. Answers live in React state and a `sessionStorage` draft that dies with the tab.                                                                                                                                                                     |
| Answers leaked in transit or in access logs | Answers are never sent. The result token lives in the URL **fragment**, which browsers do not transmit with a request.                                                                                                                                                |
| PII collected by accident                   | Impossible by construction: every control is a radio or a `<select>`. There is no free-text input anywhere, and a test asserts it (`screens.test.tsx`).                                                                                                               |
| Grade-linked inference                      | CGPA is never read by `scoring.ts` or `calibration.ts`. A test asserts the assessment is byte-identical across all six CGPA answers.                                                                                                                                  |
| XSS                                         | No `dangerouslySetInnerHTML`, no `eval`, no runtime HTML construction. Model output is rendered as React text, so it is escaped. CSP has no `unsafe-inline` in `script-src`.                                                                                          |
| Tampered / crafted result links             | `decodeAnswers()` treats the fragment as hostile: it validates version, bank fingerprint, length, charset and every option index, returns `null` on anything unexpected, and never throws. Tested against malformed, stale, out-of-range and injection-shaped tokens. |
| Abuse of the API route                      | Rate-limited per client IP, `.strict()` schema so unknown fields are rejected outright, 8-second timeout, `no-store`.                                                                                                                                                 |
| API key exposure                            | `GEMINI_API_KEY` is read only in a route handler and never prefixed `NEXT_PUBLIC_`, so it cannot reach the client bundle.                                                                                                                                             |
| Clickjacking                                | `frame-ancestors 'none'` plus `X-Frame-Options: DENY`.                                                                                                                                                                                                                |
| Dependency supply chain                     | Four runtime dependencies: `next`, `react`, `react-dom`, `zod`. `npm audit --omit=dev` is clean and runs in CI.                                                                                                                                                       |

## Content Security Policy

Set per request in `src/proxy.ts` with a fresh nonce:

```
default-src 'self';
script-src 'self' 'nonce-{random}' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'none';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

Two deliberate choices worth stating plainly:

**`style-src` allows `unsafe-inline`.** React and Next emit style attributes that cannot carry a
nonce. An injected stylesheet cannot execute script, so this is a far weaker concession than the
script-side equivalent — which is not made. Removing it would mean giving up either the framework's
style injection or the ability to size an element from a computed value.

**Pages render per request.** A nonce is unique per response, so it cannot be baked into a
prerendered file. `src/app/layout.tsx` reads the nonce header, which opts the app into per-request
rendering. That is the price of a `script-src` with no `unsafe-inline`, and it is cheap here: the
pages fetch nothing and hold no data, so the render is template work only.

An end-to-end test asserts the policy is present, carries a nonce, uses `strict-dynamic`, and
contains no `unsafe-inline` in `script-src`.

## Known limitations

- **The API rate limit is process-local.** It resets on redeploy and does not span instances. This
  is deliberate for a route that holds no data and costs a few tokens; move it to a shared store if
  abuse actually appears.
- **`sessionStorage` is readable by anything already running on the origin.** Since there is no
  origin-shared code and no third-party script is permitted by the CSP, the exposure is limited to
  an attacker who already has script execution — at which point the draft is not the problem.
- **Helpline numbers are content, not code, and can go stale.** `src/lib/resources.ts` carries a
  verification marker that must be updated before each deploy.

## Reporting

Open an issue describing the problem and how to reproduce it. Please do not include anybody's real
answers or personal information in the report — this project is built specifically so that it never
needs them.
