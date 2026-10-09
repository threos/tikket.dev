import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckPermission = vi.fn();

vi.mock("@calcom/features/teams/di/TeamPermissionService.container", () => ({
  getTeamPermissionService: () => ({ checkPermission: mockCheckPermission }),
}));

import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { teamsAndUserProfilesQuery } from "./teamsAndUserProfilesQuery.handler";

const findUnique = vi.fn();

function callQuery(withPermission?: { permission: string; fallbackRoles?: string[] }) {
  return teamsAndUserProfilesQuery({
    ctx: {
      user: { id: 10 } as NonNullable<TrpcSessionUser>,
      prisma: { user: { findUnique } } as unknown as PrismaClient,
    },
    input: withPermission ? { withPermission } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue({
    id: 10,
    avatarUrl: null,
    username: "alice",
    name: "Alice",
    teams: [
      {
        role: "MEMBER",
        team: {
          id: 1,
          isOrganization: false,
          logoUrl: null,
          name: "Sales",
          slug: "sales",
          metadata: null,
          parentId: null,
          parent: null,
          members: [{ userId: 10 }],
        },
      },
    ],
  });
  mockCheckPermission.mockResolvedValue(true);
});

describe("teamsAndUserProfilesQuery withPermission", () => {
  it.each([
    [undefined],
    [[]],
  ])("checks every role explicitly when the client passes fallbackRoles=%j", async (fallbackRoles) => {
    await callQuery({ permission: "eventType.read", fallbackRoles });

    expect(mockCheckPermission).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 1, fallbackRoles: ["MEMBER", "ADMIN", "OWNER"] })
    );
  });

  it("forwards the client's roles when provided", async () => {
    mockCheckPermission.mockResolvedValue(false);

    const result = await callQuery({ permission: "eventType.create", fallbackRoles: ["ADMIN", "OWNER"] });

    expect(mockCheckPermission).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 1, fallbackRoles: ["ADMIN", "OWNER"] })
    );
    expect(result).toHaveLength(1);
  });
});
