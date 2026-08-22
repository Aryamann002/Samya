"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Answers } from "@/lib/types";

/**
 * Holds the in-progress questionnaire.
 *
 * Answers live in `sessionStorage` so a refresh mid-wizard does not throw the
 * work away. `sessionStorage` rather than `localStorage` on purpose: the draft
 * dies with the tab, which is the behaviour a shared campus machine deserves.
 *
 * Storage is read through `useSyncExternalStore` — the primitive built for
 * exactly this, reading a browser-only source without a hydration mismatch and
 * without a state update in an effect. Every access is wrapped because a
 * browser in private mode, or one set to block site data, throws on access
 * rather than returning null.
 *
 * Nothing here touches the network.
 */

const DRAFT_KEY = "samya.draft.v1";

const listeners = new Set<() => void>();

/**
 * `getSnapshot` must return a stable reference while the underlying value is
 * unchanged, or React re-renders forever. These cache the last parse.
 */
let cachedRaw: string | null = null;
let cachedAnswers: Answers = {};

/** There is no draft on the server, and the reference must never change. */
const EMPTY: Answers = {};

function readRaw(): string | null {
  try {
    return window.sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

function parseDraft(raw: string | null): Answers {
  if (raw === null) return EMPTY;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return EMPTY;

    // Keep only string/string pairs; a hand-edited draft must not widen the type.
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") clean[key] = value;
    }
    return clean;
  } catch {
    return EMPTY;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): Answers {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedAnswers = parseDraft(raw);
  }
  return cachedAnswers;
}

function getServerSnapshot(): Answers {
  return EMPTY;
}

function write(answers: Answers): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  } catch {
    // A blocked or full store costs the draft, never the questionnaire: the
    // answers below are still published to subscribers from the cache.
    cachedRaw = null;
    cachedAnswers = answers;
  }
  for (const listener of listeners) listener();
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do — the draft expires with the tab regardless.
  }
  cachedRaw = null;
  cachedAnswers = EMPTY;
  for (const listener of listeners) listener();
}

export function useAnswers() {
  const answers = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const answer = useCallback((questionId: string, value: string) => {
    write({ ...getSnapshot(), [questionId]: value });
  }, []);

  const reset = useCallback(() => {
    clearDraft();
  }, []);

  return { answers, answer, reset };
}
