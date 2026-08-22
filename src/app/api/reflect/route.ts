import { NextResponse } from "next/server";
import { reflectRequestSchema, type ReflectRequest } from "@/lib/schema";
import { AXIS_LABELS, AXES } from "@/lib/types";

/**
 * The only server route in Sāmya.
 *
 * It takes six numbers and a band — figures already on the student's screen —
 * and asks Gemini to say them back more warmly. It never receives an answer, a
 * CGPA, an age or an identifier, so there is nothing here worth stealing and
 * nothing to leak into a model provider's logs.
 *
 * Every failure path returns the static text with `fallback: true`. Sāmya must
 * work identically with no API key present, and a test covers exactly that.
 */

export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash";
const TIMEOUT_MS = 8_000;
const MAX_NARRATIVE_CHARS = 1_200;

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

/*
 * ponytail: process-local rate limit. It resets on redeploy and does not span
 * instances, which is the right trade for a route that costs a few tokens and
 * holds no data. Move to a shared store only if abuse actually shows up.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (entry === undefined || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });

    // Opportunistic sweep so the map cannot grow without bound.
    if (hits.size > 5_000) {
      for (const [existing, value] of hits) {
        if (now > value.resetAt) hits.delete(existing);
      }
    }
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

/** The text Sāmya ships with. The model rewrites this; it never replaces it. */
function staticNarrative(input: ReflectRequest): string {
  const ordered = [...AXES].sort((a, b) => input.axes[a] - input.axes[b]);
  const weakest = ordered[0] ?? "sleep";
  const strongest = ordered[ordered.length - 1] ?? "sleep";

  const opening = {
    steady: "Most of what you described is holding together right now.",
    watch: "Parts of what you described are pulling harder than the rest.",
    strained: "A lot of what you described is under pressure at the same time.",
  }[input.band];

  return [
    `${opening} Across the six areas you came out at ${input.composite} out of 100, where higher means healthier.`,
    `${AXIS_LABELS[strongest]} is the steadiest part of your picture, and ${AXIS_LABELS[weakest]} is the part carrying the most weight. That is where the three suggestions below start.`,
  ].join("\n\n");
}

function buildPrompt(input: ReflectRequest): string {
  const rows = AXES.map((axis) => `- ${AXIS_LABELS[axis]}: ${input.axes[axis]}/100`).join("\n");

  return [
    "You are writing two short paragraphs for a student looking at a self-reflection screen.",
    "",
    "Their scores (higher means healthier, these are self-reported habits, not measurements):",
    rows,
    `Overall: ${input.composite}/100. Band: ${input.band}.`,
    "",
    "Rules you must follow:",
    "- Write to them as 'you'. Warm, plain, unhurried. Two paragraphs, at most 90 words total.",
    "- Describe only what these numbers say. Invent no detail about their life.",
    "- Never diagnose, never name a condition, never mention grades or academic outcomes.",
    "- Do not give advice; advice appears elsewhere on the page.",
    "- No lists, no headings, no markdown, no emoji. Plain sentences only.",
  ].join("\n");
}

async function askGemini(input: ReflectRequest, apiKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(input) }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) return null;

    const data: unknown = await response.json();
    const text = extractText(data);
    if (text === null) return null;

    return text.slice(0, MAX_NARRATIVE_CHARS).trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Walks the response shape defensively; any surprise means "use the fallback". */
function extractText(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("candidates" in data)) return null;

  const { candidates } = data as { candidates: unknown };
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .map((part) => (typeof part === "object" && part !== null && "text" in part ? part.text : null))
    .filter((value): value is string => typeof value === "string")
    .join("");

  return text.trim() === "" ? null : text;
}

export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const parsed = reflectRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Deliberately terse: the client already knows what it sent, and an
    // attacker probing the shape learns nothing from this.
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const generated =
    apiKey === undefined || apiKey === "" ? null : await askGemini(parsed.data, apiKey);

  return NextResponse.json(
    {
      narrative: generated ?? staticNarrative(parsed.data),
      fallback: generated === null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
