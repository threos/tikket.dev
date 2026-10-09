import type { PrismaClient } from "@calcom/prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PublicTeamRepository } from "./PublicTeamRepository";

function buildRepository() {
  const findFirst = vi.fn().mockResolvedValue(null);
  const prismaClient = { team: { findFirst } } as unknown as PrismaClient;
  return { repository: new PublicTeamRepository(prismaClient), findFirst };
}

describe("PublicTeamRepository.findBySlugIncludePublicEventTypesAndMembers", () => {
  it("only looks up top-level, non-organization teams by slug", async () => {
    const { repository, findFirst } = buildRepository();

    await repository.findBySlugIncludePublicEventTypesAndMembers({ slug: "sales" });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "sales", parentId: null, isOrganization: false } })
    );
  });

  it("selects only accepted members, non-hidden event types and public user fields", async () => {
    const { repository, findFirst } = buildRepository();

    await repository.findBySlugIncludePublicEventTypesAndMembers({ slug: "sales" });

    const { select } = findFirst.mock.calls[0][0];
    const publicUserSelect = { id: true, name: true, username: true, avatarUrl: true };
    expect(select.members.where).toEqual({ accepted: true });
    expect(select.members.select.user.select).toEqual(publicUserSelect);
    expect(select.eventTypes.where).toEqual({ hidden: false });
    expect(select.eventTypes.select.hosts.select.user.select).toEqual(publicUserSelect);
    expect(JSON.stringify(select)).not.toContain("email");
  });
});
