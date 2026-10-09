import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const teamService = {
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  listTeamsForUser: vi.fn(),
  getTeam: vi.fn(),
};

vi.mock("@calcom/features/teams/di/TeamService.container", () => ({
  getTeamService: () => teamService,
}));

import { createTeamHandler, deleteTeamHandler, updateTeamHandler } from "./teams.handler";
import { ZCreateTeamInputSchema } from "./teams.schema";

const ctx = { user: { id: 10 } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTeamHandler", () => {
  it("creates the team for the session user and returns the DTO", async () => {
    const dto = { id: 1, name: "Sales", slug: "sales" };
    teamService.createTeam.mockResolvedValue(dto);

    const result = await createTeamHandler({ ctx, input: { name: "Sales", slug: "sales" } });

    expect(teamService.createTeam).toHaveBeenCalledWith(10, { name: "Sales", slug: "sales" });
    expect(result).toBe(dto);
  });

  it("propagates service errors such as slug conflicts", async () => {
    teamService.createTeam.mockRejectedValue(new ErrorWithCode(ErrorCode.Conflict, "taken"));

    await expect(createTeamHandler({ ctx, input: { name: "Sales", slug: "sales" } })).rejects.toMatchObject({
      code: ErrorCode.Conflict,
    });
  });

  it("rejects empty and oversized input at the schema level", () => {
    expect(ZCreateTeamInputSchema.safeParse({ name: " ", slug: "x" }).success).toBe(false);
    expect(ZCreateTeamInputSchema.safeParse({ name: "a".repeat(101), slug: "x" }).success).toBe(false);
  });
});

describe("updateTeamHandler / deleteTeamHandler", () => {
  it("splits teamId from the update payload", async () => {
    await updateTeamHandler({ ctx, input: { teamId: 1, isPrivate: true } });

    expect(teamService.updateTeam).toHaveBeenCalledWith(1, 10, { isPrivate: true });
  });

  it("deletes as the session user", async () => {
    teamService.deleteTeam.mockResolvedValue({ id: 1 });

    await expect(deleteTeamHandler({ ctx, input: { teamId: 1 } })).resolves.toEqual({ id: 1 });
    expect(teamService.deleteTeam).toHaveBeenCalledWith(1, 10);
  });
});
