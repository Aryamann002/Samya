/**
 * Domain types for Sāmya.
 *
 * Nothing in `src/lib` imports React or performs I/O. The whole judgement of
 * the app is a pure function over these types, which is what makes it
 * exhaustively testable and auditable.
 */

/** The six wellbeing domains shown on the radar. */
export const AXES = [
  "sleep",
  "studyHabits",
  "academicLoad",
  "stressMood",
  "socialSupport",
  "lifestyle",
] as const;

export type Axis = (typeof AXES)[number];

/** Human-facing labels. Kept beside the ids so they cannot drift apart. */
export const AXIS_LABELS: Readonly<Record<Axis, string>> = {
  sleep: "Sleep & Rest",
  studyHabits: "Study Habits",
  academicLoad: "Academic Load",
  stressMood: "Stress & Mood",
  socialSupport: "Social Support",
  lifestyle: "Lifestyle",
};

/**
 * Reflection bands. Deliberately non-clinical words: these describe how the
 * answers read back, not a condition anybody has.
 */
export const BANDS = ["steady", "watch", "strained"] as const;
export type Band = (typeof BANDS)[number];

/** Context questions calibrate interpretation; they are not an axis. */
export type ContextKey = "age" | "degree" | "year" | "cgpa";

/** How healthy an answer reads. 4 is the healthiest option, 0 the least. */
export type OptionScore = 0 | 1 | 2 | 3 | 4;

export type QuestionOption = {
  /** Stable machine value. Never change one after release; add a new option. */
  readonly value: string;
  readonly label: string;
  readonly score: OptionScore;
};

export type StepNumber = 1 | 2 | 3 | 4 | 5;

export type Question = {
  readonly id: string;
  readonly step: StepNumber;
  readonly prompt: string;
  /** `chips` renders a radio group, `select` a dropdown. Never free text. */
  readonly kind: "chips" | "select";
  readonly axis: Axis | "context";
  /** Only set for context questions, and only used for calibration/display. */
  readonly contextKey?: ContextKey;
  /** Relative weight inside its own axis. Ignored for context questions. */
  readonly weight: number;
  readonly options: readonly QuestionOption[];
};

/** A completed questionnaire: question id -> chosen option value. */
export type Answers = Readonly<Record<string, string>>;

/** Threshold adjustment derived from age, degree and year of study. */
export type Calibration = {
  /** Added to both band cutoffs. Positive means stricter. */
  readonly compositeShift: number;
  /** Plain-language reasons, shown to the user rather than hidden. */
  readonly reasons: readonly string[];
};

export type Assessment = {
  /** Per-axis health, 0-100, higher is healthier. */
  readonly axes: Readonly<Record<Axis, number>>;
  /** Equal-weighted mean of the six axes, 0-100. */
  readonly composite: number;
  readonly band: Band;
  /** True when a single low axis pushed the band up a level. */
  readonly floorTriggered: boolean;
  /** The axis that triggered the floor rule, if any. */
  readonly weakestAxis: Axis;
  readonly calibration: Calibration;
  /** Echoed back to the user as self-reported context. Never scored. */
  readonly context: Readonly<Partial<Record<ContextKey, string>>>;
};
