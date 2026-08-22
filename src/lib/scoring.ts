import { calibrate } from "./calibration";
import { QUESTIONS, QUESTIONS_BY_ID } from "./questions";
import {
  AXES,
  type Answers,
  type Assessment,
  type Axis,
  type Band,
  type Calibration,
} from "./types";
import type { ContextKey } from "./types";

/**
 * The scoring engine.
 *
 * Pure: no React, no storage, no network, no clock, no randomness. The same
 * answers always produce the same assessment, which is what lets the rubric be
 * published in full on the "How this works" page and verified against this
 * file line by line.
 *
 * Everything here works in "health" terms — 0 is the least healthy reading and
 * 100 the most. Nothing in Sāmya computes a probability, a diagnosis or a
 * predicted grade.
 */

/** A composite at or above this reads as steady. */
export const STEADY_CUTOFF = 70;

/** A composite at or above this reads as watch; below it, strained. */
export const WATCH_CUTOFF = 45;

/**
 * A single axis below this raises the band one level.
 *
 * One collapsed domain matters more than a flattering average: a student
 * sleeping four hours a night is not "fine overall" because their study habits
 * are tidy.
 */
export const FLOOR_THRESHOLD = 35;

/** All six axes count equally. Sāmya makes no claim that one matters more. */
const AXIS_WEIGHT = 1;

type BandResult = {
  readonly band: Band;
  readonly composite: number;
  readonly floorTriggered: boolean;
  readonly weakestAxis: Axis;
};

function raise(band: Band): Band {
  if (band === "steady") return "watch";
  if (band === "watch") return "strained";
  return "strained";
}

/**
 * Turns six axis values into a band.
 *
 * Split out from {@link scoreAnswers} so the band boundaries can be tested
 * directly, without having to construct a questionnaire that happens to land
 * on each one.
 */
export function deriveBand(
  axes: Readonly<Record<Axis, number>>,
  calibration: Calibration,
): BandResult {
  const total = AXES.reduce((sum, axis) => sum + axes[axis] * AXIS_WEIGHT, 0);
  const composite = Math.round(total / (AXES.length * AXIS_WEIGHT));

  let weakestAxis: Axis = AXES[0];
  for (const axis of AXES) {
    if (axes[axis] < axes[weakestAxis]) weakestAxis = axis;
  }

  const steadyCutoff = STEADY_CUTOFF + calibration.compositeShift;
  const watchCutoff = WATCH_CUTOFF + calibration.compositeShift;

  let band: Band;
  if (composite >= steadyCutoff) band = "steady";
  else if (composite >= watchCutoff) band = "watch";
  else band = "strained";

  const floorTriggered = axes[weakestAxis] < FLOOR_THRESHOLD;
  if (floorTriggered) band = raise(band);

  return { band, composite, floorTriggered, weakestAxis };
}

/**
 * Scores a completed questionnaire.
 *
 * Throws when a scored question is unanswered or an answer names an option the
 * question does not offer — a corrupted share link should fail loudly rather
 * than quietly produce a plausible-looking reading. Answers to questions that
 * no longer exist in the bank are ignored, so an older link still works.
 *
 * Context answers are optional: a missing one contributes no calibration
 * instead of failing.
 */
export function scoreAnswers(answers: Answers): Assessment {
  const context: Partial<Record<ContextKey, string>> = {};
  const weighted = new Map<Axis, { earned: number; possible: number }>(
    AXES.map((axis) => [axis, { earned: 0, possible: 0 }]),
  );

  for (const question of QUESTIONS) {
    const answer = answers[question.id];

    if (question.axis === "context") {
      if (answer === undefined) continue;
      if (!question.options.some((option) => option.value === answer)) {
        throw new Error(`Answer "${answer}" is not an option on question "${question.id}"`);
      }
      if (question.contextKey !== undefined) context[question.contextKey] = answer;
      continue;
    }

    if (answer === undefined) {
      throw new Error(`Question "${question.id}" is unanswered`);
    }

    const option = question.options.find((candidate) => candidate.value === answer);
    if (option === undefined) {
      throw new Error(`Answer "${answer}" is not an option on question "${question.id}"`);
    }

    const bucket = weighted.get(question.axis);
    /* c8 ignore next -- unreachable: every Axis is seeded above */
    if (bucket === undefined) continue;

    bucket.earned += option.score * question.weight;
    bucket.possible += 4 * question.weight;
  }

  const axes = Object.fromEntries(
    AXES.map((axis) => {
      const bucket = weighted.get(axis);
      /* c8 ignore next -- unreachable: every Axis is seeded above */
      if (bucket === undefined || bucket.possible === 0) return [axis, 0];
      return [axis, Math.round((bucket.earned / bucket.possible) * 100)];
    }),
  ) as Record<Axis, number>;

  const calibration = calibrate(context);
  const { band, composite, floorTriggered, weakestAxis } = deriveBand(axes, calibration);

  return { axes, composite, band, floorTriggered, weakestAxis, calibration, context };
}

/** True when every scored question in the bank has an answer. */
export function isComplete(answers: Answers): boolean {
  return QUESTIONS.every(
    (question) => question.axis === "context" || answers[question.id] !== undefined,
  );
}

/** Ids of the questions on `step` that still need an answer. */
export function unansweredOnStep(answers: Answers, step: number): readonly string[] {
  return QUESTIONS.filter(
    (question) => question.step === step && answers[question.id] === undefined,
  ).map((question) => question.id);
}

/** Looks a question up by id. Exported so the wizard need not re-scan the bank. */
export function findQuestion(id: string) {
  return QUESTIONS_BY_ID.get(id);
}
