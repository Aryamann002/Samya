import { describe, expect, it } from "vitest";
import { BANK_FINGERPRINT, decodeAnswers, encodeAnswers } from "./share";
import { QUESTIONS } from "./questions";
import { scoreAnswers } from "./scoring";
import { answersAt, randomAnswers } from "./test-utils";

describe("encodeAnswers / decodeAnswers", () => {
  it("round-trips an answer set unchanged", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const answers = randomAnswers(seed);
      expect(decodeAnswers(encodeAnswers(answers))).toEqual(answers);
    }
  });

  it("produces the same assessment after a round trip", () => {
    const answers = randomAnswers(7);
    const decoded = decodeAnswers(encodeAnswers(answers));

    expect(decoded).not.toBeNull();
    expect(scoreAnswers(decoded!)).toEqual(scoreAnswers(answers));
  });

  it("emits one digit per question plus a version and fingerprint", () => {
    const token = encodeAnswers(answersAt(2));
    const [version, fingerprint, digits] = token.split(".");

    expect(version).toBe("v1");
    expect(fingerprint).toBe(BANK_FINGERPRINT);
    expect(digits).toHaveLength(QUESTIONS.length);
  });

  it("refuses to encode an incomplete answer set", () => {
    const answers = { ...answersAt(2) } as Record<string, string>;
    delete answers.life_meals;

    expect(() => encodeAnswers(answers)).toThrow(/life_meals/);
  });

  it.each([
    ["empty", ""],
    ["no separators", "v1abc"],
    ["wrong version", `v9.${BANK_FINGERPRINT}.0000000000000000000000000`],
    ["stale fingerprint", "v1.zzzzzzz.0000000000000000000000000"],
    ["too short", `v1.${BANK_FINGERPRINT}.000`],
    ["non-numeric", `v1.${BANK_FINGERPRINT}.${"a".repeat(QUESTIONS.length)}`],
    ["digit out of range", `v1.${BANK_FINGERPRINT}.${"9".repeat(QUESTIONS.length)}`],
    ["injection attempt", "v1.<script>.alert(1)"],
  ])("returns null for a %s token", (_label, token) => {
    expect(decodeAnswers(token)).toBeNull();
  });

  it("never throws on arbitrary input", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const junk = Math.abs(Math.imul(seed, 2654435761)).toString(36);
      expect(() => decodeAnswers(junk)).not.toThrow();
    }
  });
});
