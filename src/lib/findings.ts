import { QUESTIONS } from "./questions";
import { STEADY_CUTOFF, WATCH_CUTOFF } from "./scoring";
import { AXES, AXIS_LABELS, type Answers, type Assessment, type Axis } from "./types";

/**
 * Turns an assessment into words.
 *
 * Like the scoring engine this is pure and deterministic. Every sentence a
 * student reads is selected from the table below by their own answers — none
 * of it is generated, so none of it can drift into sounding like a diagnosis.
 *
 * The optional Gemini pass in `/api/reflect` rewrites these sentences into a
 * warmer paragraph. It never replaces them and never sees the raw answers.
 */

export type Level = "low" | "moderate" | "good";

export type AxisFinding = {
  readonly axis: Axis;
  readonly label: string;
  readonly value: number;
  readonly level: Level;
  readonly summary: string;
  /** The specific answers that pulled this axis down, in the student's words. */
  readonly drivers: readonly string[];
};

export type Action = {
  readonly axis: Axis;
  readonly label: string;
  readonly text: string;
};

/** An answer scoring at or below this is worth naming back to the student. */
const DRIVER_SCORE_CEILING = 1;

export function levelFor(value: number): Level {
  if (value >= STEADY_CUTOFF) return "good";
  if (value >= WATCH_CUTOFF) return "moderate";
  return "low";
}

const SUMMARIES: Readonly<Record<Axis, Readonly<Record<Level, string>>>> = {
  sleep: {
    low: "Your answers describe sleep that is short, broken or hard to predict.",
    moderate: "You are getting some rest, though not reliably.",
    good: "Your sleep reads as regular and restorative.",
  },
  studyHabits: {
    low: "Work seems to be happening in bursts, close to deadlines.",
    moderate: "You have some structure, and it slips under pressure.",
    good: "You describe a steady, planned way of working.",
  },
  academicLoad: {
    low: "The load you describe is heavier than what fits in your days.",
    moderate: "The workload is demanding but not yet past what you can hold.",
    good: "Your workload reads as something you can carry.",
  },
  stressMood: {
    low: "You describe stress that stays with you and mood that has dipped.",
    moderate: "Stress comes and goes, and you mostly come back from it.",
    good: "You describe yourself as settled and able to recover.",
  },
  socialSupport: {
    low: "Your answers suggest you are carrying this largely on your own.",
    moderate: "There are people around you, though reaching out is not automatic.",
    good: "You describe people you can turn to and a willingness to do it.",
  },
  lifestyle: {
    low: "Movement, meals and screen time are working against your energy.",
    moderate: "Some daily basics are in place and others have slipped.",
    good: "Your daily routine is supporting you.",
  },
};

const ACTIONS: Readonly<Record<Axis, Readonly<Record<Level, string>>>> = {
  sleep: {
    low: "Pick one fixed wake-up time and keep it for seven days, including the weekend. A steady waking hour pulls the rest of your sleep into place faster than an earlier bedtime does.",
    moderate:
      "Move your last screen out of the bedroom for a week and see whether falling asleep gets easier.",
    good: "Keep the sleep window you have. It is doing more for the rest of this picture than anything else on the list.",
  },
  studyHabits: {
    low: "Before you close your laptop tonight, write down the single first task for tomorrow. Starting is the part that is costing you, not the work itself.",
    moderate:
      "Try one 45-minute block with the phone in another room, then a real break. Repeat twice a day rather than aiming for a perfect schedule.",
    good: "Your system is working. Protect it when the next deadline wave arrives.",
  },
  academicLoad: {
    low: "List everything pending, then ask which one thing you can drop, defer or ask for an extension on. Carrying all of it is a decision you are allowed to revisit.",
    moderate:
      "Put the three nearest deadlines on one page with their real dates. Most of the weight of a busy term is not knowing the order.",
    good: "You have room right now. This is the cheapest time to get ahead on the next deadline.",
  },
  stressMood: {
    low: "Choose one person and tell them plainly how the last two weeks have been. If that feels impossible, a counsellor or a helpline counts — the numbers are below.",
    moderate:
      "Book one thing in the week that is not study and not catching up. Recovery needs a slot, not leftover time.",
    good: "Whatever you are doing to reset after hard days is working. Keep it deliberate.",
  },
  socialSupport: {
    low: "Message one person this week without waiting for a reason. Support is easier to reach for when the line is already open.",
    moderate:
      "Say yes to one thing you would normally skip. Connection tends to follow attendance rather than intention.",
    good: "You have people. Being the one who checks in keeps it that way.",
  },
  lifestyle: {
    low: "Start with meals rather than the gym. Eating at roughly the same times steadies energy faster than any workout plan.",
    moderate:
      "Add one twenty-minute walk on a day you currently do nothing. Small and repeatable beats ambitious and abandoned.",
    good: "Your daily basics are solid. They are quietly holding up the rest of this chart.",
  },
};

