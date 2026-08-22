import type { Calibration, ContextKey } from "./types";

/**
 * Calibration shifts the *band cutoffs*, never a score.
 *
 * The distinction matters. Sāmya reports what a student told it; it must not
 * quietly rewrite their answers because of who they are. What can honestly
 * change with context is where the line between "steady" and "watch" sits —
 * a first-year adjusting to a new city and a fifth-year on a familiar routine
 * are not in the same situation even when they tick the same boxes.
 *
 * A positive shift raises the cutoffs, so it takes a better set of answers to
 * land in a calmer band. Every contribution is small, bounded, and surfaced to
 * the user on the "How this works" page rather than hidden in the maths.
 *
 * CGPA appears nowhere in this file. It is collected as context, echoed back,
 * and never allowed to influence the outcome — which is what keeps the promise
 * that Sāmya does not predict anybody's grades.
 */

const MAX_SHIFT = 4;

type ShiftRule = { readonly shift: number; readonly reason: string };

const AGE_RULES: Readonly<Record<string, ShiftRule>> = {
  under18: {
    shift: 3,
    reason: "Under 18s generally need more sleep, so the bar for a calm reading is set higher.",
  },
  "24to26": {
    shift: -1,
    reason: "Older students often juggle work alongside study, so the bar is eased slightly.",
  },
  "27plus": {
    shift: -2,
    reason: "Students over 27 usually carry commitments outside study, so the bar is eased.",
  },
};

const YEAR_RULES: Readonly<Record<string, ShiftRule>> = {
  year1: {
    shift: 2,
    reason: "First year is a transition year, so early strain is treated as worth noticing.",
  },
  year4: {
    shift: -1,
    reason: "Final-year workloads are structurally heavy, so a busy answer weighs less.",
  },
  year5plus: {
    shift: -2,
    reason: "Long-programme workloads are structurally heavy, so a busy answer weighs less.",
  },
};

const DEGREE_RULES: Readonly<Record<string, ShiftRule>> = {
  postgraduate: {
    shift: -1,
    reason: "Postgraduate study is expected to be demanding, so the bar is eased slightly.",
  },
  doctoral: {
    shift: -2,
    reason: "Research degrees run long and self-directed, so the bar is eased.",
  },
};

const RULE_SETS: ReadonlyArray<readonly [ContextKey, Readonly<Record<string, ShiftRule>>]> = [
  ["age", AGE_RULES],
  ["year", YEAR_RULES],
  ["degree", DEGREE_RULES],
];

/**
 * Builds the calibration for a set of context answers.
 *
 * Unknown or absent context values contribute nothing, so a partially answered
 * context section degrades to "no adjustment" rather than to an error.
 */
export function calibrate(context: Readonly<Partial<Record<ContextKey, string>>>): Calibration {
  let total = 0;
  const reasons: string[] = [];

  for (const [key, rules] of RULE_SETS) {
    const value = context[key];
    if (value === undefined) continue;

    const rule = rules[value];
    if (rule === undefined) continue;

    total += rule.shift;
    reasons.push(rule.reason);
  }

  return {
    compositeShift: Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, total)),
    reasons,
  };
}
