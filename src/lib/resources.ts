/**
 * Support contacts shown alongside every result.
 *
 * ⚠️ VERIFY BEFORE EVERY DEPLOY.
 *
 * A wrong number here is the one genuinely harmful failure this app has: a
 * student who reaches for it at a bad moment and gets a dead line. Check each
 * entry against its official source before shipping, and re-check whenever
 * this file is touched. Treat a number you cannot verify today as a number to
 * remove today.
 *
 * These are India-focused because that is Sāmya's first audience. The last
 * entry is a directory, so the block is still useful to a student anywhere.
 */

export type SupportContact = {
  readonly name: string;
  readonly detail: string;
  /** Displayed as written. Also used to build the `tel:` link. */
  readonly contact: string;
  /** Where this entry was last verified against. */
  readonly source: string;
};

/** ISO date of the last manual verification pass. Update it when you check. */
export const RESOURCES_VERIFIED_ON = "not yet verified";

export const SUPPORT_CONTACTS: readonly SupportContact[] = [
  {
    name: "Tele-MANAS",
    detail: "India's national mental health helpline. Free, 24/7, and available in many languages.",
    contact: "14416",
    source: "https://telemanas.mohfw.gov.in/",
  },
  {
    name: "KIRAN",
    detail: "Ministry of Social Justice and Empowerment helpline. Free, 24/7, confidential.",
    contact: "1800-599-0019",
    source: "https://depwd.gov.in/",
  },
  {
    name: "Find a Helpline",
    detail: "A directory of free, confidential helplines in over 130 countries.",
    contact: "findahelpline.com",
    source: "https://findahelpline.com/",
  },
];

/** Turns a displayed contact into a dialable `tel:` value, or null if it is not a number. */
export function telHref(contact: string): string | null {
  const digits = contact.replace(/[^0-9+]/g, "");
  return digits.length >= 3 ? `tel:${digits}` : null;
}
