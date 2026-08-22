import { describe, expect, it } from "vitest";
import {
  FLOOR_THRESHOLD,
  STEADY_CUTOFF,
  WATCH_CUTOFF,
  deriveBand,
  scoreAnswers,
} from "./scoring";
import { calibrate } from "./calibration";
import { QUESTIONS } from "./questions";
import { answersAt, collapseAxis, maximiseAxis, randomAnswers } from "./test-utils";
import { AXES, type Axis } from "./types";

const NO_CALIBRATION = { compositeShift: 0, reasons: [] };

/** Builds an axis record from a single value, then applies overrides. */
function axesAt(value: number, overrides: Partial<Record<Axis, number>> = {}) {
  const record = Object.fromEntries(AXES.map((axis) => [axis, value])) as Record<Axis, number>;
  return { ...record, ...overrides };
}

describe("question bank integrity", () => {
  it("gives every question a unique id", () => {
    const ids = QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every question at least two options with unique values", () => {
    for (const question of QUESTIONS) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      const values = question.options.map((option) => option.value);
      expect(new Set(values).size, `duplicate option in ${question.id}`).toBe(values.length);
    }
  });

  it("covers all six axes", () => {
    const covered = new Set(QUESTIONS.map((question) => question.axis));
    for (const axis of AXES) expect(covered.has(axis)).toBe(true);
  });

  it("gives every scored question a positive weight and every context question none", () => {
    for (const question of QUESTIONS) {
      if (question.axis === "context") expect(question.weight).toBe(0);
      else expect(question.weight).toBeGreaterThan(0);
    }
  });

  it("offers a best and a worst option on every scored question", () => {
    for (const question of QUESTIONS) {
      if (question.axis === "context") continue;
      const scores = question.options.map((option) => option.score);
      expect(Math.max(...scores), `${question.id} has no healthy option`).toBe(4);
      expect(Math.min(...scores), `${question.id} has no unhealthy option`).toBe(0);
    }
  });
});

describe("deriveBand", () => {
  it("returns steady at and above the steady cutoff", () => {
    expect(deriveBand(axesAt(STEADY_CUTOFF), NO_CALIBRATION).band).toBe("steady");
    expect(deriveBand(axesAt(100), NO_CALIBRATION).band).toBe("steady");
  });

  it("returns watch one point below the steady cutoff", () => {
    expect(deriveBand(axesAt(STEADY_CUTOFF - 1), NO_CALIBRATION).band).toBe("watch");
  });

  it("returns watch at the watch cutoff and strained one point below", () => {
    expect(deriveBand(axesAt(WATCH_CUTOFF), NO_CALIBRATION).band).toBe("watch");
    expect(deriveBand(axesAt(WATCH_CUTOFF - 1), NO_CALIBRATION).band).toBe("strained");
  });

  it("raises steady to watch when one axis falls below the floor", () => {
    const axes = axesAt(100, { socialSupport: FLOOR_THRESHOLD - 1 });
    const result = deriveBand(axes, NO_CALIBRATION);

    expect(result.band).toBe("watch");
    expect(result.floorTriggered).toBe(true);
    expect(result.weakestAxis).toBe("socialSupport");
  });

  it("raises watch to strained when one axis falls below the floor", () => {
    // Composite lands at 68 — comfortably inside watch before the floor rule.
    const axes = axesAt(75, { sleep: 30 });
    expect(deriveBand(axes, NO_CALIBRATION).composite).toBe(68);
    expect(deriveBand(axes, NO_CALIBRATION).band).toBe("strained");
  });

  it("leaves strained unchanged when the floor also triggers", () => {
    const result = deriveBand(axesAt(20), NO_CALIBRATION);

    expect(result.band).toBe("strained");
    expect(result.floorTriggered).toBe(true);
  });

  it("does not trigger the floor exactly at the threshold", () => {
    const result = deriveBand(axesAt(100, { lifestyle: FLOOR_THRESHOLD }), NO_CALIBRATION);

    expect(result.floorTriggered).toBe(false);
    expect(result.band).toBe("steady");
  });

  it("reports the weakest axis even when the floor does not trigger", () => {
    expect(deriveBand(axesAt(90, { lifestyle: 80 }), NO_CALIBRATION).weakestAxis).toBe("lifestyle");
  });

  it("applies a positive calibration shift by raising the cutoffs", () => {
    const axes = axesAt(STEADY_CUTOFF);

    expect(deriveBand(axes, { compositeShift: 3, reasons: [] }).band).toBe("watch");
    expect(deriveBand(axes, NO_CALIBRATION).band).toBe("steady");
  });

  it("applies a negative calibration shift by lowering the cutoffs", () => {
    const axes = axesAt(STEADY_CUTOFF - 2);

    expect(deriveBand(axes, NO_CALIBRATION).band).toBe("watch");
    expect(deriveBand(axes, { compositeShift: -2, reasons: [] }).band).toBe("steady");
  });

  it("computes the composite as the plain mean of the six axis values", () => {
    const axes = axesAt(60, { sleep: 90, lifestyle: 30 });
    expect(deriveBand(axes, NO_CALIBRATION).composite).toBe(60);
  });
});

