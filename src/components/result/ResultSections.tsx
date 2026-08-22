"use client";

import { useState } from "react";
import Link from "next/link";
import type { Action, AxisFinding, Level } from "@/lib/findings";
import { SUPPORT_CONTACTS, telHref } from "@/lib/resources";
import { clearDraft } from "@/store/session";
import type { Assessment } from "@/lib/types";

/**
 * Bands are told apart by tone and by words, never by hue alone. There is no
 * red / amber / green scale here on purpose: a traffic light reads as medical
 * triage, and Sāmya is not triaging anybody.
 */
const BAND_TONE = {
  steady: "bg-primary-container text-on-primary-container",
  watch: "bg-accent-container text-ink",
  strained: "bg-surface-raised text-ink",
} as const;

const LEVEL_WORD: Readonly<Record<Level, string>> = {
  low: "Under strain",
  moderate: "Mixed",
  good: "Holding up",
};

export function BandCard({
  assessment,
  title,
  meaning,
  weakestLabel,
}: {
  assessment: Assessment;
  title: string;
  meaning: string;
  weakestLabel: string;
}) {
  return (
    <section
      aria-labelledby="band-heading"
      className={`scale-in glass-sheen rounded-3xl p-6 shadow-[var(--samya-glass-shadow)] sm:p-8 ${BAND_TONE[assessment.band]}`}
    >
      <p className="text-sm uppercase tracking-widest opacity-80">Your reflection band</p>
      <h2 id="band-heading" className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-prose text-lg">{meaning}</p>

      <p className="mt-5 inline-flex rounded-full bg-surface/70 px-3 py-1 text-sm text-ink">
        {weakestLabel} is the area under most pressure
      </p>

      {assessment.floorTriggered ? (
        <p className="mt-4 max-w-prose text-sm">
          One area came out low enough on its own to move this band up a level, even though the
          overall picture looked calmer. A single area under real pressure matters more than a
          comfortable average.
        </p>
      ) : null}

      {assessment.calibration.reasons.length > 0 ? (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer underline underline-offset-4">
            How your course and age changed where the line sat
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {assessment.calibration.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

export function FindingCard({ finding }: { finding: AxisFinding }) {
  return (
    <article className="reveal glass glass-sheen rounded-2xl p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-medium text-ink">{finding.label}</h3>
        <p className="text-sm text-ink-muted">
          <span className="tabular-nums">{finding.value} / 100</span>
          <span aria-hidden="true"> · </span>
          {LEVEL_WORD[finding.level]}
        </p>
      </header>

      <p className="mt-2 text-ink-muted">{finding.summary}</p>

      {finding.drivers.length > 0 ? (
        <ul className="mt-3 space-y-2 border-l-2 border-outline-faint pl-4">
          {finding.drivers.map((driver) => (
            <li key={driver} className="text-sm text-ink-muted">
              {driver}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function ActionList({ actions }: { actions: readonly Action[] }) {
  return (
    <ol className="space-y-4">
      {actions.map((action, index) => (
        <li key={action.axis} className="reveal glass glass-sheen rounded-2xl p-5">
          <p className="text-sm uppercase tracking-widest text-ink-muted">
            {index + 1} · {action.label}
          </p>
          <p className="mt-2 max-w-prose text-ink">{action.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function ResourceBlock() {
  return (
    <section aria-labelledby="support-heading" className="reveal glass rounded-2xl p-6">
      <h2 id="support-heading" className="font-display text-xl font-medium text-ink">
        If you want to talk to someone
      </h2>
      <p className="mt-2 max-w-prose text-ink-muted">
        You do not need a band or a chart to be worth listening to. These lines are free and
        confidential.
      </p>

      <ul className="mt-4 space-y-4">
        {SUPPORT_CONTACTS.map((contact) => {
          const href = telHref(contact.contact);

          return (
            <li key={contact.name}>
              <p className="font-medium text-ink">
                {contact.name}
                <span aria-hidden="true"> · </span>
                {href === null ? (
                  <a
                    href={`https://${contact.contact}`}
                    className="underline underline-offset-4"
                    rel="noreferrer noopener"
                  >
                    {contact.contact}
                  </a>
                ) : (
                  <a href={href} className="underline underline-offset-4">
                    {contact.contact}
                  </a>
                )}
              </p>
              <p className="text-sm text-ink-muted">{contact.detail}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ExportBar({ summary }: { summary: string }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-full border border-outline px-5 text-ink"
        >
          Save as PDF
        </button>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-full border border-outline px-5 text-ink"
        >
          Copy summary
        </button>
        <Link
          href="/assess"
          onClick={() => clearDraft()}
          className="inline-flex min-h-11 items-center rounded-full border border-outline px-5 text-ink"
        >
          Start again
        </Link>
      </div>

      <p aria-live="polite" className="text-sm text-ink-muted">
        {copied === "done" ? "Summary copied to your clipboard." : null}
        {copied === "failed"
          ? "Your browser blocked the clipboard. Use “Save as PDF” instead."
          : null}
      </p>
    </div>
  );
}
