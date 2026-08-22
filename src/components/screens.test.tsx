import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import HomePage from "@/app/page";
import HowItWorksPage from "@/app/how-it-works/page";
import { Wizard } from "@/components/wizard/Wizard";
import { ResultView } from "@/components/result/ResultView";
import { questionsForStep } from "@/lib/questions";
import { encodeAnswers } from "@/lib/share";
import { answersAt } from "@/lib/test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

beforeEach(() => {
  cleanup();
  push.mockClear();
  window.sessionStorage.clear();
  // The narrative is optional decoration; keep it out of the way in unit tests.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});

/**
 * Picks the first option of every question on the current step.
 *
 * Queries are scoped to each question's own fieldset: option labels such as
 * "Rarely" legitimately repeat across questions, so a page-wide lookup is
 * ambiguous by design rather than by mistake.
 */
async function answerCurrentStep(
  user: ReturnType<typeof userEvent.setup>,
  step: 1 | 2 | 3 | 4 | 5,
) {
  for (const question of questionsForStep(step)) {
    const first = question.options[0];
    if (first === undefined) continue;

    if (question.kind === "chips") {
      const group = screen.getByRole("group", { name: question.prompt });
      await user.click(within(group).getByRole("radio", { name: first.label }));
    } else {
      await user.selectOptions(screen.getByLabelText(question.prompt), first.value);
    }
  }
}

describe("accessibility", () => {
  it("landing page has no violations", async () => {
    const { container } = render(<HomePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("rubric page has no violations", async () => {
    const { container } = render(<HowItWorksPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("wizard has no violations", async () => {
    const { container } = render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("wizard has no violations while showing an error summary", async () => {
    const user = userEvent.setup();
    const { container } = render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });

    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("alert");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("result page has no violations", async () => {
    window.location.hash = `#${encodeAnswers(answersAt(2))}`;
    const { container } = render(<ResultView />);
    await screen.findByRole("heading", { name: "What you told us" });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("empty result page has no violations", async () => {
    window.location.hash = "";
    const { container } = render(<ResultView />);
    await screen.findByRole("heading", { name: /nothing to show/i });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("wizard behaviour", () => {
  it("refuses to advance while questions are unanswered and says which", async () => {
    const user = userEvent.setup();
    render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });

    await user.click(screen.getByRole("button", { name: /continue/i }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/still need an answer/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About you" })).toBeInTheDocument();
  });

  it("advances once the step is complete and moves focus to the new heading", async () => {
    const user = userEvent.setup();
    render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });

    await answerCurrentStep(user, 1);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const heading = await screen.findByRole("heading", { name: "Sleep & rest" });
    expect(heading).toHaveFocus();
  });

  it("keeps answers when stepping back", async () => {
    const user = userEvent.setup();
    render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });

    await answerCurrentStep(user, 1);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Sleep & rest" });
    await user.click(screen.getByRole("button", { name: /back/i }));

    await screen.findByRole("heading", { name: "About you" });
    expect(screen.getByRole("radio", { name: "Under 18" })).toBeChecked();
  });

  it("hides the back button on the first step", async () => {
    render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });

    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
  });

  it("navigates to the result with the answers in the fragment", async () => {
    const user = userEvent.setup();
    render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });

    for (const step of [1, 2, 3, 4, 5] as const) {
      await answerCurrentStep(user, step);
      await user.click(screen.getByRole("button", { name: /continue|see what you told us/i }));
    }

    expect(push).toHaveBeenCalledTimes(1);
    expect(String(push.mock.calls[0]?.[0])).toMatch(/^\/result#v1\./);
  });

  it("has no free-text input anywhere in the questionnaire", async () => {
    const user = userEvent.setup();
    const { container } = render(<Wizard />);
    await screen.findByRole("heading", { name: "About you" });

    for (const step of [1, 2, 3, 4] as const) {
      expect(container.querySelectorAll('input:not([type="radio"]), textarea')).toHaveLength(0);
      await answerCurrentStep(user, step);
      await user.click(screen.getByRole("button", { name: /continue/i }));
    }
    expect(container.querySelectorAll('input:not([type="radio"]), textarea')).toHaveLength(0);
  });
});

describe("result view", () => {
  it("renders the band, the radar values and three actions", async () => {
    window.location.hash = `#${encodeAnswers(answersAt(0))}`;
    render(<ResultView />);

    await screen.findByRole("heading", { name: "What you told us" });
    expect(screen.getByRole("img", { name: /radar chart/i })).toBeInTheDocument();
    // Named twice on purpose: once in the radar list, once as a finding card.
    expect(screen.getAllByText("Sleep & Rest").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/0 out of 100/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Three things to try" })).toBeInTheDocument();
  });

  it("always shows the non-diagnostic disclaimer", async () => {
    window.location.hash = `#${encodeAnswers(answersAt(4))}`;
    render(<ResultView />);

    await screen.findByRole("heading", { name: "What you told us" });
    expect(screen.getByText(/does not predict anyone/i)).toBeInTheDocument();
  });

  it("shows support contacts regardless of the band", async () => {
    window.location.hash = `#${encodeAnswers(answersAt(4))}`;
    render(<ResultView />);

    await screen.findByRole("heading", { name: /talk to someone/i });
    expect(screen.getByText("Tele-MANAS")).toBeInTheDocument();
  });

  it("recovers rather than crashing on a tampered fragment", async () => {
    window.location.hash = "#v1.deadbee.999999999999999999999999";
    render(<ResultView />);

    expect(await screen.findByRole("heading", { name: /nothing to show/i })).toBeInTheDocument();
  });
});
