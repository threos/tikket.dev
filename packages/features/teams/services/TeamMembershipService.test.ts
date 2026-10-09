import { ErrorCode } from "@calcom/lib/errorCodes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/emails/organization-email-service", () => ({
  sendTeamInviteEmail: vi.fn(),
}));
vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@calcom/lib/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@calcom/lib/constants")>()),
  WEBAPP_URL: "https://app.tikket.test",
}));

import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { TeamOwnerMinimumError } from "../lib/errors";
import type { TeamMembershipRepository } from "../repositories/TeamMembershipRepository";
import type { TeamRepository } from "../repositories/TeamRepository";
import type { UserLookupRepository } from "../repositories/UserLookupRepository";
import type { VerificationTokenRepository } from "../repositories/VerificationTokenRepository";
import { TeamMembershipService } from "./TeamMembershipService";

type Role = "MEMBER" | "ADMIN" | "OWNER";

const teamRepository = { findById: vi.fn() };
const teamMembershipRepository = {
  findByUserIdAndTeamId: vi.fn(),
  findByUserIdAndTeamIdIncludeUser: vi.fn(),
  findAllByTeamIdIncludeUser: vi.fn(),
  create: vi.fn(),
  updateRole: vi.fn(),
  findAssignAllTeamMembersEventTypesByTeamId: vi.fn(),
  updateAcceptedIncludeHosts: vi.fn(),
  createHosts: vi.fn(),
  deleteById: vi.fn(),
  deleteByIdIncludeTeamEventTypeAssignments: vi.fn(),
};
const userLookupRepository = { findById: vi.fn(), findByEmail: vi.fn(), findByUsername: vi.fn() };
const verificationTokenRepository = { create: vi.fn() };

function createService() {
  return new TeamMembershipService({
    teamRepository: teamRepository as unknown as TeamRepository,
    teamMembershipRepository: teamMembershipRepository as unknown as TeamMembershipRepository,
    userLookupRepository: userLookupRepository as unknown as UserLookupRepository,
    verificationTokenRepository: verificationTokenRepository as unknown as VerificationTokenRepository,
  });
}

const ACTOR_ID = 10;
const TARGET_ID = 20;
const TEAM_ID = 1;

function membership(userId: number, role: Role, accepted = true, id = userId * 100) {
  return { id, teamId: TEAM_ID, userId, role, accepted };
}

function team(overrides: { isPrivate?: boolean; isOrganization?: boolean; parentId?: number | null } = {}) {
  return {
    id: TEAM_ID,
    name: "Sales",
    isPrivate: false,
    isOrganization: false,
    parentId: null,
    ...overrides,
  };
}

const user = (id: number) => ({
  id,
  name: `User ${id}`,
  email: `user${id}@example.com`,
  username: `user${id}`,
  avatarUrl: null,
});

/** Actor and target memberships, looked up by userId. */
function givenMemberships(
  actor: ReturnType<typeof membership> | null,
  target?: ReturnType<typeof membership> | null
) {
  teamMembershipRepository.findByUserIdAndTeamId.mockImplementation(
    async ({ userId }: { userId: number }) => {
      if (userId === ACTOR_ID) return actor;
      if (userId === TARGET_ID) return target ?? null;
      return null;
    }
  );
}

// Messages are shown verbatim in UI toasts, so they must never leak internal ids.
async function expectErrorCode(promise: Promise<unknown>, code: ErrorCode, message?: string) {
  const error = await promise.then(
    () => {
      throw new Error("Expected the promise to reject");
    },
    (e: unknown) => e
  );
  expect(error).toMatchObject({ code });
  const errorMessage = (error as Error).message;
  expect(errorMessage).not.toMatch(/\d/);
  if (message) expect(errorMessage).toBe(message);
}

beforeEach(() => {
  vi.clearAllMocks();
  teamRepository.findById.mockResolvedValue(team());
  teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments.mockResolvedValue(undefined);
  userLookupRepository.findById.mockResolvedValue({
    id: ACTOR_ID,
    name: "Alice",
    email: "alice@example.com",
    username: "alice",
    locale: "en",
  });
  vi.mocked(sendTeamInviteEmail).mockResolvedValue(undefined);
});

