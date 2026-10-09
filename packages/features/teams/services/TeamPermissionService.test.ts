import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamMembershipRepository } from "../repositories/TeamMembershipRepository";
import { TeamPermissionService } from "./TeamPermissionService";

type Role = "MEMBER" | "ADMIN" | "OWNER";

const repo = {
  findAcceptedByUserIdInTeamOrParent: vi.fn(),
  findAcceptedByUserIdAndRolesIncludeChildTeamIds: vi.fn(),
};

function createService() {
  return new TeamPermissionService({
    teamMembershipRepository: repo as unknown as TeamMembershipRepository,
  });
}

function membership(role: Role, teamId = 1) {
  return { id: 1, teamId, userId: 10, role, accepted: true };
}

const ADMIN_OR_OWNER: Role[] = ["ADMIN", "OWNER"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeamPermissionService.checkPermission", () => {
  it.each<[Role, boolean]>([
    ["MEMBER", false],
    ["ADMIN", true],
    ["OWNER", true],
  ])("with ADMIN/OWNER fallback roles, a %s gets %s", async (role, expected) => {
    repo.findAcceptedByUserIdInTeamOrParent.mockResolvedValue([membership(role)]);

    const result = await createService().checkPermission({
      userId: 10,
      teamId: 1,
      permission: "team.update",
      fallbackRoles: ADMIN_OR_OWNER,
    });

    expect(result).toBe(expected);
    expect(repo.findAcceptedByUserIdInTeamOrParent).toHaveBeenCalledWith({ userId: 10, teamId: 1 });
  });

  it("denies pending members because the repository only returns accepted memberships", async () => {
    repo.findAcceptedByUserIdInTeamOrParent.mockResolvedValue([]);

    const result = await createService().checkPermission({
      userId: 10,
      teamId: 1,
      permission: "team.read",
      fallbackRoles: ["MEMBER", "ADMIN", "OWNER"],
    });

    expect(result).toBe(false);
  });

  it("denies non-members", async () => {
    repo.findAcceptedByUserIdInTeamOrParent.mockResolvedValue([]);

    const result = await createService().checkPermission({
      userId: 99,
      teamId: 1,
      permission: "team.update",
      fallbackRoles: ADMIN_OR_OWNER,
    });

    expect(result).toBe(false);
  });

  it("fails closed when fallbackRoles is omitted or empty", async () => {
    repo.findAcceptedByUserIdInTeamOrParent.mockResolvedValue([membership("OWNER")]);
    const service = createService();

    await expect(service.checkPermission({ userId: 10, teamId: 1, permission: "team.read" })).resolves.toBe(
      false
    );
    await expect(
      service.checkPermission({ userId: 10, teamId: 1, permission: "team.read", fallbackRoles: [] })
    ).resolves.toBe(false);
    expect(repo.findAcceptedByUserIdInTeamOrParent).not.toHaveBeenCalled();
  });

  it("allows any accepted member when every role is passed explicitly", async () => {
    repo.findAcceptedByUserIdInTeamOrParent.mockResolvedValue([membership("MEMBER")]);

    const result = await createService().checkPermission({
      userId: 10,
      teamId: 1,
      permission: "team.read",
      fallbackRoles: ["MEMBER", "ADMIN", "OWNER"],
    });

    expect(result).toBe(true);
  });

  it("grants access through an admin role in the parent organization", async () => {
    repo.findAcceptedByUserIdInTeamOrParent.mockResolvedValue([membership("ADMIN", 500)]);

    const result = await createService().checkPermission({
      userId: 10,
      teamId: 1,
      permission: "team.update",
      fallbackRoles: ADMIN_OR_OWNER,
    });

    expect(result).toBe(true);
  });

  it("hasPermission behaves like checkPermission", async () => {
    repo.findAcceptedByUserIdInTeamOrParent.mockResolvedValue([membership("MEMBER")]);

    const result = await createService().hasPermission({
      userId: 10,
      teamId: 1,
      permission: "team.update",
      fallbackRoles: ADMIN_OR_OWNER,
    });

    expect(result).toBe(false);
  });
});

describe("TeamPermissionService.getTeamIdsWithPermission", () => {
  it("returns teams where the user holds an allowed role, plus child teams, deduplicated", async () => {
    repo.findAcceptedByUserIdAndRolesIncludeChildTeamIds.mockResolvedValue([
      { teamId: 1, team: { children: [] } },
      { teamId: 500, team: { children: [{ id: 2 }, { id: 1 }] } },
    ]);

    const result = await createService().getTeamIdsWithPermission({
      userId: 10,
      permission: "booking.read",
      fallbackRoles: ADMIN_OR_OWNER,
    });

    expect(result.sort()).toEqual([1, 2, 500].sort());
    expect(repo.findAcceptedByUserIdAndRolesIncludeChildTeamIds).toHaveBeenCalledWith({
      userId: 10,
      roles: ADMIN_OR_OWNER,
    });
  });

  it("returns no teams without querying when fallbackRoles is omitted or empty", async () => {
    const service = createService();

    await expect(service.getTeamIdsWithPermission({ userId: 10, permission: "team.read" })).resolves.toEqual(
      []
    );
    await expect(
      service.getTeamIdsWithPermission({ userId: 10, permission: "team.read", fallbackRoles: [] })
    ).resolves.toEqual([]);
    expect(repo.findAcceptedByUserIdAndRolesIncludeChildTeamIds).not.toHaveBeenCalled();
  });
});
