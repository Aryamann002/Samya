import { expect, test, type Page } from "@playwright/test";

/**
 * The whole questionnaire, completed without a mouse.
 *
 * Everything here is driven by Tab, arrow keys and Enter. If a control ever
 * becomes unreachable from the keyboard — a div dressed up as a button, a
 * custom listbox, a focus trap — this test stops being able to finish, which
 * is exactly the failure we want it to catch.
 */

type Focused = { tag: string; type: string; text: string; checked: boolean };

async function focusedElement(page: Page): Promise<Focused> {
  return await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (element === null) return { tag: "", type: "", text: "", checked: false };

    const input = element as HTMLInputElement;
    return {
      tag: element.tagName,
      type: input.type ?? "",
      text: (element.textContent ?? "").trim(),
      checked: input.checked === true,
    };
  });
}

/**
 * Tabs through one step, answering as it goes, and presses the forward button.
 *
 * The waits on either side are load-bearing, not decoration. Without them the
 * key presses can start before the step has rendered — on a cold server the
 * first navigation is slow enough for that — and they then land on nothing.
 * The step stays half-answered, the wizard rightly refuses to advance, and the
 * failure surfaces several steps later as a missing heading, which looks like
 * flakiness instead of the race it is.
 */
async function completeStepByKeyboard(page: Page, step: number) {
  await expect(page.getByText(`Step ${step} of 5`)).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue|See what you told us/ })).toBeVisible();

  for (let press = 0; press < 120; press += 1) {
    await page.keyboard.press("Tab");
    const focused = await focusedElement(page);

    if (focused.tag === "INPUT" && focused.type === "radio") {
      if (!focused.checked) await page.keyboard.press("Space");
      continue;
    }

    if (focused.tag === "SELECT") {
      // Moves off the disabled placeholder onto the first real option.
      await page.keyboard.press("ArrowDown");
      continue;
    }

    if (focused.tag === "BUTTON" && /^(Continue|See what you told us)$/.test(focused.text)) {
      await page.keyboard.press("Enter");

      // The wizard blocks on an unanswered question rather than advancing, so
      // an alert here means the tabbing missed something — say so plainly
      // instead of letting it fail as a missing heading three steps later.
      //
      // Filtered by text on purpose: Next ships its own `role="alert"` route
      // announcer carrying the page title, which matches the bare role.
      const blocked = page.getByRole("alert").filter({ hasText: /needs? an answer/ });
      if (await blocked.isVisible().catch(() => false)) {
        throw new Error(`Step ${step} was left incomplete: ${await blocked.innerText()}`);
      }

      if (step < 5) await expect(page.getByText(`Step ${step + 1} of 5`)).toBeVisible();
      else await expect(page).toHaveURL(/\/result#/);
      return;
    }
  }

  throw new Error(`Never reached the forward button on step ${step}`);
}

test("a student can complete the whole questionnaire with the keyboard alone", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A quiet look at how your term is actually going.",
  );

  // Tab to the start link and follow it.
  for (let press = 0; press < 20; press += 1) {
    await page.keyboard.press("Tab");
    const focused = await focusedElement(page);
    if (focused.text.startsWith("Start")) {
      await page.keyboard.press("Enter");
      break;
    }
  }

  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();

  for (const step of [1, 2, 3, 4, 5]) {
    await completeStepByKeyboard(page, step);
  }

  await expect(page.getByRole("heading", { name: "What you told us" })).toBeVisible();
  await expect(page).toHaveURL(/\/result#v1\./);
});

test("the result shows a band, a radar, six areas and three actions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Start/ }).click();

  for (let step = 1; step <= 5; step += 1) {
    await completeStepByKeyboard(page, step);
  }

  await expect(page.getByRole("heading", { name: "What you told us" })).toBeVisible();
  await expect(page.getByRole("img", { name: /radar chart/i })).toBeVisible();
  await expect(page.getByText(/out of 100/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three things to try" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /talk to someone/i })).toBeVisible();
  // Twice on purpose: once in the site footer, once in the results panel, so a
  // student who prints or screenshots only part of the page still carries it.
  await expect(page.getByText(/does not predict anyone/i)).toHaveCount(2);
  await expect(page.getByText(/does not predict anyone/i).first()).toBeVisible();
});

test("no answer data leaves the browser", async ({ page }) => {
  const outbound: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") outbound.push(`${request.url()} ${request.postData() ?? ""}`);
  });

  await page.goto("/");
  await page.getByRole("link", { name: /^Start/ }).click();
  for (let step = 1; step <= 5; step += 1) await completeStepByKeyboard(page, step);
  await expect(page.getByRole("heading", { name: "What you told us" })).toBeVisible();

  // The only non-GET request is the narrative call, and it carries numbers only.
  for (const entry of outbound) {
    expect(entry).not.toMatch(/ctx_|sleep_hours|cgpa|under18|undergraduate/i);
  }

  // The answers live in the fragment, which is never sent with a request.
  const requestedUrls = outbound.map((entry) => entry.split(" ")[0] ?? "");
  for (const url of requestedUrls) expect(url).not.toContain("#");
});

test("the app serves a nonce-based content security policy", async ({ page }) => {
  const response = await page.goto("/");
  const csp = response?.headers()["content-security-policy"] ?? "";

  expect(csp).toContain("default-src 'self'");
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
});

test("a tampered result link fails safely", async ({ page }) => {
  await page.goto("/result#v1.aaaaaaa.11111111111111111111111111");
  await expect(page.getByRole("heading", { name: /nothing to show/i })).toBeVisible();
});

test("the rubric page publishes the cutoffs and every question", async ({ page }) => {
  await page.goto("/how-it-works");

  await expect(page.getByRole("heading", { name: "How this works" })).toBeVisible();
  await expect(page.getByText(/The floor rule/)).toBeVisible();
  await expect(page.getByText(/Your CGPA never touches the result/)).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(6);
});