describe("listMembers", () => {
  it("returns accepted members and pending invites for an accepted member", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER"));
    teamMembershipRepository.findAllByTeamIdIncludeUser.mockResolvedValue([
      { ...membership(ACTOR_ID, "MEMBER"), user: user(ACTOR_ID) },
      { ...membership(TARGET_ID, "ADMIN", false), user: user(TARGET_ID) },
    ]);

    const result = await createService().listMembers(TEAM_ID, ACTOR_ID);

    expect(result).toEqual([
      {
        membershipId: 1000,
        userId: ACTOR_ID,
        name: "User 10",
        email: "user10@example.com",
        username: "user10",
        avatarUrl: null,
        role: "MEMBER",
        accepted: true,
      },
      expect.objectContaining({ userId: TARGET_ID, accepted: false, role: "ADMIN" }),
    ]);
  });

  it("masks the email of pending invites but keeps their name, username and avatar", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"));
    teamMembershipRepository.findAllByTeamIdIncludeUser.mockResolvedValue([
      { ...membership(ACTOR_ID, "OWNER"), user: user(ACTOR_ID) },
      { ...membership(TARGET_ID, "MEMBER", false), user: user(TARGET_ID) },
    ]);

    const result = await createService().listMembers(TEAM_ID, ACTOR_ID);

    expect(result[0].email).toBe("user10@example.com");
    expect(result[1]).toMatchObject({
      email: "u•••@example.com",
      name: "User 20",
      username: "user20",
      avatarUrl: null,
    });
  });

  it("returns only the caller's own row to a plain member of a private team", async () => {
    teamRepository.findById.mockResolvedValue(team({ isPrivate: true }));
    givenMemberships(membership(ACTOR_ID, "MEMBER"));
    teamMembershipRepository.findByUserIdAndTeamIdIncludeUser.mockResolvedValue({
      ...membership(ACTOR_ID, "MEMBER"),
      user: user(ACTOR_ID),
    });

    const result = await createService().listMembers(TEAM_ID, ACTOR_ID);

    expect(result).toEqual([expect.objectContaining({ userId: ACTOR_ID, email: "user10@example.com" })]);
    expect(teamMembershipRepository.findByUserIdAndTeamIdIncludeUser).toHaveBeenCalledWith({
      userId: ACTOR_ID,
      teamId: TEAM_ID,
    });
    expect(teamMembershipRepository.findAllByTeamIdIncludeUser).not.toHaveBeenCalled();
  });

  it.each<Role>(["ADMIN", "OWNER"])("returns everyone to a %s of a private team", async (role) => {
    teamRepository.findById.mockResolvedValue(team({ isPrivate: true }));
    givenMemberships(membership(ACTOR_ID, role));
    teamMembershipRepository.findAllByTeamIdIncludeUser.mockResolvedValue([
      { ...membership(ACTOR_ID, role), user: user(ACTOR_ID) },
      { ...membership(TARGET_ID, "MEMBER"), user: user(TARGET_ID) },
    ]);

    const result = await createService().listMembers(TEAM_ID, ACTOR_ID);

    expect(result.map((member) => member.userId)).toEqual([ACTOR_ID, TARGET_ID]);
  });

  it("forbids pending members", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", false));
    await expectErrorCode(
      createService().listMembers(TEAM_ID, ACTOR_ID),
      ErrorCode.Forbidden,
      "You are not a member of this team"
    );
  });
});

