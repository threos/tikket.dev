import type { MockResponse } from "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks";
import {
  prismaMock,
  resetPrismaMock,
} from "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks";
import type { SignupBody } from "@calcom/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import {
  createMockFoundToken,
  createMockTeam,
  createMockUser,
  createSignupBody,
} from "@calcom/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindTokenByToken: Mock = vi.fn();
const mockValidateAndGetCorrectedUsernameForTeam: Mock = vi.fn();
const mockThrowIfTokenEmailMismatch: Mock = vi.fn();

type UsernameStatus = {
  statusCode: 200 | 402 | 418;
  requestedUserName: string;
  json: { available: boolean; premium: boolean };
};

type InnerHandler = (body: Record<string, string>, status: UsernameStatus) => Promise<MockResponse>;

var mockCapturedHandler: InnerHandler | null;

vi.mock("next/server", async () => {
  const { createNextServerMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks"
  );
  return createNextServerMock();
});
vi.mock("next/headers", async () => {
  const { createNextHeadersMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks"
  );
  return createNextHeadersMock();
});
vi.mock("@calcom/prisma", async () => {
  const { createPrismaMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@calcom/prisma/client", async () => {
  const { createPrismaMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() }) },
}));
vi.mock("@calcom/lib/auth/hashPassword", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));
vi.mock("@calcom/lib/constants", () => ({ WEBAPP_URL: "http://localhost:3000" }));
vi.mock("@calcom/lib/tracking", () => ({ getTrackingFromCookies: vi.fn().mockReturnValue({}) }));
vi.mock("@calcom/app-store/stripepayment/lib/utils", () => ({ getPremiumMonthlyPlanPriceId: vi.fn() }));
vi.mock("@calcom/features/auth/lib/getLocaleFromRequest", () => ({
  getLocaleFromRequest: vi.fn().mockResolvedValue("en"),
}));
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({ sendEmailVerification: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({
  createOrUpdateMemberships: vi.fn(),
}));
vi.mock("@calcom/features/auth/signup/utils/prefillAvatar", () => ({ prefillAvatar: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/validateUsername", () => ({
  validateAndGetCorrectedUsernameAndEmail: vi.fn().mockResolvedValue({ isValid: true, username: "testuser" }),
}));
vi.mock("@calcom/features/watchlist/lib/telemetry", () => ({ sentrySpan: {} }));
vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));
vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: vi.fn().mockReturnValue({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
  }),
}));
vi.mock("@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository", () => {
  return {
    GlobalWatchlistRepository: class {
      findBlockedEmail = vi.fn().mockResolvedValue(null);
      createEntry = vi.fn().mockResolvedValue({});
    },
  };
});
vi.mock("@calcom/features/watchlist/lib/utils/normalization", () => ({
  normalizeEmail: vi.fn((e: string) => e.toLowerCase()),
}));
vi.mock("@calcom/web/lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/organization", () => ({ joinAnyChildTeamOnOrgInvite: vi.fn() }));
vi.mock("@calcom/features/teams/di/TeamMembershipService.container", () => ({
  getTeamMembershipService: () => ({ addToAssignAllTeamMembersEventTypes: vi.fn() }),
}));
vi.mock("@calcom/features/auth/signup/utils/token", () => ({
  findTokenByToken: (...args: unknown[]) => mockFindTokenByToken(...args),
  throwIfTokenExpired: vi.fn(),
  throwIfTokenEmailMismatch: (...args: unknown[]) => mockThrowIfTokenEmailMismatch(...args),
  validateAndGetCorrectedUsernameForTeam: (...args: unknown[]) =>
    mockValidateAndGetCorrectedUsernameForTeam(...args),
}));

// Capture inner handler from usernameHandler wrapper
vi.mock("@calcom/lib/server/username", () => ({
  usernameHandler: (handler: InnerHandler) => {
    mockCapturedHandler = handler;
    return handler;
  },
}));

// Import after mocks
import "./calcomSignupHandler";
import { runP2002TestSuite } from "@calcom/features/auth/signup/handlers/__tests__/p2002.test-suite";

function callHandler(body: SignupBody): Promise<MockResponse> {
  if (!mockCapturedHandler) throw new Error("Handler not captured");
  return mockCapturedHandler(body as unknown as Record<string, string>, {
    statusCode: 200,
    requestedUserName: body.username || "testuser",
    json: { available: true, premium: false },
  });
}

function setupMocks() {
  vi.clearAllMocks();
  resetPrismaMock();
  mockFindTokenByToken.mockResolvedValue(createMockFoundToken());
  mockValidateAndGetCorrectedUsernameForTeam.mockResolvedValue("testuser");
  prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
  prismaMock.verificationToken.delete.mockResolvedValue({} as never);
}

runP2002TestSuite("calcomHandler", callHandler, setupMocks);

describe("calcomHandler – invite token handling", () => {
  beforeEach(setupMocks);

  it("checks the signup email against the token for every token", async () => {
    mockFindTokenByToken.mockResolvedValue(
      createMockFoundToken({ teamId: null, identifier: "invitee@example.com" })
    );
    prismaMock.user.create.mockResolvedValue(createMockUser() as never);

    await callHandler(createSignupBody({ token: "valid-token" }));

    expect(mockThrowIfTokenEmailMismatch).toHaveBeenCalledWith({
      tokenIdentifier: "invitee@example.com",
      email: "test@example.com",
    });
  });

  it("deletes a team invite token after use", async () => {
    mockFindTokenByToken.mockResolvedValue(createMockFoundToken({ id: 42, teamId: 1 }));
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    prismaMock.user.findFirst.mockResolvedValue(null as never);
    prismaMock.user.upsert.mockResolvedValue(createMockUser() as never);

    const response = await callHandler(createSignupBody({ token: "valid-token" }));

    expect(response.status).toBe(201);
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith({ where: { id: 42 } });
  });

  it("deletes a used token whose team was deleted so it can't be replayed", async () => {
    mockFindTokenByToken.mockResolvedValue(createMockFoundToken({ id: 43, teamId: null }));
    prismaMock.user.create.mockResolvedValue(createMockUser() as never);

    const response = await callHandler(createSignupBody({ token: "orphaned-token" }));

    expect(response.status).toBe(201);
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith({ where: { id: 43 } });
  });

  it("does not delete anything when no token was used", async () => {
    prismaMock.user.create.mockResolvedValue(createMockUser() as never);

    await callHandler(createSignupBody());

    expect(prismaMock.verificationToken.delete).not.toHaveBeenCalled();
  });
});
