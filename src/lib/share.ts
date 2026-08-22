import { QUESTIONS } from "./questions";
import type { Answers } from "./types";

/**
 * Encodes a completed questionnaire into a short token for the URL hash.
 *
 * The token holds option *indices*, not labels, and is only ever read by the
 * same code that wrote it. It carries no identifier of any kind, and because
 * it lives in the fragment it is never sent to a server — a shared link
 * reaches nobody's access log with the answers in it.
 *
 * Format: `v<version>.<fingerprint>.<digits>`
 *
 * The fingerprint pins the token to the exact question bank that produced it.
 * If a question is added, removed or reordered, old tokens stop decoding
 * instead of silently decoding into the wrong answers.
 */

const VERSION = 1;

/** Single-digit indices keep the token short; more options would need a rebase. */
const MAX_OPTIONS = 10;

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0").slice(-7);
}

/** Identity of the current question bank: ids, order, and option counts. */
export const BANK_FINGERPRINT: string = fnv1a(
  QUESTIONS.map((question) => `${question.id}:${question.options.length}`).join("|"),
);

export function encodeAnswers(answers: Answers): string {
  const digits: string[] = [];

  for (const question of QUESTIONS) {
    if (question.options.length > MAX_OPTIONS) {
      throw new Error(`Question "${question.id}" has too many options to encode`);
    }

    const answer = answers[question.id];
    const index =
      answer === undefined ? -1 : question.options.findIndex((option) => option.value === answer);

    if (index < 0) throw new Error(`Question "${question.id}" is unanswered`);
    digits.push(String(index));
  }

  return `v${VERSION}.${BANK_FINGERPRINT}.${digits.join("")}`;
}

/**
 * Decodes a token back into answers.
 *
 * Returns `null` for anything malformed, stale or out of range. This is data
 * off the address bar, so it is treated as hostile: no exception escapes, and
 * nothing partially decoded is ever returned.
 */
export function decodeAnswers(token: string): Answers | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, fingerprint, digits] = parts;
  if (version !== `v${VERSION}`) return null;
  if (fingerprint !== BANK_FINGERPRINT) return null;
  if (digits === undefined || digits.length !== QUESTIONS.length) return null;
  if (!/^[0-9]+$/.test(digits)) return null;

  const answers: Record<string, string> = {};

  for (const [position, question] of QUESTIONS.entries()) {
    const digit = digits[position];
    /* c8 ignore next -- unreachable: length and charset are checked above */
    if (digit === undefined) return null;

    const option = question.options[Number(digit)];
    if (option === undefined) return null;

    answers[question.id] = option.value;
  }

  return answers;
}
