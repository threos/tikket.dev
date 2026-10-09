import type { PrismaClient } from "@calcom/prisma/client";
import { describe, expect, it, vi } from "vitest";
import { TeamOwnerMinimumError } from "../lib/errors";
import { TeamMembershipRepository } from "./TeamMembershipRepository";

const LOCK_SQL =
  'SELECT id FROM "Membership" WHERE "teamId" = ? AND role = \'OWNER\' AND accepted = true FOR UPDATE';

function buildRepository({ acceptedOwnersAfterWrite = 1 } = {}) {
  const calls: string[] = [];
  const track =
    <T>(name: string, result: T) =>
    () => {
      calls.push(name);
      return Promise.resolve(result);
    };

  const tx = {
    $queryRaw: vi.fn(track("lock", [])),
    membership: {
      update: vi.fn(track("membership.update", { id: 7 })),
      delete: vi.fn(track("membership.delete", { id: 7 })),
      count: vi.fn(track("membership.count", acceptedOwnersAfterWrite)),
    },
    host: { deleteMany: vi.fn(track("host.deleteMany", { count: 0 })) },
    eventType: {
      findMany: vi.fn(track("eventType.findMany", [])),
      deleteMany: vi.fn(track("eventType.deleteMany", { count: 0 })),
    },
    user: { update: vi.fn(track("user.update", { id: 1 })) },
  };
  const prismaClient = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    membership: {
      update: vi.fn().mockResolvedValue({ id: 7 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  const repository = new TeamMembershipRepository(prismaClient as unknown as PrismaClient);
  return { repository, prismaClient, tx, calls };
}

function lockSql(tx: { $queryRaw: { mock: { calls: unknown[][] } } }) {
  const [strings, ...values] = tx.$queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
  return { sql: strings.join("?").replace(/\s+/g, " ").trim(), values };
}

describe("TeamMembershipRepository.updateRole", () => {
  it("updates directly without a transaction when no owner guard is requested", async () => {
    const { repository, prismaClient } = buildRepository();

    await repository.updateRole({ id: 7, teamId: 1, role: "ADMIN" });

    expect(prismaClient.$transaction).not.toHaveBeenCalled();
    expect(prismaClient.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: { role: "ADMIN" } })
    );
  });

  it("locks the team's accepted owners, writes, then re-counts inside one transaction", async () => {
    const { repository, tx, calls } = buildRepository({ acceptedOwnersAfterWrite: 1 });

    await repository.updateRole({ id: 7, teamId: 1, role: "ADMIN", ownersGuard: { minAcceptedOwners: 1 } });

    expect(calls).toEqual(["lock", "membership.update", "membership.count"]);
    expect(lockSql(tx)).toEqual({ sql: LOCK_SQL, values: [1] });
    expect(tx.membership.count).toHaveBeenCalledWith({
      where: { teamId: 1, role: "OWNER", accepted: true },
    });
  });

  it("throws TeamOwnerMinimumError so the transaction rolls back when no owner would remain", async () => {
    const { repository } = buildRepository({ acceptedOwnersAfterWrite: 0 });

    await expect(
      repository.updateRole({ id: 7, teamId: 1, role: "MEMBER", ownersGuard: { minAcceptedOwners: 1 } })
    ).rejects.toBeInstanceOf(TeamOwnerMinimumError);
  });
});

describe("TeamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments", () => {
  it("does not lock or count owners without a guard", async () => {
    const { repository, calls } = buildRepository();

    await repository.deleteByIdIncludeTeamEventTypeAssignments({ id: 7, userId: 20, teamId: 1 });

    expect(calls).not.toContain("lock");
    expect(calls).not.toContain("membership.count");
    expect(calls).toContain("membership.delete");
  });

  it("locks owners first and re-counts after the cleanup and delete, in the same transaction", async () => {
    const { repository, tx, calls } = buildRepository({ acceptedOwnersAfterWrite: 1 });

    await repository.deleteByIdIncludeTeamEventTypeAssignments({
      id: 7,
      userId: 20,
      teamId: 1,
      ownersGuard: { minAcceptedOwners: 1 },
    });

    expect(calls[0]).toBe("lock");
    expect(calls.slice(-2)).toEqual(["membership.delete", "membership.count"]);
    expect(calls).toContain("host.deleteMany");
    expect(calls).toContain("eventType.deleteMany");
    expect(lockSql(tx).values).toEqual([1]);
  });

  it("throws TeamOwnerMinimumError when the delete would leave too few owners", async () => {
    const { repository } = buildRepository({ acceptedOwnersAfterWrite: 0 });

    await expect(
      repository.deleteByIdIncludeTeamEventTypeAssignments({
        id: 7,
        userId: 20,
        teamId: 1,
        ownersGuard: { minAcceptedOwners: 1 },
      })
    ).rejects.toBeInstanceOf(TeamOwnerMinimumError);
  });
});

describe("TeamMembershipRepository.findAllByUserIdIncludeTeam", () => {
  it("only returns memberships of top-level teams, never organizations or sub-teams", async () => {
    const { repository, prismaClient } = buildRepository();

    await repository.findAllByUserIdIncludeTeam({ userId: 10 });

    expect(prismaClient.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 10, team: { isOrganization: false, parentId: null } } })
    );
  });
});
