import { z } from "zod";
import { AXES, BANDS } from "./types";

/**
 * The contract for `/api/reflect`, the one server route Sāmya has.
 *
 * Note what is *not* in here: no answers, no context, no CGPA, no age, no
 * degree, no identifier. The route receives six numbers and a band — the same
 * figures already on the student's screen — and nothing that could reconstruct
 * what they actually ticked.
 */

const axisValue = z.number().int().min(0).max(100);

export const reflectRequestSchema = z
  .object({
    band: z.enum(BANDS),
    composite: axisValue,
    axes: z.object(Object.fromEntries(AXES.map((axis) => [axis, axisValue])) as Record<
      (typeof AXES)[number],
      typeof axisValue
    >),
  })
  .strict();

export type ReflectRequest = z.infer<typeof reflectRequestSchema>;

export const reflectResponseSchema = z.object({
  /** Two or three short paragraphs. Plain text — never rendered as HTML. */
  narrative: z.string(),
  /** True when the static text was used because the model was unavailable. */
  fallback: z.boolean(),
});

export type ReflectResponse = z.infer<typeof reflectResponseSchema>;
