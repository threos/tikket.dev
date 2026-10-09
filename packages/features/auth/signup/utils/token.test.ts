import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@calcom/prisma", () => ({ prisma: { verificationToken: { findUnique } } }));
vi.mock("@calcom/features/auth/signup/utils/validateUsername", () => ({
  validateAndGetCorrectedUsernameInTeam: vi.fn(),
}));

import { isTeamInviteToken, throwIfTokenEmailMismatch } from "./token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("throwIfTokenEmailMismatch", () => {
  it("allows the invited email, ignoring case and whitespace", () => {
    expect(() =>
      throwIfTokenEmailMismatch({
        tokenIdentifier: "Invitee@Example.com",
        email: " invitee@example.com",
      })
    ).not.toThrow();
  });

  it("rejects a different email", () => {
    expect(() =>
      throwIfTokenEmailMismatch({
        tokenIdentifier: "invitee@example.com",
        email: "intruder@example.com",
      })
    ).toThrow("This invitation was sent to a different email address");
  });

  it("ignores identifiers that are not email addresses", () => {
    expect(() =>
      throwIfTokenEmailMismatch({
        tokenIdentifier: "invite-link-for-team-1",
        email: "anyone@example.com",
      })
    ).not.toThrow();
  });
});

describe("isTeamInviteToken", () => {
  it("is true for a token that still points at a team", async () => {
    findUnique.mockResolvedValue({ id: 1, expires: new Date(), teamId: 5, identifier: "a@example.com" });

    await expect(isTeamInviteToken({ token: "abc" })).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { token: "abc" } }));
  });

  it("is false for a token whose team was deleted or that never had one", async () => {
    findUnique.mockResolvedValue({ id: 1, expires: new Date(), teamId: null, identifier: "a@example.com" });

    await expect(isTeamInviteToken({ token: "abc" })).resolves.toBe(false);
  });

  it("is false for an unknown token", async () => {
    findUnique.mockResolvedValue(null);

    await expect(isTeamInviteToken({ token: "missing" })).resolves.toBe(false);
  });

  it("propagates unexpected database errors", async () => {
    findUnique.mockRejectedValue(new Error("connection lost"));

    await expect(isTeamInviteToken({ token: "abc" })).rejects.toThrow("connection lost");
  });
});