describe("inviteMember", () => {
  it("invites an existing user found by email as a pending member and emails them", async () => {
    givenMemberships(membership(ACTOR_ID, "ADMIN"));
    userLookupRepository.findByEmail.mockResolvedValue({ ...user(TARGET_ID), locale: null });

    const result = await createService().inviteMember(TEAM_ID, ACTOR_ID, {
      emailOrUsername: " User20@Example.com ",
      role: "ADMIN",
    });

    expect(userLookupRepository.findByEmail).toHaveBeenCalledWith({ email: "User20@Example.com" });
    expect(teamMembershipRepository.create).toHaveBeenCalledWith({
      userId: TARGET_ID,
      teamId: TEAM_ID,
      role: "ADMIN",
      accepted: false,
    });
    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Alice",
        to: "user20@example.com",
        teamName: "Sales",
        joinLink: "https://app.tikket.test/settings/teams",
        isCalcomMember: true,
        isOrg: false,
        isAutoJoin: false,
      })
    );
    expect(result).toEqual({
      status: "invited_existing_user",
      inviteLink: "https://app.tikket.test/settings/teams",
      emailSent: true,
    });
  });

  it("invites an existing user by username", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"));
    userLookupRepository.findByUsername.mockResolvedValue({ ...user(TARGET_ID), locale: null });

    const result = await createService().inviteMember(TEAM_ID, ACTOR_ID, {
      emailOrUsername: "user20",
      role: "MEMBER",
    });

    expect(userLookupRepository.findByUsername).toHaveBeenCalledWith({ username: "user20" });
    expect(result.status).toBe("invited_existing_user");
  });

  it("creates a signup token for an unknown email", async () => {
    givenMemberships(membership(ACTOR_ID, "ADMIN"));
    userLookupRepository.findByEmail.mockResolvedValue(null);

    const result = await createService().inviteMember(TEAM_ID, ACTOR_ID, {
      emailOrUsername: "New@Example.com",
      role: "MEMBER",
    });

    const tokenArgs = verificationTokenRepository.create.mock.calls[0][0];
    expect(tokenArgs).toMatchObject({ identifier: "new@example.com", expiresInDays: 7, teamId: TEAM_ID });
    expect(tokenArgs.token).toMatch(/^[0-9a-f]{64}$/);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(tokenArgs.expires.getTime() - (Date.now() + sevenDays))).toBeLessThan(5000);

    const expectedLink = `https://app.tikket.test/signup?token=${tokenArgs.token}&callbackUrl=settings/teams`;
    expect(result).toEqual({ status: "invited_new_user", inviteLink: expectedLink, emailSent: true });
    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com", joinLink: expectedLink, isCalcomMember: false })
    );
    expect(teamMembershipRepository.create).not.toHaveBeenCalled();
  });

  it("refuses to invite an unknown email with a role above member", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"));
    userLookupRepository.findByEmail.mockResolvedValue(null);

    await expectErrorCode(
      createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "new@example.com", role: "ADMIN" }),
      ErrorCode.BadRequest
    );
    expect(verificationTokenRepository.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown username", async () => {
    givenMemberships(membership(ACTOR_ID, "ADMIN"));
    userLookupRepository.findByUsername.mockResolvedValue(null);

    await expectErrorCode(
      createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "ghost", role: "MEMBER" }),
      ErrorCode.NotFound,
      "No Tikket account uses that username"
    );
    expect(verificationTokenRepository.create).not.toHaveBeenCalled();
  });

  it("reports already_member without creating anything", async () => {
    givenMemberships(membership(ACTOR_ID, "ADMIN"), membership(TARGET_ID, "MEMBER", false));
    userLookupRepository.findByEmail.mockResolvedValue({ ...user(TARGET_ID), locale: null });

    const result = await createService().inviteMember(TEAM_ID, ACTOR_ID, {
      emailOrUsername: "user20@example.com",
      role: "MEMBER",
    });

    expect(result).toEqual({ status: "already_member", inviteLink: null, emailSent: false });
    expect(teamMembershipRepository.create).not.toHaveBeenCalled();
    expect(sendTeamInviteEmail).not.toHaveBeenCalled();
  });

  it("still succeeds when the email fails to send", async () => {
    givenMemberships(membership(ACTOR_ID, "ADMIN"));
    userLookupRepository.findByEmail.mockResolvedValue({ ...user(TARGET_ID), locale: null });
    vi.mocked(sendTeamInviteEmail).mockRejectedValue(new Error("SMTP down"));

    const result = await createService().inviteMember(TEAM_ID, ACTOR_ID, {
      emailOrUsername: "user20@example.com",
      role: "MEMBER",
    });

    expect(result).toEqual({
      status: "invited_existing_user",
      inviteLink: "https://app.tikket.test/settings/teams",
      emailSent: false,
    });
    expect(teamMembershipRepository.create).toHaveBeenCalled();
  });

  it("forbids members from inviting", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER"));

    await expectErrorCode(
      createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "a@b.com", role: "MEMBER" }),
      ErrorCode.Forbidden
    );
  });

  it("forbids admins from inviting owners", async () => {
    givenMemberships(membership(ACTOR_ID, "ADMIN"));

    await expectErrorCode(
      createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "a@b.com", role: "OWNER" }),
      ErrorCode.Forbidden,
      "Only team owners can invite new owners"
    );
  });

  it("lets owners invite existing users as owners", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"));
    userLookupRepository.findByEmail.mockResolvedValue({ ...user(TARGET_ID), locale: null });

    const result = await createService().inviteMember(TEAM_ID, ACTOR_ID, {
      emailOrUsername: "user20@example.com",
      role: "OWNER",
    });

    expect(result.status).toBe("invited_existing_user");
    expect(teamMembershipRepository.create).toHaveBeenCalledWith(expect.objectContaining({ role: "OWNER" }));
  });

  it.each<Role>([
    "ADMIN",
    "OWNER",
  ])("rejects inviting a new email as %s because signup can only grant MEMBER", async (role) => {
    givenMemberships(membership(ACTOR_ID, "OWNER"));
    userLookupRepository.findByEmail.mockResolvedValue(null);

    await expectErrorCode(
      createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "new@example.com", role }),
      ErrorCode.BadRequest
    );
    expect(verificationTokenRepository.create).not.toHaveBeenCalled();
  });

  it("forbids pending admins and non-members", async () => {
    givenMemberships(membership(ACTOR_ID, "ADMIN", false));
    await expectErrorCode(
      createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "a@b.com", role: "MEMBER" }),
      ErrorCode.Forbidden
    );

    givenMemberships(null);
    await expectErrorCode(
      createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "a@b.com", role: "MEMBER" }),
      ErrorCode.Forbidden
    );
  });
});

