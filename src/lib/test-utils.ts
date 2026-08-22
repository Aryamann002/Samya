import { QUESTIONS } from "./questions";
import type { Answers, Axis, OptionScore } from "./types";

/**
 * Test helpers. Kept in `src/lib` rather than a test folder so the type checker
 * covers them the same as production code.
 */

/** Picks the option whose score is closest to `target`, preferring the lower. */
function nearestOption(questionId: string, target: number): string {
  const question = QUESTIONS.find((candidate) => candidate.id === questionId);
  if (question === undefined) throw new Error(`No such question: ${questionId}`);

  let best = question.options[0];
  if (best === undefined) throw new Error(`Question has no options: ${questionId}`);

  for (const option of question.options) {
    if (Math.abs(option.score - target) < Math.abs(best.score - target)) best = option;
  }
  return best.value;
}

/**
 * A complete answer set where every scored question sits at `level`, with
 * optional per-question overrides. Context questions take their first option.
 */
export function answersAt(level: OptionScore, overrides: Answers = {}): Answers {
  const answers: Record<string, string> = {};

  for (const question of QUESTIONS) {
    if (question.axis === "context") {
      const first = question.options[0];
      if (first === undefined) throw new Error(`Context question has no options: ${question.id}`);
      answers[question.id] = first.value;
      continue;
    }
    answers[question.id] = nearestOption(question.id, level);
  }

  return { ...answers, ...overrides };
}

/** Sets every question on `axis` to its lowest-scoring option. */
export function collapseAxis(answers: Answers, axis: Axis): Answers {
  const next: Record<string, string> = { ...answers };

  for (const question of QUESTIONS) {
    if (question.axis !== axis) continue;
    next[question.id] = nearestOption(question.id, 0);
  }

  return next;
}

/** Sets every question on `axis` to its highest-scoring option. */
export function maximiseAxis(answers: Answers, axis: Axis): Answers {
  const next: Record<string, string> = { ...answers };

  for (const question of QUESTIONS) {
    if (question.axis !== axis) continue;
    next[question.id] = nearestOption(question.id, 4);
  }

  return next;
}

/** A deterministic pseudo-random answer set, for property-style checks. */
export function randomAnswers(seed: number): Answers {
  let state = seed;
  const next = () => {
    // xorshift32 — deterministic across runs so failures are reproducible.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return Math.abs(state);
  };

  const answers: Record<string, string> = {};
  for (const question of QUESTIONS) {
    const option = question.options[next() % question.options.length];
    if (option === undefined) throw new Error(`Question has no options: ${question.id}`);
    answers[question.id] = option.value;
  }
  return answers;
}
