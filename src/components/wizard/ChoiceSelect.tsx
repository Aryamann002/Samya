"use client";

import type { Question } from "@/lib/types";

/**
 * A question rendered as a native dropdown, used where a list is long enough
 * that a row of pills would wrap into a wall.
 *
 * Native `<select>` on purpose: it is keyboard and screen-reader correct
 * everywhere, and on a phone it opens the platform picker, which is a better
 * control than anything a custom listbox would give us.
 */
export function ChoiceSelect({
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
  const errorId = `err-${question.id}`;

  return (
    <div id={`q-${question.id}`} className="scroll-mt-24">
      <label htmlFor={question.id} className="block font-display text-lg font-medium text-ink">
        {question.prompt}
      </label>

      {invalid ? (
        <p id={errorId} className="mt-1 text-sm font-medium text-ink">
          Choose an option to continue.
        </p>
      ) : null}

      <select
        id={question.id}
        name={question.id}
        value={value ?? ""}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-11 w-full rounded-xl border border-outline bg-surface px-3 py-2 text-base text-ink"
      >
        <option value="" disabled>
          Select an option
        </option>
        {question.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
