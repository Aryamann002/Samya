import Link from "next/link";
import { AXES, AXIS_LABELS } from "@/lib/types";
import { QUESTIONS } from "@/lib/questions";

const SCORED_QUESTIONS = QUESTIONS.filter((question) => question.axis !== "context").length;

/**
 * Landing page. A Server Component: it ships no JavaScript of its own, so the
 * first thing a student loads is essentially HTML and one stylesheet.
 */
export default function HomePage() {
  return (
    <div className="space-y-12 py-6">
      <section className="space-y-5">
        <p className="text-sm uppercase tracking-widest text-ink-muted">Sāmya · साम्य · balance</p>
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          A quiet look at how your term is actually going.
        </h1>
        <p className="max-w-prose text-lg text-ink-muted">
          Answer {SCORED_QUESTIONS} tap-to-select questions about sleep, study, workload, mood,
          support and daily routine. Sāmya reflects your own answers back to you across six areas
          — and shows you exactly how it worked them out.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/assess"
            className="inline-flex min-h-12 items-center rounded-full bg-primary px-7 text-base font-medium text-on-primary"
          >
            Start — takes about 4 minutes
          </Link>
          <Link href="/how-it-works" className="text-ink underline underline-offset-4">
            See the full rubric first
          </Link>
        </div>
      </section>

      <section aria-labelledby="what-it-is" className="space-y-4">
        <h2 id="what-it-is" className="font-display text-2xl font-medium text-ink">
          What this is, and what it is not
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-outline-faint bg-surface p-5">
            <h3 className="font-display text-lg font-medium text-ink">It is</h3>
            <p className="mt-2 text-ink-muted">
              A structured way to notice patterns you already half-know about — put into words, and
              tied to the specific answers you gave.
            </p>
          </div>
          <div className="rounded-2xl border border-outline-faint bg-surface p-5">
            <h3 className="font-display text-lg font-medium text-ink">It is not</h3>
            <p className="mt-2 text-ink-muted">
              A medical, psychological or academic assessment. It diagnoses nothing, and it makes no
              prediction about anyone&rsquo;s grades.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="areas" className="space-y-4">
        <h2 id="areas" className="font-display text-2xl font-medium text-ink">
          The six areas
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {AXES.map((axis) => (
            <li
              key={axis}
              className="rounded-xl border border-outline-faint bg-surface-sunken px-4 py-3 text-ink"
            >
              {AXIS_LABELS[axis]}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="privacy" className="space-y-4">
        <h2 id="privacy" className="font-display text-2xl font-medium text-ink">
          Why you are not asked for your name
        </h2>
        <ul className="space-y-3 text-ink-muted">
          <li className="max-w-prose">
            <strong className="text-ink">There is no text box anywhere.</strong> Every question is a
            button or a dropdown, so there is no way to type a name, an email or a roll number into
            Sāmya even by accident.
          </li>
          <li className="max-w-prose">
            <strong className="text-ink">Nothing is sent anywhere.</strong> The maths runs in your
            browser. There is no account, no database and no analytics.
          </li>
          <li className="max-w-prose">
            <strong className="text-ink">Nothing is hidden from you.</strong> Every rule Sāmya uses
            to read your answers is published on the{" "}
            <Link href="/how-it-works" className="text-ink underline underline-offset-4">
              how this works
            </Link>{" "}
            page.
          </li>
        </ul>
      </section>
    </div>
  );
}
