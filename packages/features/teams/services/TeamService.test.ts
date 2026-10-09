import { ErrorCode } from "@calcom/lib/errorCodes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamSlugTakenError } from "../lib/errors";
import type { TeamMembershipRepository } from "../repositories/TeamMembershipRepository";
import type { TeamRepository } from "../repositories/TeamRepository";
import { TeamService } from "./TeamService";

type Role = "MEMBER" | "ADMIN" | "OWNER";

const teamRepository = {
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const teamMembershipRepository = {
  findByUserIdAndTeamId: vi.fn(),
  findByUserIdAndTeamIdIncludeTeam: vi.fn(),
  findAllByUserIdIncludeTeam: vi.fn(),
};

function createService() {
  return new TeamService({
    teamRepository: teamRepository as unknown as TeamRepository,
    teamMembershipRepository: teamMembershipRepository as unknown as TeamMembershipRepository,
  });
}

const teamRecord = {
  id: 1,
  name: "Sales",
  slug: "sales",
  bio: null,
  logoUrl: null,
  isPrivate: false,
  hideBookATeamMember: false,
  rrResetInterval: "MONTH" as const,
  rrTimestampBasis: "CREATED_AT" as const,
  isOrganization: false,
  parentId: null as number | null,
};

const teamDto = {
  id: 1,
  name: "Sales",
  slug: "sales",
  bio: null,
  logoUrl: null,
  isPrivate: false,
  hideBookATeamMember: false,
  rrResetInterval: "MONTH",
  rrTimestampBasis: "CREATED_AT",
};

function membership(role: Role, accepted = true) {
  return { id: 7, teamId: 1, userId: 10, role, accepted };
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
  teamRepository.findById.mockResolvedValue(teamRecord);
  teamRepository.create.mockReset();
  teamRepository.update.mockReset();
});

describe("TeamService.createTeam", () => {
  it("slugifies the slug and creates the team with an accepted OWNER membership", async () => {
    teamRepository.create.mockResolvedValue(teamRecord);

    const result = await createService().createTeam(10, { name: "  Sales ", slug: "Sales Team!" });

    expect(teamRepository.create).toHaveBeenCalledWith({
      name: "Sales",
      slug: "sales-team",
      members: [{ userId: 10, role: "OWNER", accepted: true }],
    });
    expect(result).toEqual(teamDto);
  });

  it("returns Conflict when the repository reports the slug is taken", async () => {
    teamRepository.create.mockRejectedValue(new TeamSlugTakenError());

    await expectErrorCode(
      createService().createTeam(10, { name: "Sales", slug: "sales" }),
      ErrorCode.Conflict,
      "This team URL is already taken"
    );
  });

  it("rethrows unexpected repository errors unchanged", async () => {
    const failure = new Error("connection lost");
    teamRepository.create.mockRejectedValue(failure);

    await expect(createService().createTeam(10, { name: "Sales", slug: "sales" })).rejects.toBe(failure);
  });

  it("rejects slugs that slugify to nothing", async () => {
    await expectErrorCode(
      createService().createTeam(10, { name: "Sales", slug: "!!!" }),
      ErrorCode.BadRequest
    );
  });

  it("rejects blank names", async () => {
    await expectErrorCode(createService().createTeam(10, { name: "   ", slug: "x" }), ErrorCode.BadRequest);
  });
});

describe("TeamService.updateTeam", () => {
  it.each<Role>(["ADMIN", "OWNER"])("lets a %s update the team", async (role) => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership(role));
    teamRepository.update.mockResolvedValue({ ...teamRecord, rrResetInterval: null });

    const result = await createService().updateTeam(1, 10, { isPrivate: true, rrResetInterval: "DAY" });

    expect(teamRepository.update).toHaveBeenCalledWith({
      id: 1,
      data: expect.objectContaining({ isPrivate: true, rrResetInterval: "DAY" }),
    });
    expect(result.rrResetInterval).toBe("MONTH");
  });

  it("forbids members", async () => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership("MEMBER"));

    await expectErrorCode(createService().updateTeam(1, 10, { name: "x" }), ErrorCode.Forbidden);
  });

  it("forbids pending admins and non-members", async () => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValueOnce(membership("ADMIN", false));
    await expectErrorCode(createService().updateTeam(1, 10, { name: "x" }), ErrorCode.Forbidden);

    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValueOnce(null);
    await expectErrorCode(createService().updateTeam(1, 10, { name: "x" }), ErrorCode.Forbidden);
  });

  it("passes a normalized slug to the repository", async () => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership("OWNER"));
    teamRepository.update.mockResolvedValue(teamRecord);

    await createService().updateTeam(1, 10, { slug: "Sales" });

    expect(teamRepository.update).toHaveBeenCalledWith({
      id: 1,
      data: expect.objectContaining({ slug: "sales" }),
    });
  });

  it("returns Conflict when the repository reports the slug is owned by another team", async () => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership("OWNER"));
    teamRepository.update.mockRejectedValue(new TeamSlugTakenError());

    await expectErrorCode(
      createService().updateTeam(1, 10, { slug: "sales" }),
      ErrorCode.Conflict,
      "This team URL is already taken"
    );
  });

  it("rejects a blank name", async () => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership("OWNER"));

    await expectErrorCode(createService().updateTeam(1, 10, { name: " " }), ErrorCode.BadRequest);
  });
});

