// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The route keeps module-level rate-limit state, so each test re-imports it
 * fresh rather than inheriting another test's counters.
 */
async function loadRoute() {
  vi.resetModules();
  return await import("./route");
}

const VALID_BODY = {
  band: "watch",
  composite: 58,
  axes: {
    sleep: 30,
    studyHabits: 70,
    academicLoad: 50,
    stressMood: 55,
    socialSupport: 80,
    lifestyle: 60,
  },
};

function post(body: unknown, ip = "203.0.113.1") {
  return new Request("http://localhost/api/reflect", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const originalKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  vi.restoreAllMocks();
});

describe("POST /api/reflect", () => {
  it("returns the static narrative when no API key is configured", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post(VALID_BODY));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.fallback).toBe(true);
    expect(data.narrative).toContain("58 out of 100");
    expect(data.narrative.length).toBeGreaterThan(50);
  });

  it("names the weakest and strongest areas in the static narrative", async () => {
    const { POST } = await loadRoute();
    const data = await (await POST(post(VALID_BODY))).json();

    expect(data.narrative).toContain("Social Support");
    expect(data.narrative).toContain("Sleep & Rest");
  });

  it("never calls out to a model when no key is set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { POST } = await loadRoute();
    await POST(post(VALID_BODY));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const { POST } = await loadRoute();
    expect((await POST(post("{ not json"))).status).toBe(400);
  });

  it.each([
    ["a missing band", { ...VALID_BODY, band: undefined }],
    ["an unknown band", { ...VALID_BODY, band: "critical" }],
    ["an out-of-range axis", { ...VALID_BODY, axes: { ...VALID_BODY.axes, sleep: 140 } }],
    ["a negative axis", { ...VALID_BODY, axes: { ...VALID_BODY.axes, sleep: -1 } }],
    ["a non-integer axis", { ...VALID_BODY, axes: { ...VALID_BODY.axes, sleep: 12.5 } }],
    ["a missing axis", { ...VALID_BODY, axes: { sleep: 10 } }],
    ["a smuggled extra field", { ...VALID_BODY, answers: { sleep_hours: "under4" } }],
    ["an array", [1, 2, 3]],
    ["a string", "hello"],
  ])("rejects %s", async (_label, body) => {
    const { POST } = await loadRoute();
    expect((await POST(post(body))).status).toBe(400);
  });

  it("rate-limits a single client after ten requests a minute", async () => {
    const { POST } = await loadRoute();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(post(VALID_BODY, "198.51.100.7"))).status).toBe(200);
    }
    expect((await POST(post(VALID_BODY, "198.51.100.7"))).status).toBe(429);
  });

  it("rate-limits each client independently", async () => {
    const { POST } = await loadRoute();

    for (let attempt = 0; attempt < 11; attempt += 1) {
      await POST(post(VALID_BODY, "198.51.100.8"));
    }
    expect((await POST(post(VALID_BODY, "198.51.100.9"))).status).toBe(200);
  });

  it("uses the model's text when the key is present and the call succeeds", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "A kinder wording." }] } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { POST } = await loadRoute();
    const data = await (await POST(post(VALID_BODY))).json();

    expect(data.narrative).toBe("A kinder wording.");
    expect(data.fallback).toBe(false);
  });

  it("never sends anything but the six numbers and the band to the model", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );

    const { POST } = await loadRoute();
    await POST(post(VALID_BODY));

    const sent = String((fetchSpy.mock.calls[0]?.[1] as RequestInit).body);
    expect(sent).not.toMatch(/cgpa|ctx_|under18|undergraduate|sleep_hours/i);
  });

  it("falls back when the model returns an error status", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));

    const { POST } = await loadRoute();
    const data = await (await POST(post(VALID_BODY))).json();

    expect(data.fallback).toBe(true);
  });

  it("falls back when the model returns an unexpected shape", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    );

    const { POST } = await loadRoute();
    expect((await (await POST(post(VALID_BODY))).json()).fallback).toBe(true);
  });

  it("falls back when the model call throws", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const { POST } = await loadRoute();
    expect((await (await POST(post(VALID_BODY))).json()).fallback).toBe(true);
  });

  it("does not cache the response", async () => {
    const { POST } = await loadRoute();
    expect((await POST(post(VALID_BODY))).headers.get("cache-control")).toContain("no-store");
  });
});
