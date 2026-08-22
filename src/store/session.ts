"use client";

import { useCallback, useEffect, useState } from "react";
import type { Answers } from "@/lib/types";

/**
 * Holds the in-progress questionnaire.
 *
 * Answers live in React state and are mirrored into `sessionStorage` so a
 * refresh mid-wizard does not throw the work away. `sessionStorage` rather
 * than `localStorage` on purpose: the draft dies with the tab, which is the
 * behaviour a shared campus machine deserves.
 *
 * Nothing here touches the network. Storage access is wrapped because a
 * browser in private mode, or one configured to block site data, throws on
 * access rather than returning null.
 */

const DRAFT_KEY = "samya.draft.v1";

function readDraft(): Answers {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (raw === null) return {};

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    // Keep only string/string pairs; a hand-edited draft must not widen the type.
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") clean[key] = value;
    }
    return clean;
  } catch {
    return {};
  }
}

function writeDraft(answers: Answers): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  } catch {
    // A blocked or full store costs the draft, never the questionnaire.
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do — the draft expires with the tab regardless.
  }
}

export function useAnswers() {
  const [answers, setAnswers] = useState<Answers>({});
  const [restored, setRestored] = useState(false);

  // Read after mount so the server and first client render agree.
  useEffect(() => {
    setAnswers(readDraft());
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) writeDraft(answers);
  }, [answers, restored]);

  const answer = useCallback((questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }, []);

  const reset = useCallback(() => {
    setAnswers({});
    clearDraft();
  }, []);

  return { answers, answer, reset, restored };
}
