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

vi.mock("next/server", async () => {
  const { createNextServerMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks"
  );
  return createNextServerMock();
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
vi.mock("@calcom/lib/slugify", () => ({ default: vi.fn((s: string) => s.toLowerCase()) }));
vi.mock("@calcom/lib/constants", () => ({ IS_PREMIUM_USERNAME_ENABLED: false }));
vi.mock("@calcom/lib/server/username", () => ({
  isUsernameReservedDueToMigration: vi.fn().mockResolvedValue(false),
}));
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({ sendEmailVerification: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({
  createOrUpdateMemberships: vi.fn(),
}));
vi.mock("@calcom/features/auth/signup/utils/validateUsername", () => ({
  validateAndGetCorrectedUsernameAndEmail: vi.fn().mockResolvedValue({ isValid: true, username: "testuser" }),
}));
vi.mock("@calcom/features/auth/signup/utils/organization", () => ({ joinAnyChildTeamOnOrgInvite: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/prefillAvatar", () => ({ prefillAvatar: vi.fn() }));
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

import { runP2002TestSuite } from "@calcom/features/auth/signup/handlers/__tests__/p2002.test-suite";
// Import after mocks
import handler from "./selfHostedHandler";

function callHandler(body: SignupBody): ReturnType<typeof handler> {
  return handler(body as unknown as Record<string, string>);
}

function setupMocks() {
  vi.clearAllMocks();
  resetPrismaMock();
  mockFindTokenByToken.mockResolvedValue(createMockFoundToken());
  mockValidateAndGetCorrectedUsernameForTeam.mockResolvedValue("testuser");
  prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
  prismaMock.verificationToken.delete.mockResolvedValue({} as never);
}

runP2002TestSuite("selfHostedHandler", callHandler, setupMocks);

describe("selfHostedHandler – invite token handling", () => {
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
