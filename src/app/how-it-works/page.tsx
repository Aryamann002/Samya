import type { Metadata } from "next";
import Link from "next/link";
import { QUESTIONS } from "@/lib/questions";
import { FLOOR_THRESHOLD, STEADY_CUTOFF, WATCH_CUTOFF } from "@/lib/scoring";
import { AXES, AXIS_LABELS, type Axis } from "@/lib/types";

export const metadata: Metadata = {
  title: "How this works",
  description:
    "The complete rubric behind Sāmya: every question, every weight, every band cutoff, and what is deliberately excluded.",
};

/**
 * The rubric, published in full.
 *
 * This page reads the real question bank and the real constants from the
 * scoring engine, so it cannot drift out of step with the code that actually
 * runs. If a weight changes, this page changes with it.
 */
export default function HowItWorksPage() {
  const scored = QUESTIONS.filter((question) => question.axis !== "context");
  const byAxis = new Map<Axis, typeof scored>(AXES.map((axis) => [axis, []]));

  for (const question of scored) {
    if (question.axis === "context") continue;
    byAxis.get(question.axis)?.push(question);
  }

  return (
    <div className="space-y-10 py-4">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          How this works
        </h1>
        <p className="max-w-prose text-ink-muted">
          Sāmya has no model deciding anything about you. It applies a fixed set of arithmetic rules
          to the options you tapped. Those rules are below in full, so you can check the result
          against them yourself.
        </p>
      </header>

      <section aria-labelledby="steps-heading" className="space-y-3">
        <h2 id="steps-heading" className="font-display text-2xl font-medium text-ink">
          The arithmetic, in order
        </h2>
        <ol className="max-w-prose list-decimal space-y-3 pl-5 text-ink-muted">
          <li>
            Every option carries a score from 0 to 4, where 4 is the healthier answer. Where both
            extremes are unhealthy — sleeping three hours or eleven — the middle option scores
            highest.
          </li>
          <li>
            Each of the six areas is the weighted average of its own questions, rescaled to a number
            out of 100. The weights are listed below.
          </li>
          <li>
            The overall figure is the plain average of those six numbers. All six areas count
            equally: Sāmya makes no claim that one part of your life matters more than another.
          </li>
          <li>
            <strong className="text-ink">{STEADY_CUTOFF} or above</strong> reads as Steady,{" "}
            <strong className="text-ink">{WATCH_CUTOFF} to {STEADY_CUTOFF - 1}</strong> as Worth
            watching, and below {WATCH_CUTOFF} as Strained.
          </li>
          <li>
            <strong className="text-ink">The floor rule.</strong> If any single area falls below{" "}
            {FLOOR_THRESHOLD}, the band moves up one level regardless of the average. One area under
            real pressure matters more than a comfortable overall number.
          </li>
          <li>
            Your age, course and year shift those two cutoffs by at most four points in either
            direction, and the reason is shown to you on the result. Nothing else moves them.
          </li>
        </ol>
      </section>

      <section aria-labelledby="excluded-heading" className="space-y-3">
        <h2 id="excluded-heading" className="font-display text-2xl font-medium text-ink">
          What is deliberately excluded
        </h2>
        <p className="max-w-prose text-ink-muted">
          <strong className="text-ink">Your CGPA never touches the result.</strong> It is asked
          because students think about their term partly in those terms, and it is shown back to you
          as your own reported context — but it enters no calculation, adjusts no cutoff and changes
          no wording. That is what lets Sāmya say honestly that it does not predict anyone&rsquo;s
          grades: it has no path by which a grade could influence the outcome.
        </p>
      </section>

      <section aria-labelledby="weights-heading" className="space-y-6">
        <h2 id="weights-heading" className="font-display text-2xl font-medium text-ink">
          Every question and its weight
        </h2>

        {AXES.map((axis) => {
          const questions = byAxis.get(axis) ?? [];
          const total = questions.reduce((sum, question) => sum + question.weight, 0);

          return (
            <div key={axis} className="rounded-2xl border border-outline-faint bg-surface p-5">
              <h3 className="font-display text-lg font-medium text-ink">{AXIS_LABELS[axis]}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                {questions.length} questions, weights totalling {total}.
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-faint text-ink-muted">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Question
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Weight
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Options, best to worst
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((question) => (
                      <tr key={question.id} className="border-b border-outline-faint align-top">
                        <th scope="row" className="py-2 pr-4 font-normal text-ink">
                          {question.prompt}
                        </th>
                        <td className="py-2 pr-4 tabular-nums text-ink-muted">{question.weight}</td>
                        <td className="py-2 text-ink-muted">
                          {[...question.options]
                            .sort((a, b) => b.score - a.score)
                            .map((option) => `${option.label} (${option.score})`)
                            .join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="limits-heading" className="space-y-3">
        <h2 id="limits-heading" className="font-display text-2xl font-medium text-ink">
          What this cannot tell you
        </h2>
        <ul className="max-w-prose list-disc space-y-2 pl-5 text-ink-muted">
          <li>
            The weights are considered judgements, not findings from a study. They were chosen to be
            reasonable and are published so you can disagree with them.
          </li>
          <li>
            Sāmya only knows the twenty answers you gave. It knows nothing about your circumstances,
            and a low reading may have an obvious explanation it cannot see.
          </li>
          <li>
            It is not a screening tool. A calm result is not evidence that you are fine, and a low
            one is not evidence that anything is wrong.
          </li>
        </ul>
        <p className="pt-2">
          <Link href="/assess" className="text-ink underline underline-offset-4">
            Answer the questions
          </Link>
        </p>
      </section>
    </div>
  );
}
