import type { PrismaClient } from "@calcom/prisma/client";
import { describe, expect, it, vi } from "vitest";
import { TeamSlugTakenError } from "../lib/errors";
import { TeamRepository } from "./TeamRepository";

function buildRepository({ existingTeamWithSlug = null as { id: number } | null } = {}) {
  const calls: string[] = [];
  const tx = {
    $executeRaw: vi.fn(async () => {
      calls.push("lock");
      return 1;
    }),
    team: {
      findFirst: vi.fn(async () => {
        calls.push("team.findFirst");
        return existingTeamWithSlug;
      }),
      create: vi.fn(async () => {
        calls.push("team.create");
        return { id: 1 };
      }),
      update: vi.fn(async () => {
        calls.push("team.update");
        return { id: 1 };
      }),
      delete: vi.fn(async () => {
        calls.push("team.delete");
        return { id: 1 };
      }),
    },
    verificationToken: {
      deleteMany: vi.fn(async () => {
        calls.push("verificationToken.deleteMany");
        return { count: 2 };
      }),
    },
  };
  const prismaClient = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    team: { update: vi.fn().mockResolvedValue({ id: 1 }) },
  };
  return {
    repository: new TeamRepository(prismaClient as unknown as PrismaClient),
    prismaClient,
    tx,
    calls,
  };
}

function lockCall(tx: { $executeRaw: { mock: { calls: unknown[][] } } }) {
  const [strings, ...values] = tx.$executeRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
  return { sql: strings.join("?"), values };
}

describe("TeamRepository.create", () => {
  it("takes a per-slug advisory lock before checking and creating, in one transaction", async () => {
    const { repository, tx, calls } = buildRepository();

    await repository.create({ name: "Sales", slug: "sales" });

    expect(calls).toEqual(["lock", "team.findFirst", "team.create"]);
    expect(lockCall(tx)).toEqual({
      sql: "SELECT pg_advisory_xact_lock(hashtext(?))",
      values: ["team-slug:sales"],
    });
    expect(tx.team.findFirst).toHaveBeenCalledWith({
      where: { slug: "sales", parentId: null },
      select: { id: true },
    });
  });

  it("throws TeamSlugTakenError without creating when another top-level team has the slug", async () => {
    const { repository, tx } = buildRepository({ existingTeamWithSlug: { id: 2 } });

    await expect(repository.create({ name: "Sales", slug: "sales" })).rejects.toBeInstanceOf(
      TeamSlugTakenError
    );
    expect(tx.team.create).not.toHaveBeenCalled();
  });
});

describe("TeamRepository.update", () => {
  it("skips the slug lock when the slug is not changing", async () => {
    const { repository, prismaClient } = buildRepository();

    await repository.update({ id: 1, data: { name: "Renamed" } });

    expect(prismaClient.$transaction).not.toHaveBeenCalled();
    expect(prismaClient.team.update).toHaveBeenCalled();
  });

  it("allows the team to keep its own slug", async () => {
    const { repository, calls } = buildRepository({ existingTeamWithSlug: { id: 1 } });

    await repository.update({ id: 1, data: { slug: "sales" } });

    expect(calls).toEqual(["lock", "team.findFirst", "team.update"]);
  });

  it("throws TeamSlugTakenError when another team owns the slug", async () => {
    const { repository, tx } = buildRepository({ existingTeamWithSlug: { id: 2 } });

    await expect(repository.update({ id: 1, data: { slug: "sales" } })).rejects.toBeInstanceOf(
      TeamSlugTakenError
    );
    expect(tx.team.update).not.toHaveBeenCalled();
  });
});

describe("TeamRepository.delete", () => {
  it("deletes the team's invite tokens in the same transaction as the team", async () => {
    const { repository, tx, calls } = buildRepository();

    await expect(repository.delete({ id: 1 })).resolves.toEqual({ id: 1 });

    expect(calls).toEqual(["verificationToken.deleteMany", "team.delete"]);
    expect(tx.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { teamId: 1 } });
  });
});
