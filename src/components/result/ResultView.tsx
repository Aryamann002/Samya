"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { RadarChart } from "./RadarChart";
import { ActionList, BandCard, ExportBar, FindingCard, ResourceBlock } from "./ResultSections";
import { bandCopy, buildActions, buildFindings, buildSummary } from "@/lib/findings";
import { scoreAnswers } from "@/lib/scoring";
import { decodeAnswers } from "@/lib/share";
import { AXIS_LABELS, type Answers } from "@/lib/types";

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash(): string {
  return window.location.hash.replace(/^#/, "");
}

/** No fragment exists on the server; `null` is what distinguishes "not read yet". */
function noHashOnServer(): null {
  return null;
}

/**
 * Reads the result out of the URL fragment and renders it.
 *
 * The fragment never leaves the browser — it is not sent with the request, so
 * a shared link does not put anybody's answers in a server log. It also means
 * a refresh, a bookmark or a shared link all rebuild the same page from the
 * same rules, with no storage involved.
 */
export function ResultView() {
  const token = useSyncExternalStore(subscribeToHash, readHash, noHashOnServer);
  const answers: Answers | null = useMemo(
    () => (token === null || token === "" ? null : decodeAnswers(token)),
    [token],
  );

  if (token === null) {
    return <p className="py-12 text-ink-muted">Reading your answers…</p>;
  }

  if (answers === null) {
    return (
      <div className="space-y-4 py-12">
        <h1 className="text-3xl font-semibold text-ink">There is nothing to show yet</h1>
        <p className="max-w-prose text-ink-muted">
          This page builds itself from a link created at the end of the questionnaire. The link is
          either missing, incomplete, or from an older version of the questions.
        </p>
        <Link
          href="/assess"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-medium text-on-primary"
        >
          Answer the questions
        </Link>
      </div>
    );
  }

  return <Result answers={answers} />;
}

function Result({ answers }: { answers: Answers }) {
  const assessment = useMemo(() => scoreAnswers(answers), [answers]);
  const findings = useMemo(() => buildFindings(assessment, answers), [assessment, answers]);
  const actions = useMemo(() => buildActions(assessment), [assessment]);
  const summary = useMemo(
    () => buildSummary(assessment, findings, actions),
    [assessment, findings, actions],
  );

  const copy = bandCopy(assessment);
  const narrative = useNarrative(assessment);

  return (
    <div className="space-y-10 py-4">
      <div className="rise">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What you told us
        </h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Everything below comes from your own answers and the published rubric. Nothing here was
          guessed, and nothing was compared against anyone else.
        </p>
      </div>

      <BandCard
        assessment={assessment}
        title={copy.title}
        meaning={copy.meaning}
        weakestLabel={AXIS_LABELS[assessment.weakestAxis]}
      />

      {narrative === null ? null : (
        <section aria-labelledby="narrative-heading" className="reveal space-y-3">
          <h2 id="narrative-heading" className="font-display text-2xl font-medium text-ink">
            In a few words
          </h2>
          {narrative.split("\n\n").map((paragraph) => (
            <p key={paragraph} className="max-w-prose text-ink-muted">
              {paragraph}
            </p>
          ))}
        </section>
      )}

      <section aria-labelledby="radar-heading" className="reveal space-y-4">
        <h2 id="radar-heading" className="font-display text-2xl font-medium text-ink">
          The six areas
        </h2>
        <RadarChart axes={assessment.axes} />
      </section>

      <section aria-labelledby="shaped-heading" className="space-y-4">
        <h2 id="shaped-heading" className="font-display text-2xl font-medium text-ink">
          What shaped this
        </h2>
        <div className="space-y-4">
          {findings.map((finding) => (
            <FindingCard key={finding.axis} finding={finding} />
          ))}
        </div>
      </section>

      <section aria-labelledby="actions-heading" className="space-y-4">
        <h2 id="actions-heading" className="font-display text-2xl font-medium text-ink">
          Three things to try
        </h2>
        <p className="max-w-prose text-ink-muted">
          Taken from the three areas under most pressure. Start with one.
        </p>
        <ActionList actions={actions} />
      </section>

      <ResourceBlock />

      <section
        aria-labelledby="disclaimer-heading"
        className="rounded-2xl border-2 border-outline p-6"
      >
        <h2 id="disclaimer-heading" className="font-display text-xl font-medium text-ink">
          Please read this part
        </h2>
        <p className="mt-2 max-w-prose text-ink">
          Sāmya is a self-reflection aid based on what you reported about yourself. It is not a
          medical, psychological or academic assessment. It does not diagnose anything, it cannot
          tell you whether you are unwell, and it does not predict anyone&rsquo;s grades. If
          something here worries you, talk to a person — a friend, a doctor, a counsellor, or one of
          the lines above.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Want to check the maths?{" "}
          <Link href="/how-it-works" className="underline underline-offset-4">
            Every rule is published here.
          </Link>
        </p>
      </section>

      <ExportBar summary={summary} />
    </div>
  );
}

/**
 * Asks the optional Gemini route to reword the findings.
 *
 * Returns `null` until something is available, and stays `null` for good if
 * the route is absent, rate-limited or slow. Sāmya is complete without it —
 * the narrative is a nicety layered on top of a result that is already final.
 */
function useNarrative(assessment: ReturnType<typeof scoreAnswers>) {
  const [narrative, setNarrative] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/reflect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        band: assessment.band,
        composite: assessment.composite,
        axes: assessment.axes,
      }),
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? await response.json() : null))
      .then((data: unknown) => {
        if (
          typeof data === "object" &&
          data !== null &&
          "narrative" in data &&
          typeof data.narrative === "string"
        ) {
          setNarrative(data.narrative);
        }
      })
      .catch(() => {
        // The page is already complete. A missing narrative changes nothing.
      });

    return () => controller.abort();
  }, [assessment]);

  return narrative;
}
