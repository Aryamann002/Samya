/**
 * Wizard progress.
 *
 * The bar is decorative; the sentence beside it is the real thing. Screen
 * readers get "Step 3 of 5" as text, and the change is announced politely as
 * the student moves through rather than being trapped in an ARIA attribute.
 */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const percent = Math.round((step / total) * 100);

  return (
    <div className="no-print">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
        Step {step} of {total}
      </p>
    </div>
  );
}
