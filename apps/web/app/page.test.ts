import { isValidElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetServerSession, mockCheckOnboardingRedirect, mockRedirect } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockCheckOnboardingRedirect: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@calcom/features/auth/lib/onboardingUtils", () => ({
  checkOnboardingRedirect: mockCheckOnboardingRedirect,
}));

vi.mock("@lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn(() => ({})) }));

vi.mock("app/_utils", () => ({ _generateMetadata: vi.fn() }));

vi.mock("@calcom/web/components/PageWrapperAppDir", () => ({ default: () => null }));

vi.mock("@calcom/web/modules/landing/landing-view", () => ({ default: () => null }));

import RootPage from "./page";

describe("RootPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends logged-in users to event types", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 1, profile: { organizationId: null } } });
    mockCheckOnboardingRedirect.mockResolvedValue(null);

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT:/event-types");
  });

  it("sends logged-in users that still need onboarding to onboarding", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 1, profile: { organizationId: null } } });
    mockCheckOnboardingRedirect.mockResolvedValue("/getting-started");

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT:/getting-started");
  });

  it("ignores the landing page flag for logged-in users", async () => {
    vi.stubEnv("LANDING_PAGE_ENABLED", "true");
    mockGetServerSession.mockResolvedValue({ user: { id: 1, profile: { organizationId: null } } });
    mockCheckOnboardingRedirect.mockResolvedValue(null);

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT:/event-types");
  });

  it("sends logged-out visitors to login when the landing page is disabled", async () => {
    vi.stubEnv("LANDING_PAGE_ENABLED", "");
    mockGetServerSession.mockResolvedValue(null);

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("only treats the exact value 'true' as enabled", async () => {
    vi.stubEnv("LANDING_PAGE_ENABLED", "1");
    mockGetServerSession.mockResolvedValue(null);

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("renders the landing page for logged-out visitors when enabled", async () => {
    vi.stubEnv("LANDING_PAGE_ENABLED", "true");
    mockGetServerSession.mockResolvedValue(null);

    const result = await RootPage();

    expect(isValidElement(result)).toBe(true);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockCheckOnboardingRedirect).not.toHaveBeenCalled();
  });
});
