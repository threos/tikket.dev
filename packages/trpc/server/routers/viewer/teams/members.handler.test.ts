import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const teamMembershipService = {
  listMembers: vi.fn(),
  inviteMember: vi.fn(),
  changeMemberRole: vi.fn(),
  removeMember: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
  leaveTeam: vi.fn(),
};

vi.mock("@calcom/features/teams/di/TeamMembershipService.container", () => ({
  getTeamMembershipService: () => teamMembershipService,
}));

import { inviteMemberHandler, removeMemberHandler } from "./members.handler";
import { ZInviteMemberInputSchema } from "./teams.schema";

const ctx = { user: { id: 10 } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inviteMemberHandler", () => {
  it("passes the parsed input to the service and returns its result", async () => {
    const dto = { status: "invited_new_user", inviteLink: "https://x/signup?token=t", emailSent: false };
    teamMembershipService.inviteMember.mockResolvedValue(dto);
    const input = ZInviteMemberInputSchema.parse({ teamId: 1, emailOrUsername: "  a@b.com " });

    const result = await inviteMemberHandler({ ctx, input });

    expect(input.role).toBe("MEMBER");
    expect(teamMembershipService.inviteMember).toHaveBeenCalledWith(1, 10, {
      emailOrUsername: "a@b.com",
      role: "MEMBER",
    });
    expect(result).toBe(dto);
  });

  it("rejects unknown roles at the schema level", () => {
    expect(
      ZInviteMemberInputSchema.safeParse({ teamId: 1, emailOrUsername: "a@b.com", role: "SUPERADMIN" })
        .success
    ).toBe(false);
  });
});

describe("removeMemberHandler", () => {
  it("removes the target member as the session user", async () => {
    teamMembershipService.removeMember.mockResolvedValue({ success: true });

    await expect(removeMemberHandler({ ctx, input: { teamId: 1, userId: 20 } })).resolves.toEqual({
      success: true,
    });
    expect(teamMembershipService.removeMember).toHaveBeenCalledWith(1, 10, 20);
  });

  it("propagates permission errors", async () => {
    teamMembershipService.removeMember.mockRejectedValue(new ErrorWithCode(ErrorCode.Forbidden, "nope"));

    await expect(removeMemberHandler({ ctx, input: { teamId: 1, userId: 20 } })).rejects.toMatchObject({
      code: ErrorCode.Forbidden,
    });
  });
});