/** The answers on an axis that scored badly enough to be worth naming. */
function driversFor(axis: Axis, answers: Answers): readonly string[] {
  const drivers: string[] = [];

  for (const question of QUESTIONS) {
    if (question.axis !== axis) continue;

    const answer = answers[question.id];
    if (answer === undefined) continue;

    const option = question.options.find((candidate) => candidate.value === answer);
    if (option === undefined || option.score > DRIVER_SCORE_CEILING) continue;

    drivers.push(`${question.prompt} — you said “${option.label}”.`);
  }

  return drivers;
}

/** One finding per axis, in the fixed radar order so the two always agree. */
export function buildFindings(assessment: Assessment, answers: Answers): readonly AxisFinding[] {
  return AXES.map((axis) => {
    const value = assessment.axes[axis];
    const level = levelFor(value);

    return {
      axis,
      label: AXIS_LABELS[axis],
      value,
      level,
      summary: SUMMARIES[axis][level],
      drivers: driversFor(axis, answers),
    };
  });
}

/**
 * Three next steps, taken from the three lowest axes.
 *
 * Ranked by need rather than by importance: the point is to give a student
 * somewhere to start, not a complete plan.
 */
export function buildActions(assessment: Assessment): readonly Action[] {
  return [...AXES]
    .sort((a, b) => assessment.axes[a] - assessment.axes[b])
    .slice(0, 3)
    .map((axis) => ({
      axis,
      label: AXIS_LABELS[axis],
      text: ACTIONS[axis][levelFor(assessment.axes[axis])],
    }));
}

const BAND_COPY = {
  steady: {
    title: "Steady",
    meaning:
      "Most of what you described is holding together. This is a good moment to notice what is working, so you can protect it when term gets heavier.",
  },
  watch: {
    title: "Worth watching",
    meaning:
      "Several things you described are under strain. Nothing here says something is wrong — it says these are the parts worth attention before they get harder to change.",
  },
  strained: {
    title: "Strained",
    meaning:
      "A lot of what you described is under pressure at once. That is worth taking seriously and worth saying out loud to someone. It is not a diagnosis, and it is not permanent.",
  },
} as const;

export function bandCopy(assessment: Assessment) {
  return BAND_COPY[assessment.band];
}

/**
 * A plain-text version of the result, for the copy-to-clipboard button.
 *
 * Carries the same disclaimer as the screen: once this text leaves Sāmya it
 * can end up pasted into a group chat, and it should not read like a report
 * about somebody when it gets there.
 */
export function buildSummary(
  assessment: Assessment,
  findings: readonly AxisFinding[],
  actions: readonly Action[],
): string {
  const lines: string[] = [
    "Sāmya — a self-reflection aid. Not a medical, psychological or academic assessment.",
    "",
    `Reflection band: ${BAND_COPY[assessment.band].title}`,
    `Overall: ${assessment.composite} out of 100 (higher is healthier)`,
    "",
    "Areas:",
  ];

  for (const finding of findings) {
    lines.push(`  ${finding.label}: ${finding.value}/100 — ${finding.summary}`);
  }

  lines.push("", "Three things to try:");
  for (const [index, action] of actions.entries()) {
    lines.push(`  ${index + 1}. ${action.label} — ${action.text}`);
  }

  return lines.join("\n");
}