describe("TeamService.deleteTeam", () => {
  it("lets an owner delete the team", async () => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership("OWNER"));
    teamRepository.delete.mockResolvedValue({ id: 1 });

    await expect(createService().deleteTeam(1, 10)).resolves.toEqual({ id: 1 });
  });

  it.each<Role>(["ADMIN", "MEMBER"])("forbids a %s", async (role) => {
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership(role));

    await expectErrorCode(
      createService().deleteTeam(1, 10),
      ErrorCode.Forbidden,
      "Only team owners can delete the team"
    );
    expect(teamRepository.delete).not.toHaveBeenCalled();
  });
});

describe("TeamService.listTeamsForUser / getTeam", () => {
  const membershipWithTeam = (accepted: boolean) => ({
    ...membership("ADMIN", accepted),
    team: { ...teamRecord, _count: { members: 3 } },
  });

  it("lists accepted and pending teams with role and accepted member count", async () => {
    teamMembershipRepository.findAllByUserIdIncludeTeam.mockResolvedValue([
      membershipWithTeam(true),
      membershipWithTeam(false),
    ]);

    const result = await createService().listTeamsForUser(10);

    expect(result).toEqual([
      { ...teamDto, role: "ADMIN", accepted: true, memberCount: 3 },
      { ...teamDto, role: "ADMIN", accepted: false, memberCount: 3 },
    ]);
  });

  it("returns a team for an accepted member", async () => {
    teamMembershipRepository.findByUserIdAndTeamIdIncludeTeam.mockResolvedValue(membershipWithTeam(true));

    await expect(createService().getTeam(1, 10)).resolves.toMatchObject({ id: 1, memberCount: 3 });
  });

  it("forbids pending members and non-members", async () => {
    teamMembershipRepository.findByUserIdAndTeamIdIncludeTeam.mockResolvedValueOnce(
      membershipWithTeam(false)
    );
    await expectErrorCode(createService().getTeam(1, 10), ErrorCode.Forbidden);

    teamMembershipRepository.findByUserIdAndTeamIdIncludeTeam.mockResolvedValueOnce(null);
    await expectErrorCode(createService().getTeam(1, 10), ErrorCode.Forbidden);
  });
});

describe("TeamService organizations and sub-teams", () => {
  const nonTopLevelTeams = [
    ["an organization", { ...teamRecord, isOrganization: true }],
    ["a sub-team", { ...teamRecord, parentId: 500 }],
  ] as const;

  it.each(nonTopLevelTeams)("refuses to update %s", async (_label, team) => {
    teamRepository.findById.mockResolvedValue(team);
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership("OWNER"));

    await expectErrorCode(
      createService().updateTeam(1, 10, { name: "x" }),
      ErrorCode.NotFound,
      "This team no longer exists"
    );
    expect(teamRepository.update).not.toHaveBeenCalled();
  });

  it.each(nonTopLevelTeams)("refuses to delete %s", async (_label, team) => {
    teamRepository.findById.mockResolvedValue(team);
    teamMembershipRepository.findByUserIdAndTeamId.mockResolvedValue(membership("OWNER"));

    await expectErrorCode(
      createService().deleteTeam(1, 10),
      ErrorCode.NotFound,
      "This team no longer exists"
    );
    expect(teamRepository.delete).not.toHaveBeenCalled();
  });

  it("returns NotFound when updating or deleting a team that does not exist", async () => {
    teamRepository.findById.mockResolvedValue(null);

    await expectErrorCode(createService().updateTeam(1, 10, { name: "x" }), ErrorCode.NotFound);
    await expectErrorCode(createService().deleteTeam(1, 10), ErrorCode.NotFound);
  });

  it.each(nonTopLevelTeams)("refuses to get %s", async (_label, team) => {
    teamMembershipRepository.findByUserIdAndTeamIdIncludeTeam.mockResolvedValue({
      ...membership("OWNER"),
      team: { ...team, _count: { members: 3 } },
    });

    await expectErrorCode(createService().getTeam(1, 10), ErrorCode.NotFound, "This team no longer exists");
  });
});
