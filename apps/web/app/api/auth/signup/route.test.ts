import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockIsTeamInviteToken = vi.fn();
const mockSelfHostedHandler = vi.fn();
const mockCheckIfFeatureIsEnabledGlobally = vi.fn();
let mockBody: Record<string, string> = {};

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: (handler: unknown) => handler,
}));
vi.mock("app/api/parseRequestData", () => ({
  parseRequestData: vi.fn(async () => mockBody),
}));
vi.mock("./handlers/selfHostedHandler", () => ({
  default: (...args: unknown[]) => mockSelfHostedHandler(...args),
}));
vi.mock("./handlers/calcomSignupHandler", () => ({ default: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/token", () => ({
  isTeamInviteToken: (...args: unknown[]) => mockIsTeamInviteToken(...args),
}));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfFeatureIsEnabledGlobally = (...args: unknown[]) => mockCheckIfFeatureIsEnabledGlobally(...args);
  },
}));
vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({ checkRateLimitAndThrowError: vi.fn() }));
vi.mock("@calcom/lib/constants", () => ({ IS_PREMIUM_USERNAME_ENABLED: false }));
vi.mock("@calcom/lib/getIP", () => ({ default: vi.fn(() => "127.0.0.1") }));
vi.mock("@calcom/lib/server/PiiHasher", () => ({ piiHasher: { hash: (value: string) => value } }));
vi.mock("@calcom/lib/server/checkCfTurnstileToken", () => ({ checkCfTurnstileToken: vi.fn() }));
vi.mock("@calcom/lib/logger", () => ({ default: { error: vi.fn() } }));
vi.mock("@calcom/prisma", () => ({ prisma: {} }));

import type { NextRequest } from "next/server";
import { POST } from "./route";

type RouteHandler = (req: NextRequest) => Promise<Response>;

function callRoute(body: Record<string, string>) {
  mockBody = body;
  const req = {
    headers: new Headers(),
    nextUrl: new URL("http://localhost:3000/api/auth/signup"),
  } as unknown as NextRequest;
  return (POST as unknown as RouteHandler)(req);
}

const signupBody = { email: "new@example.com", password: "ValidPassword123!", username: "newbie" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_DISABLE_SIGNUP", "true");
  mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);
  mockSelfHostedHandler.mockResolvedValue(new Response(null, { status: 201 }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/signup with signup disabled", () => {
  it("rejects signups without a token", async () => {
    const response = await callRoute(signupBody);

    expect(response.status).toBe(403);
    expect(mockSelfHostedHandler).not.toHaveBeenCalled();
  });

  it("lets a live team invite token through", async () => {
    mockIsTeamInviteToken.mockResolvedValue(true);

    const response = await callRoute({ ...signupBody, token: "team-invite" });

    expect(mockIsTeamInviteToken).toHaveBeenCalledWith({ token: "team-invite" });
    expect(response.status).toBe(201);
    expect(mockSelfHostedHandler).toHaveBeenCalled();
  });

  it("rejects a token that is not tied to a team, such as one left behind by a deleted team", async () => {
    mockIsTeamInviteToken.mockResolvedValue(false);

    const response = await callRoute({ ...signupBody, token: "orphaned" });

    expect(response.status).toBe(403);
    expect(mockSelfHostedHandler).not.toHaveBeenCalled();
  });
});
