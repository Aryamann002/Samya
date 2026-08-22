import type { Question, StepNumber } from "./types";

/**
 * The question bank — the single source of truth for the whole questionnaire.
 *
 * This is data, not code. Adding, removing or reordering a question means
 * editing this array and nothing else: the wizard, the scoring engine, the
 * radar and the rubric page all derive themselves from it.
 *
 * Every question is a fixed-choice control. There is no free-text input
 * anywhere in Sāmya, which is why the app cannot receive personal information
 * even by accident.
 *
 * Option scores run 0-4 where 4 is the healthiest answer. Where both extremes
 * are unhealthy (sleeping two hours or eleven; studying one hour a day or
 * twelve) the middle option carries the highest score.
 */
export const QUESTIONS: readonly Question[] = [
  // ---------------------------------------------------------------- step 1
  {
    id: "ctx_age",
    step: 1,
    prompt: "How old are you?",
    kind: "chips",
    axis: "context",
    contextKey: "age",
    weight: 0,
    options: [
      { value: "under18", label: "Under 18", score: 0 },
      { value: "18to20", label: "18–20", score: 0 },
      { value: "21to23", label: "21–23", score: 0 },
      { value: "24to26", label: "24–26", score: 0 },
      { value: "27plus", label: "27 or older", score: 0 },
    ],
  },
  {
    id: "ctx_degree",
    step: 1,
    prompt: "What are you studying towards?",
    kind: "select",
    axis: "context",
    contextKey: "degree",
    weight: 0,
    options: [
      { value: "undergraduate", label: "Undergraduate degree", score: 0 },
      { value: "postgraduate", label: "Postgraduate degree", score: 0 },
      { value: "doctoral", label: "Doctoral / research degree", score: 0 },
      { value: "diploma", label: "Diploma or certificate", score: 0 },
      { value: "other", label: "Something else", score: 0 },
    ],
  },
  {
    id: "ctx_year",
    step: 1,
    prompt: "Which year are you in?",
    kind: "select",
    axis: "context",
    contextKey: "year",
    weight: 0,
    options: [
      { value: "year1", label: "First year", score: 0 },
      { value: "year2", label: "Second year", score: 0 },
      { value: "year3", label: "Third year", score: 0 },
      { value: "year4", label: "Fourth year", score: 0 },
      { value: "year5plus", label: "Fifth year or beyond", score: 0 },
      { value: "na", label: "Not applicable", score: 0 },
    ],
  },
  {
    id: "ctx_cgpa",
    step: 1,
    prompt: "Roughly where does your CGPA sit?",
    kind: "select",
    axis: "context",
    contextKey: "cgpa",
    weight: 0,
    options: [
      { value: "below6", label: "Below 6", score: 0 },
      { value: "6to7", label: "6 – 7", score: 0 },
      { value: "7to8", label: "7 – 8", score: 0 },
      { value: "8to9", label: "8 – 9", score: 0 },
      { value: "9to10", label: "9 – 10", score: 0 },
      { value: "unsaid", label: "Not sure / prefer not to say", score: 0 },
    ],
  },

  // ---------------------------------------------------------------- step 2
  {
    id: "sleep_hours",
    step: 2,
    prompt: "On a typical night, how long do you actually sleep?",
    kind: "chips",
    axis: "sleep",
    weight: 3,
    options: [
      { value: "under4", label: "Under 4 hours", score: 0 },
      { value: "4to5", label: "4 – 5 hours", score: 1 },
      { value: "6to7", label: "6 – 7 hours", score: 3 },
      { value: "7to9", label: "7 – 9 hours", score: 4 },
      { value: "over9", label: "More than 9 hours", score: 2 },
    ],
  },
  {
    id: "sleep_quality",
    step: 2,
    prompt: "How rested do you feel when you wake up?",
    kind: "chips",
    axis: "sleep",
    weight: 3,
    options: [
      { value: "never", label: "Never rested", score: 0 },
      { value: "rarely", label: "Rarely", score: 1 },
      { value: "sometimes", label: "Sometimes", score: 2 },
      { value: "usually", label: "Usually", score: 3 },
      { value: "always", label: "Almost always", score: 4 },
    ],
  },
  {
    id: "sleep_consistency",
    step: 2,
    prompt: "Do you sleep and wake at roughly the same times?",
    kind: "chips",
    axis: "sleep",
    weight: 2,
    options: [
      { value: "rarely", label: "Rarely", score: 0 },
      { value: "sometimes", label: "Sometimes", score: 1 },
      { value: "often", label: "Often", score: 3 },
      { value: "always", label: "Almost always", score: 4 },
    ],
  },
  {
    id: "sleep_screen",
    step: 2,
    prompt: "Are you on a screen in the hour before bed?",
    kind: "chips",
    axis: "sleep",
    weight: 1,
    options: [
      { value: "every", label: "Every night", score: 0 },
      { value: "most", label: "Most nights", score: 1 },
      { value: "some", label: "Some nights", score: 2 },
      { value: "rarely", label: "Rarely", score: 3 },
      { value: "never", label: "Never", score: 4 },
    ],
  },

  // ---------------------------------------------------------------- step 3
  {
    id: "study_planning",
    step: 3,
    prompt: "How do you usually plan your study?",
    kind: "chips",
    axis: "studyHabits",
    weight: 2,
    options: [
      { value: "none", label: "I don't plan", score: 0 },
      { value: "vague", label: "A vague idea in my head", score: 1 },
      { value: "weekly", label: "A rough weekly plan", score: 3 },
      { value: "daily", label: "Daily and weekly plans", score: 4 },
    ],
  },
  {
    id: "study_procrastination",
    step: 3,
    prompt: "How often do you start work at the last minute?",
    kind: "chips",
    axis: "studyHabits",
    weight: 3,
    options: [
      { value: "always", label: "Almost always", score: 0 },
      { value: "often", label: "Often", score: 1 },
      { value: "sometimes", label: "Sometimes", score: 2 },
      { value: "rarely", label: "Rarely", score: 3 },
      { value: "never", label: "Almost never", score: 4 },
    ],
  },
  {
    id: "study_focus",
    step: 3,
    prompt: "How long can you study before you lose focus?",
    kind: "chips",
    axis: "studyHabits",
    weight: 2,
    options: [
      { value: "under10", label: "Under 10 minutes", score: 0 },
      { value: "10to25", label: "10 – 25 minutes", score: 1 },
      { value: "25to45", label: "25 – 45 minutes", score: 2 },
      { value: "45to90", label: "45 – 90 minutes", score: 4 },
      { value: "over90", label: "More than 90 minutes", score: 3 },
    ],
  },
  {
    id: "load_hours",
    step: 3,
    prompt: "Hours of classes plus study on a typical weekday?",
    kind: "chips",
    axis: "academicLoad",
    weight: 2,
    options: [
      { value: "under2", label: "Under 2 hours", score: 2 },
      { value: "2to4", label: "2 – 4 hours", score: 4 },
      { value: "4to6", label: "4 – 6 hours", score: 3 },
      { value: "6to9", label: "6 – 9 hours", score: 1 },
      { value: "over9", label: "More than 9 hours", score: 0 },
    ],
  },
  {
    id: "load_deadlines",
    step: 3,
    prompt: "How do your deadlines feel right now?",
    kind: "chips",
    axis: "academicLoad",
    weight: 3,
    options: [
      { value: "overwhelming", label: "Overwhelming", score: 0 },
      { value: "heavy", label: "Heavy", score: 1 },
      { value: "busy", label: "Busy but okay", score: 2 },
      { value: "manageable", label: "Manageable", score: 3 },
      { value: "comfortable", label: "Comfortable", score: 4 },
    ],
  },
  {
    id: "load_backlog",
    step: 3,
    prompt: "How much coursework is currently pending?",
    kind: "chips",
    axis: "academicLoad",
    weight: 3,
    options: [
      { value: "huge", label: "A pile I can't see the end of", score: 0 },
      { value: "large", label: "Quite a lot", score: 1 },
      { value: "some", label: "Some", score: 2 },
      { value: "little", label: "A little", score: 3 },
      { value: "none", label: "Nothing pending", score: 4 },
    ],
  },

  // ---------------------------------------------------------------- step 4
  {
    id: "stress_level",
    step: 4,
    prompt: "Over the past two weeks, how has your stress been?",
    kind: "chips",
    axis: "stressMood",
    weight: 3,
    options: [
      { value: "constant", label: "Constant", score: 0 },
      { value: "high", label: "High most days", score: 1 },
      { value: "variable", label: "Up and down", score: 2 },
      { value: "low", label: "Mostly low", score: 3 },
      { value: "calm", label: "Calm", score: 4 },
    ],
  },
  {
    id: "mood_interest",
    step: 4,
    prompt: "How much have you enjoyed things you usually like?",
    kind: "chips",
    axis: "stressMood",
    weight: 2,
    options: [
      { value: "notatall", label: "Not at all", score: 0 },
      { value: "alittle", label: "A little", score: 1 },
      { value: "somewhat", label: "Somewhat", score: 2 },
      { value: "mostly", label: "Mostly", score: 3 },
      { value: "fully", label: "As much as always", score: 4 },
    ],
  },
  {
    id: "stress_recovery",
    step: 4,
    prompt: "After a hard day, how long before you settle?",
    kind: "chips",
    axis: "stressMood",
    weight: 2,
    options: [
      { value: "never", label: "I don't really settle", score: 0 },
      { value: "days", label: "A few days", score: 1 },
      { value: "overnight", label: "Overnight", score: 2 },
      { value: "hours", label: "A few hours", score: 3 },
      { value: "quickly", label: "Quickly", score: 4 },
    ],
  },
  {
    id: "mood_overwhelm",
    step: 4,
    prompt: "How often have you felt unable to cope?",
    kind: "chips",
    axis: "stressMood",
    weight: 3,
    options: [
      { value: "daily", label: "Most days", score: 0 },
      { value: "weekly_several", label: "Several times a week", score: 1 },
      { value: "weekly", label: "About once a week", score: 2 },
      { value: "rarely", label: "Rarely", score: 3 },
      { value: "never", label: "Not at all", score: 4 },
    ],
  },

  // ---------------------------------------------------------------- step 5
  {
    id: "support_talk",
    step: 5,
    prompt: "Is there someone you can talk to honestly?",
    kind: "chips",
    axis: "socialSupport",
    weight: 3,
    options: [
      { value: "noone", label: "No one", score: 0 },
      { value: "notreally", label: "Not really", score: 1 },
      { value: "oneperson", label: "One person", score: 3 },
      { value: "several", label: "A few people", score: 4 },
    ],
  },
  {
    id: "support_belonging",
    step: 5,
    prompt: "How connected do you feel to the people around you?",
    kind: "chips",
    axis: "socialSupport",
    weight: 2,
    options: [
      { value: "isolated", label: "Isolated", score: 0 },
      { value: "distant", label: "Distant", score: 1 },
      { value: "neutral", label: "Neither", score: 2 },
      { value: "connected", label: "Connected", score: 3 },
      { value: "close", label: "Closely connected", score: 4 },
    ],
  },
  {
    id: "support_help",
    step: 5,
    prompt: "If you were struggling, would you ask for help?",
    kind: "chips",
    axis: "socialSupport",
    weight: 2,
    options: [
      { value: "definitelynot", label: "Definitely not", score: 0 },
      { value: "probablynot", label: "Probably not", score: 1 },
      { value: "maybe", label: "Maybe", score: 2 },
      { value: "probably", label: "Probably", score: 3 },
      { value: "definitely", label: "Definitely", score: 4 },
    ],
  },
  {
    id: "life_activity",
    step: 5,
    prompt: "Days a week you move your body for 30 minutes or more?",
    kind: "chips",
    axis: "lifestyle",
    weight: 2,
    options: [
      { value: "0", label: "None", score: 0 },
      { value: "1", label: "1 day", score: 1 },
      { value: "2to3", label: "2 – 3 days", score: 2 },
      { value: "4to5", label: "4 – 5 days", score: 3 },
      { value: "6to7", label: "6 – 7 days", score: 4 },
    ],
  },
  {
    id: "life_meals",
    step: 5,
    prompt: "How regular are your meals?",
    kind: "chips",
    axis: "lifestyle",
    weight: 2,
    options: [
      { value: "veryirregular", label: "Very irregular", score: 0 },
      { value: "skip", label: "I often skip meals", score: 1 },
      { value: "somewhat", label: "Somewhat regular", score: 2 },
      { value: "mostly", label: "Mostly regular", score: 3 },
      { value: "regular", label: "Regular", score: 4 },
    ],
  },
  {
    id: "life_screen",
    step: 5,
    prompt: "Screen time on a typical day, outside study?",
    kind: "chips",
    axis: "lifestyle",
    weight: 1,
    options: [
      { value: "over8", label: "More than 8 hours", score: 0 },
      { value: "6to8", label: "6 – 8 hours", score: 1 },
      { value: "4to6", label: "4 – 6 hours", score: 2 },
      { value: "2to4", label: "2 – 4 hours", score: 3 },
      { value: "under2", label: "Under 2 hours", score: 4 },
    ],
  },
];

export const STEPS: readonly StepNumber[] = [1, 2, 3, 4, 5];

export const STEP_TITLES: Readonly<Record<StepNumber, string>> = {
  1: "About you",
  2: "Sleep & rest",
  3: "Study & coursework",
  4: "Stress & mood",
  5: "Support & lifestyle",
};

export const STEP_BLURBS: Readonly<Record<StepNumber, string>> = {
  1: "None of this identifies you. It only shapes how your answers are read back.",
  2: "Think about the last two weeks rather than an unusual night.",
  3: "Answer for how things are now, not how you would like them to be.",
  4: "There are no wrong answers here, and nothing is being diagnosed.",
  5: "The last stretch — six quick ones.",
};

export function questionsForStep(step: StepNumber): readonly Question[] {
  return QUESTIONS.filter((question) => question.step === step);
}

/** Fast lookup used by the scoring engine and the wizard. */
export const QUESTIONS_BY_ID: ReadonlyMap<string, Question> = new Map(
  QUESTIONS.map((question) => [question.id, question]),
);
