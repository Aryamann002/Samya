"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoiceChips } from "./ChoiceChips";
import { ChoiceSelect } from "./ChoiceSelect";
import { ProgressBar } from "./ProgressBar";
import { QUESTIONS_BY_ID, STEPS, STEP_BLURBS, STEP_TITLES, questionsForStep } from "@/lib/questions";
import { unansweredOnStep } from "@/lib/scoring";
import { encodeAnswers } from "@/lib/share";
import { useAnswers } from "@/store/session";
import type { StepNumber } from "@/lib/types";

const LAST_STEP = STEPS[STEPS.length - 1] ?? 5;

export function Wizard() {
  const router = useRouter();
  const { answers, answer, restored } = useAnswers();

  const [step, setStep] = useState<StepNumber>(1);
  const [missing, setMissing] = useState<readonly string[]>([]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const hasMoved = useRef(false);

  // Move focus to the new step's heading so a keyboard or screen-reader user
  // lands at the top of the new content instead of wherever the button was.
  useEffect(() => {
    if (!hasMoved.current) return;
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (missing.length > 0) errorRef.current?.focus();
  }, [missing]);

  const questions = questionsForStep(step);

  function goTo(next: StepNumber) {
    hasMoved.current = true;
    setMissing([]);
    setStep(next);
  }

  function handleContinue() {
    const unanswered = unansweredOnStep(answers, step);
    if (unanswered.length > 0) {
      setMissing(unanswered);
      return;
    }

    if (step < LAST_STEP) {
      goTo((step + 1) as StepNumber);
      return;
    }

    // The token lives in the fragment, so the answers never reach a server log.
    router.push(`/result#${encodeAnswers(answers)}`);
  }

  if (!restored) {
    // One frame before the draft is read. Rendering the questions here would
    // flash every chip from unanswered to answered.
    return <p className="py-12 text-ink-muted">Loading your answers…</p>;
  }

  return (
    <div className="space-y-8">
      <ProgressBar step={step} total={STEPS.length} />

      <div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight text-ink outline-none"
        >
          {STEP_TITLES[step]}
        </h1>
        <p className="mt-2 text-ink-muted">{STEP_BLURBS[step]}</p>
      </div>

      {missing.length > 0 ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border-2 border-ink bg-surface p-4 outline-none"
        >
          <h2 className="font-display text-lg font-medium text-ink">
            {missing.length === 1
              ? "One question still needs an answer"
              : `${missing.length} questions still need an answer`}
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {missing.map((id) => (
              <li key={id}>
                <a
                  href={`#q-${id}`}
                  className="text-ink underline underline-offset-4"
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(`q-${id}`)?.scrollIntoView({ block: "center" });
                    document.querySelector<HTMLElement>(`[name="${id}"], #${id}`)?.focus();
                  }}
                >
                  {QUESTIONS_BY_ID.get(id)?.prompt ?? id}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-5">
        {questions.map((question) => (
          <div
            key={question.id}
            className="rounded-2xl border border-outline-faint bg-surface p-5 sm:p-6"
          >
            {question.kind === "chips" ? (
              <ChoiceChips
                question={question}
                value={answers[question.id]}
                onChange={(value) => answer(question.id, value)}
                invalid={missing.includes(question.id)}
              />
            ) : (
              <ChoiceSelect
                question={question}
                value={answers[question.id]}
                onChange={(value) => answer(question.id, value)}
                invalid={missing.includes(question.id)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="no-print flex items-center justify-between gap-4 border-t border-outline-faint pt-6">
        <button
          type="button"
          onClick={() => goTo(Math.max(1, step - 1) as StepNumber)}
          disabled={step === 1}
          className="min-h-11 rounded-full px-4 py-2 text-ink underline underline-offset-4 disabled:invisible"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="min-h-11 rounded-full bg-primary px-6 py-2 font-medium text-on-primary"
        >
          {step === LAST_STEP ? "See what you told us" : "Continue"}
        </button>
      </div>
    </div>
  );
}
