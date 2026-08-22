import { describe, expect, it } from "vitest";
import { RESOURCES_VERIFIED_ON, SUPPORT_CONTACTS, telHref } from "./resources";

/**
 * These contacts are the one part of Sāmya where being wrong could actually
 * hurt someone. The tests below cannot confirm a number still rings — only a
 * person can do that — but they do stop the file degrading quietly: a blanked
 * entry, a missing source to re-check against, or a verification marker
 * replaced with prose.
 */

describe("support contacts", () => {
  it("records the verification date as an ISO date", () => {
    expect(RESOURCES_VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(RESOURCES_VERIFIED_ON))).toBe(false);
  });

  it("offers at least one contact", () => {
    expect(SUPPORT_CONTACTS.length).toBeGreaterThan(0);
  });

  it.each(SUPPORT_CONTACTS)("keeps $name complete and re-checkable", (contact) => {
    expect(contact.name.trim()).not.toBe("");
    expect(contact.detail.trim()).not.toBe("");
    expect(contact.contact.trim()).not.toBe("");
    // A source is what makes the next verification pass possible.
    expect(contact.source).toMatch(/^https:\/\//);
  });

  it("gives every entry either a dialable number or a web address", () => {
    for (const contact of SUPPORT_CONTACTS) {
      const dialable = telHref(contact.contact) !== null;
      const web = contact.contact.includes(".");
      expect(dialable || web, `${contact.name} is neither dialable nor a link`).toBe(true);
    }
  });
});

describe("telHref", () => {
  it("builds a tel: link from a plain number", () => {
    expect(telHref("14416")).toBe("tel:14416");
  });

  it("strips separators but keeps a leading plus", () => {
    expect(telHref("1800-599-0019")).toBe("tel:18005990019");
    expect(telHref("+91 98204 66726")).toBe("tel:+919820466726");
  });

  it("returns null for something that is not a number", () => {
    expect(telHref("findahelpline.com")).toBeNull();
    expect(telHref("")).toBeNull();
    expect(telHref("12")).toBeNull();
  });
});