describe("changeMemberRole", () => {
  beforeEach(() => {
    teamMembershipRepository.updateRole.mockImplementation(
      async ({ id, role }: { id: number; role: Role }) => ({
        ...membership(TARGET_ID, role, true, id),
        user: user(TARGET_ID),
      })
    );
  });

  it.each<[Role, Role, Role, boolean]>([
    // actor, target, new role, allowed
    ["OWNER", "MEMBER", "OWNER", true],
    ["OWNER", "ADMIN", "MEMBER", true],
    ["ADMIN", "MEMBER", "ADMIN", true],
    ["ADMIN", "ADMIN", "MEMBER", true],
    ["ADMIN", "MEMBER", "OWNER", false],
    ["ADMIN", "OWNER", "MEMBER", false],
    ["MEMBER", "MEMBER", "ADMIN", false],
  ])("%s changing a %s to %s -> allowed=%s", async (actorRole, targetRole, newRole, allowed) => {
    givenMemberships(membership(ACTOR_ID, actorRole), membership(TARGET_ID, targetRole));

    const promise = createService().changeMemberRole(TEAM_ID, ACTOR_ID, TARGET_ID, newRole);

    if (allowed) {
      await expect(promise).resolves.toMatchObject({ userId: TARGET_ID, role: newRole });
      expect(teamMembershipRepository.updateRole).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2000, teamId: TEAM_ID, role: newRole })
      );
    } else {
      await expectErrorCode(promise, ErrorCode.Forbidden);
      expect(teamMembershipRepository.updateRole).not.toHaveBeenCalled();
    }
  });

  it("asks the repository to keep an accepted owner when demoting an accepted owner", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), membership(TARGET_ID, "OWNER"));

    await expect(
      createService().changeMemberRole(TEAM_ID, ACTOR_ID, TARGET_ID, "MEMBER")
    ).resolves.toMatchObject({ role: "MEMBER" });
    expect(teamMembershipRepository.updateRole).toHaveBeenCalledWith({
      id: 2000,
      teamId: TEAM_ID,
      role: "MEMBER",
      ownersGuard: { minAcceptedOwners: 1 },
    });
  });

  it("refuses to demote the last accepted owner", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), membership(TARGET_ID, "OWNER"));
    teamMembershipRepository.updateRole.mockRejectedValue(new TeamOwnerMinimumError());

    await expectErrorCode(
      createService().changeMemberRole(TEAM_ID, ACTOR_ID, TARGET_ID, "ADMIN"),
      ErrorCode.BadRequest,
      "You can't change the role of the last owner of the team. Make someone else an owner first"
    );
  });

  it.each([
    ["a pending owner invite", membership(TARGET_ID, "OWNER", false), "MEMBER"],
    ["an owner who stays owner", membership(TARGET_ID, "OWNER"), "OWNER"],
    ["a member", membership(TARGET_ID, "MEMBER"), "ADMIN"],
  ] as const)("does not guard owners when changing %s", async (_label, target, newRole) => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), target);

    await createService().changeMemberRole(TEAM_ID, ACTOR_ID, TARGET_ID, newRole);

    expect(teamMembershipRepository.updateRole).toHaveBeenCalledWith(
      expect.objectContaining({ ownersGuard: undefined })
    );
  });

  it("rethrows unexpected repository errors unchanged", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), membership(TARGET_ID, "OWNER"));
    const failure = new Error("connection lost");
    teamMembershipRepository.updateRole.mockRejectedValue(failure);

    await expect(createService().changeMemberRole(TEAM_ID, ACTOR_ID, TARGET_ID, "ADMIN")).rejects.toBe(
      failure
    );
  });

  it("returns NotFound for an unknown target", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), null);

    await expectErrorCode(
      createService().changeMemberRole(TEAM_ID, ACTOR_ID, TARGET_ID, "ADMIN"),
      ErrorCode.NotFound
    );
  });
});

