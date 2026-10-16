import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanType } from "../store/onboarding-store";
import { OnboardingView } from "./onboarding-view";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  selectedPlan: null as PlanType | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../components/OnboardingLayout", () => ({
  OnboardingLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/onboarding-continuation-prompt", () => ({
  OnboardingContinuationPrompt: () => null,
}));

vi.mock("../components/plan-icon", () => ({ PlanIcon: () => null }));

vi.mock("../store/onboarding-store", () => ({
  useOnboardingStore: () => ({
    selectedPlan: mocks.selectedPlan,
    setSelectedPlan: vi.fn(),
    resetOnboardingPreservingPlan: vi.fn(),
  }),
}));

describe("OnboardingView", () => {
  beforeEach(() => {
    mocks.push.mockReset();
  });

  it.each<PlanType | null>(["personal", "team", "organization", null])(
    "continues to personal onboarding when the selected plan is %s",
    (plan) => {
      mocks.selectedPlan = plan;
      render(<OnboardingView userEmail="user@example.com" />);

      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      expect(mocks.push).toHaveBeenCalledWith("/onboarding/personal/settings");
      expect(mocks.push).toHaveBeenCalledTimes(1);
    }
  );
});
