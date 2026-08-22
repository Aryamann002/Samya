import { describe, expect, it } from "vitest";
import { bandCopy, buildActions, buildFindings, levelFor } from "./findings";
import { STEADY_CUTOFF, WATCH_CUTOFF, scoreAnswers } from "./scoring";
import { answersAt, collapseAxis, maximiseAxis, randomAnswers } from "./test-utils";
import { AXES, AXIS_LABELS } from "./types";

describe("levelFor", () => {
  it("splits at the same cutoffs the bands use", () => {
    expect(levelFor(STEADY_CUTOFF)).toBe("good");
    expect(levelFor(STEADY_CUTOFF - 1)).toBe("moderate");
    expect(levelFor(WATCH_CUTOFF)).toBe("moderate");
    expect(levelFor(WATCH_CUTOFF - 1)).toBe("low");
    expect(levelFor(0)).toBe("low");
    expect(levelFor(100)).toBe("good");
  });
});

describe("buildFindings", () => {
  it("returns one finding per axis in radar order", () => {
    const answers = answersAt(2);
    const findings = buildFindings(scoreAnswers(answers), answers);

    expect(findings.map((finding) => finding.axis)).toEqual([...AXES]);
    for (const finding of findings) {
      expect(finding.label).toBe(AXIS_LABELS[finding.axis]);
      expect(finding.summary.length).toBeGreaterThan(0);
    }
  });

  it("names the answers that pulled an axis down", () => {
    const answers = collapseAxis(answersAt(4), "sleep");
    const sleep = buildFindings(scoreAnswers(answers), answers)[0];

    expect(sleep?.axis).toBe("sleep");
    expect(sleep?.level).toBe("low");
    expect(sleep?.drivers.length).toBeGreaterThan(0);
    expect(sleep?.drivers.some((driver) => driver.includes("Under 4 hours"))).toBe(true);
  });

  it("names nothing on an axis where every answer was healthy", () => {
    const answers = maximiseAxis(answersAt(0), "lifestyle");
    const lifestyle = buildFindings(scoreAnswers(answers), answers).find(
      (finding) => finding.axis === "lifestyle",
    );

    expect(lifestyle?.level).toBe("good");
    expect(lifestyle?.drivers).toEqual([]);
  });

  it("keeps the finding value identical to the assessment value", () => {
    const answers = randomAnswers(42);
    const assessment = scoreAnswers(answers);

    for (const finding of buildFindings(assessment, answers)) {
      expect(finding.value).toBe(assessment.axes[finding.axis]);
    }
  });
});

describe("buildActions", () => {
  it("returns exactly three actions", () => {
    expect(buildActions(scoreAnswers(answersAt(2)))).toHaveLength(3);
  });

  it("draws them from the three weakest axes, weakest first", () => {
    const assessment = scoreAnswers(collapseAxis(answersAt(4), "socialSupport"));
    const actions = buildActions(assessment);

    expect(actions[0]?.axis).toBe("socialSupport");
    const values = actions.map((action) => assessment.axes[action.axis]);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it("never repeats an axis", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const actions = buildActions(scoreAnswers(randomAnswers(seed)));
      expect(new Set(actions.map((action) => action.axis)).size).toBe(3);
      for (const action of actions) expect(action.text.length).toBeGreaterThan(0);
    }
  });

  it("gives a maintaining action rather than a fixing one when everything is healthy", () => {
    const actions = buildActions(scoreAnswers(answersAt(4)));
    expect(actions).toHaveLength(3);
    for (const action of actions) expect(action.text.length).toBeGreaterThan(0);
  });
});

describe("bandCopy", () => {
  it("uses non-clinical wording for every band", () => {
    const clinical = /\b(diagnos(is|ed)|disorder|illness|patient|symptom|treatment)\b/i;

    for (const level of [0, 2, 4] as const) {
      const copy = bandCopy(scoreAnswers(answersAt(level)));
      expect(copy.title.length).toBeGreaterThan(0);
      // "not a diagnosis" is allowed; a claim of one is not.
      expect(copy.meaning.replace(/not a diagnosis/gi, "")).not.toMatch(clinical);
    }
  });
});