describe("removeMember", () => {
  it.each<[Role, Role, boolean]>([
    ["OWNER", "MEMBER", true],
    ["OWNER", "ADMIN", true],
    ["OWNER", "OWNER", true],
    ["ADMIN", "MEMBER", true],
    ["ADMIN", "ADMIN", true],
    ["ADMIN", "OWNER", false],
    ["MEMBER", "MEMBER", false],
  ])("%s removing a %s -> allowed=%s", async (actorRole, targetRole, allowed) => {
    givenMemberships(membership(ACTOR_ID, actorRole), membership(TARGET_ID, targetRole));

    const promise = createService().removeMember(TEAM_ID, ACTOR_ID, TARGET_ID);

    if (allowed) {
      await expect(promise).resolves.toEqual({ success: true });
      expect(teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments).toHaveBeenCalledWith({
        id: 2000,
        userId: TARGET_ID,
        teamId: TEAM_ID,
        ownersGuard: targetRole === "OWNER" ? { minAcceptedOwners: 1 } : undefined,
      });
    } else {
      await expectErrorCode(promise, ErrorCode.Forbidden);
      expect(teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments).not.toHaveBeenCalled();
    }
  });

  it("refuses to remove the last accepted owner", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), membership(TARGET_ID, "OWNER"));
    teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments.mockRejectedValue(
      new TeamOwnerMinimumError()
    );

    await expectErrorCode(
      createService().removeMember(TEAM_ID, ACTOR_ID, TARGET_ID),
      ErrorCode.BadRequest,
      "You can't remove the last owner of the team. Make someone else an owner first"
    );
  });

  it("does not guard owners when removing a pending owner invite", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), membership(TARGET_ID, "OWNER", false));

    await createService().removeMember(TEAM_ID, ACTOR_ID, TARGET_ID);

    expect(teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ ownersGuard: undefined })
    );
  });

  it("returns NotFound when the target is not in the team", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"), null);

    await expectErrorCode(
      createService().removeMember(TEAM_ID, ACTOR_ID, TARGET_ID),
      ErrorCode.NotFound,
      "That person is not a member of this team"
    );
  });
});

