"use client";

import type { Question } from "@/lib/types";

/**
 * A question rendered as a row of tappable pills.
 *
 * These are real radio inputs inside a fieldset. Arrow-key navigation, the
 * "N of M" announcement and the grouping a screen reader reads out all come
 * from the platform — there is no ARIA here to get wrong, and nothing to
 * reimplement.
 *
 * The input itself is visually hidden but still focusable, so the focus ring
 * is drawn on the pill through `peer-focus-visible`.
 */
export function ChoiceChips({
  question,
  value,
  onChange,
  invalid,
}: {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <fieldset
      id={`q-${question.id}`}
      className="scroll-mt-24"
      aria-describedby={invalid ? `err-${question.id}` : undefined}
    >
      <legend className="font-display text-lg font-medium text-ink">{question.prompt}</legend>

      {invalid ? (
        <p id={`err-${question.id}`} className="mt-1 text-sm font-medium text-ink">
          Pick one option to continue.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {question.options.map((option) => {
          const selected = value === option.value;

          return (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name={question.id}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="peer sr-only-text"
              />
              <span
                className={[
                  "flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-base transition-colors",
                  "peer-focus-visible:outline peer-focus-visible:outline-[3px]",
                  "peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-focus",
                  selected
                    ? "border-primary bg-primary font-medium text-on-primary"
                    : "border-outline bg-surface text-ink hover:border-primary",
                ].join(" ")}
              >
                {selected ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="size-4 shrink-0 fill-current"
                  >
                    <path d="M7.6 14.2 3.8 10.4l1.4-1.4 2.4 2.4 6.2-6.2 1.4 1.4z" />
                  </svg>
                ) : null}
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