describe("scoreAnswers", () => {
  it("scores an all-worst questionnaire at zero and strained", () => {
    const result = scoreAnswers(answersAt(0));

    expect(result.composite).toBe(0);
    expect(result.band).toBe("strained");
    for (const axis of AXES) expect(result.axes[axis]).toBe(0);
  });

  it("scores an all-best questionnaire at one hundred and steady", () => {
    const result = scoreAnswers(answersAt(4));

    expect(result.composite).toBe(100);
    expect(result.band).toBe("steady");
    for (const axis of AXES) expect(result.axes[axis]).toBe(100);
  });

  it("collapses only the axis it is told to collapse", () => {
    const result = scoreAnswers(collapseAxis(answersAt(4), "sleep"));

    expect(result.axes.sleep).toBe(0);
    expect(result.axes.stressMood).toBe(100);
    expect(result.weakestAxis).toBe("sleep");
    expect(result.floorTriggered).toBe(true);
    expect(result.band).toBe("watch");
  });

  it.each(AXES)("maximises %s independently", (axis) => {
    const result = scoreAnswers(maximiseAxis(answersAt(0), axis));

    expect(result.axes[axis]).toBe(100);
    for (const other of AXES) {
      if (other !== axis) expect(result.axes[other]).toBe(0);
    }
  });

  it("weights questions inside an axis rather than averaging them flatly", () => {
    // sleep_hours carries weight 3, sleep_screen weight 1. Perfecting the
    // heavier question must move the axis further than perfecting the lighter.
    const base = answersAt(0);
    const heavy = scoreAnswers({ ...base, sleep_hours: "7to9" }).axes.sleep;
    const light = scoreAnswers({ ...base, sleep_screen: "never" }).axes.sleep;

    expect(heavy).toBeGreaterThan(light);
  });

  it("echoes context back without letting it reach an axis", () => {
    const result = scoreAnswers(answersAt(2));

    expect(result.context.age).toBe("under18");
    expect(result.context.cgpa).toBe("below6");
  });

  it("produces an identical assessment for every CGPA answer", () => {
    const base = answersAt(2);
    const reference = scoreAnswers(base);

    for (const option of ["below6", "6to7", "7to8", "8to9", "9to10", "unsaid"]) {
      const result = scoreAnswers({ ...base, ctx_cgpa: option });

      expect(result.axes).toEqual(reference.axes);
      expect(result.composite).toBe(reference.composite);
      expect(result.band).toBe(reference.band);
      expect(result.calibration).toEqual(reference.calibration);
    }
  });

  it("changes the band when age and year calibration shift the cutoffs", () => {
    const base = answersAt(3);
    const lenient = scoreAnswers({
      ...base,
      ctx_age: "27plus",
      ctx_year: "year5plus",
      ctx_degree: "doctoral",
    });
    const strict = scoreAnswers({ ...base, ctx_age: "under18", ctx_year: "year1" });

    expect(lenient.calibration.compositeShift).toBeLessThan(0);
    expect(strict.calibration.compositeShift).toBeGreaterThan(0);
    expect(lenient.composite).toBe(strict.composite);
  });

  it("rejects an incomplete questionnaire", () => {
    const incomplete = { ...answersAt(2) } as Record<string, string>;
    delete incomplete.sleep_hours;

    expect(() => scoreAnswers(incomplete)).toThrow(/sleep_hours/);
  });

  it("rejects an option value that is not on the question", () => {
    expect(() => scoreAnswers({ ...answersAt(2), sleep_hours: "twelve" })).toThrow(/twelve/);
  });

  it("ignores answers to questions that no longer exist", () => {
    const withStale = { ...answersAt(2), removed_question: "whatever" };
    expect(scoreAnswers(withStale).composite).toBe(scoreAnswers(answersAt(2)).composite);
  });

  it("keeps every axis, the composite and the band well formed for arbitrary input", () => {
    for (let seed = 1; seed <= 2000; seed += 1) {
      const result = scoreAnswers(randomAnswers(seed));

      for (const axis of AXES) {
        expect(result.axes[axis]).toBeGreaterThanOrEqual(0);
        expect(result.axes[axis]).toBeLessThanOrEqual(100);
        expect(Number.isInteger(result.axes[axis])).toBe(true);
      }
      expect(result.composite).toBeGreaterThanOrEqual(0);
      expect(result.composite).toBeLessThanOrEqual(100);
      expect(["steady", "watch", "strained"]).toContain(result.band);
      expect(result.axes[result.weakestAxis]).toBe(Math.min(...AXES.map((a) => result.axes[a])));
    }
  });
});

describe("calibrate", () => {
  it("returns no shift and no reasons for an empty context", () => {
    expect(calibrate({})).toEqual({ compositeShift: 0, reasons: [] });
  });

  it("returns no shift for context values it does not recognise", () => {
    expect(calibrate({ age: "not-a-band", year: "year99" }).compositeShift).toBe(0);
  });

  it("gives a reason for every contributing rule", () => {
    const result = calibrate({ age: "under18", year: "year1", degree: "doctoral" });

    expect(result.reasons).toHaveLength(3);
    expect(result.compositeShift).toBe(3);
  });

  it("clamps the shift to plus or minus four", () => {
    expect(calibrate({ age: "27plus", year: "year5plus", degree: "doctoral" }).compositeShift).toBe(
      -4,
    );
  });

  it("never reacts to CGPA", () => {
    expect(calibrate({ cgpa: "9to10" })).toEqual(calibrate({ cgpa: "below6" }));
  });
});