describe("acceptInvite / declineInvite / leaveTeam", () => {
  it("accepts a pending invite without hosts when no event type assigns all members", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", false));
    teamMembershipRepository.findAssignAllTeamMembersEventTypesByTeamId.mockResolvedValue([]);

    await expect(createService().acceptInvite(TEAM_ID, ACTOR_ID)).resolves.toEqual({ success: true });
    expect(teamMembershipRepository.findAssignAllTeamMembersEventTypesByTeamId).toHaveBeenCalledWith({
      teamId: TEAM_ID,
    });
    expect(teamMembershipRepository.updateAcceptedIncludeHosts).toHaveBeenCalledWith({ id: 1000, hosts: [] });
  });

  it("adds the new member as host on every assign-all round-robin and collective event type", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", false));
    teamMembershipRepository.findAssignAllTeamMembersEventTypesByTeamId.mockResolvedValue([
      { id: 31, schedulingType: "ROUND_ROBIN" },
      { id: 32, schedulingType: "COLLECTIVE" },
      { id: 33, schedulingType: "MANAGED" },
      { id: 34, schedulingType: null },
    ]);

    await createService().acceptInvite(TEAM_ID, ACTOR_ID);

    expect(teamMembershipRepository.updateAcceptedIncludeHosts).toHaveBeenCalledWith({
      id: 1000,
      hosts: [
        { userId: ACTOR_ID, eventTypeId: 31, memberId: 1000, isFixed: false, priority: 2, weight: 100 },
        { userId: ACTOR_ID, eventTypeId: 32, memberId: 1000, isFixed: true, priority: 2, weight: 100 },
      ],
    });
  });

  it("treats accepting an already accepted membership as a no-op", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER"));

    await createService().acceptInvite(TEAM_ID, ACTOR_ID);
    expect(teamMembershipRepository.updateAcceptedIncludeHosts).not.toHaveBeenCalled();
    expect(teamMembershipRepository.findAssignAllTeamMembersEventTypesByTeamId).not.toHaveBeenCalled();
  });

  it("returns NotFound when accepting without an invite", async () => {
    givenMemberships(null);

    await expectErrorCode(createService().acceptInvite(TEAM_ID, ACTOR_ID), ErrorCode.NotFound);
  });

  it("declines a pending invite by deleting it", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", false));

    await expect(createService().declineInvite(TEAM_ID, ACTOR_ID)).resolves.toEqual({ success: true });
    expect(teamMembershipRepository.deleteById).toHaveBeenCalledWith({ id: 1000 });
  });

  it("refuses to decline an accepted membership", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER"));

    await expectErrorCode(createService().declineInvite(TEAM_ID, ACTOR_ID), ErrorCode.BadRequest);
    expect(teamMembershipRepository.deleteById).not.toHaveBeenCalled();
  });

  it("lets a member leave and cleans up their event type assignments", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER"));

    await expect(createService().leaveTeam(TEAM_ID, ACTOR_ID)).resolves.toEqual({ success: true });
    expect(teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments).toHaveBeenCalledWith({
      id: 1000,
      userId: ACTOR_ID,
      teamId: TEAM_ID,
      ownersGuard: undefined,
    });
  });

  it("refuses to let the last owner leave", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"));
    teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments.mockRejectedValue(
      new TeamOwnerMinimumError()
    );

    await expectErrorCode(
      createService().leaveTeam(TEAM_ID, ACTOR_ID),
      ErrorCode.BadRequest,
      "You are the last owner of this team. Make someone else an owner or delete the team before leaving"
    );
  });

  it("lets an owner leave while the repository guards the remaining owners", async () => {
    givenMemberships(membership(ACTOR_ID, "OWNER"));

    await expect(createService().leaveTeam(TEAM_ID, ACTOR_ID)).resolves.toEqual({ success: true });
    expect(teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ ownersGuard: { minAcceptedOwners: 1 } })
    );
  });

  it("forbids leaving with only a pending invite", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", false));

    await expectErrorCode(createService().leaveTeam(TEAM_ID, ACTOR_ID), ErrorCode.Forbidden);
  });
});

describe("addToAssignAllTeamMembersEventTypes", () => {
  it("creates hosts for an accepted member on assign-all event types", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", true));
    teamMembershipRepository.findAssignAllTeamMembersEventTypesByTeamId.mockResolvedValue([
      { id: 31, schedulingType: "ROUND_ROBIN" },
    ]);

    await createService().addToAssignAllTeamMembersEventTypes(TEAM_ID, ACTOR_ID);

    expect(teamMembershipRepository.createHosts).toHaveBeenCalledWith({
      hosts: [
        { userId: ACTOR_ID, eventTypeId: 31, memberId: 1000, isFixed: false, priority: 2, weight: 100 },
      ],
    });
  });

  it("does nothing for a pending or missing membership", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", false));
    await createService().addToAssignAllTeamMembersEventTypes(TEAM_ID, ACTOR_ID);
    givenMemberships(null);
    await createService().addToAssignAllTeamMembersEventTypes(TEAM_ID, ACTOR_ID);

    expect(teamMembershipRepository.createHosts).not.toHaveBeenCalled();
  });

  it("skips the write when no event type assigns all members", async () => {
    givenMemberships(membership(ACTOR_ID, "MEMBER", true));
    teamMembershipRepository.findAssignAllTeamMembersEventTypesByTeamId.mockResolvedValue([]);

    await createService().addToAssignAllTeamMembersEventTypes(TEAM_ID, ACTOR_ID);

    expect(teamMembershipRepository.createHosts).not.toHaveBeenCalled();
  });
});

describe("organizations and sub-teams", () => {
  const operations: [string, () => Promise<unknown>][] = [
    ["listMembers", () => createService().listMembers(TEAM_ID, ACTOR_ID)],
    [
      "inviteMember",
      () => createService().inviteMember(TEAM_ID, ACTOR_ID, { emailOrUsername: "a@b.com", role: "MEMBER" }),
    ],
    ["changeMemberRole", () => createService().changeMemberRole(TEAM_ID, ACTOR_ID, TARGET_ID, "ADMIN")],
    ["removeMember", () => createService().removeMember(TEAM_ID, ACTOR_ID, TARGET_ID)],
    ["acceptInvite", () => createService().acceptInvite(TEAM_ID, ACTOR_ID)],
    ["declineInvite", () => createService().declineInvite(TEAM_ID, ACTOR_ID)],
    ["leaveTeam", () => createService().leaveTeam(TEAM_ID, ACTOR_ID)],
  ];

  const nonTopLevelTeams = [
    ["an organization", team({ isOrganization: true })],
    ["a sub-team", team({ parentId: 500 })],
    ["a missing team", null],
  ] as const;

  describe.each(operations)("%s", (_name, operation) => {
    it.each(nonTopLevelTeams)("returns NotFound for %s", async (_label, teamRecord) => {
      teamRepository.findById.mockResolvedValue(teamRecord);
      givenMemberships(membership(ACTOR_ID, "OWNER", false), membership(TARGET_ID, "MEMBER"));

      await expectErrorCode(operation(), ErrorCode.NotFound, "This team no longer exists");
      expect(teamMembershipRepository.findAllByTeamIdIncludeUser).not.toHaveBeenCalled();
      expect(teamMembershipRepository.create).not.toHaveBeenCalled();
      expect(teamMembershipRepository.updateRole).not.toHaveBeenCalled();
      expect(teamMembershipRepository.updateAcceptedIncludeHosts).not.toHaveBeenCalled();
      expect(teamMembershipRepository.deleteById).not.toHaveBeenCalled();
      expect(teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments).not.toHaveBeenCalled();
    });
  });
});
