import { TeamSlugTakenError } from "@calcom/features/teams/lib/errors";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import type { MembershipRole, RRResetInterval, RRTimestampBasis } from "@calcom/prisma/enums";

const teamSelect = {
  id: true,
  name: true,
  slug: true,
  bio: true,
  logoUrl: true,
  isPrivate: true,
  hideBookATeamMember: true,
  rrResetInterval: true,
  rrTimestampBasis: true,
  isOrganization: true,
  parentId: true,
} satisfies Prisma.TeamSelect;

export type TeamRecord = Prisma.TeamGetPayload<{ select: typeof teamSelect }>;

export type TeamUpdateData = {
  name?: string;
  slug?: string;
  bio?: string | null;
  isPrivate?: boolean;
  hideBookATeamMember?: boolean;
  rrResetInterval?: RRResetInterval;
  rrTimestampBasis?: RRTimestampBasis;
};

/**
 * Postgres treats NULL parentId values as distinct, so @@unique([slug, parentId]) does not stop two
 * top-level teams from sharing a slug. A per-slug advisory lock serialises concurrent claims of the
 * same slug until the transaction ends, making the check-then-write below race free.
 */
async function claimTopLevelSlug(
  tx: Prisma.TransactionClient,
  slug: string,
  currentTeamId?: number
): Promise<void> {
  const lockKey = `team-slug:${slug}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
  const existing = await tx.team.findFirst({
    where: { slug, parentId: null },
    select: { id: true },
  });
  if (existing && existing.id !== currentTeamId) {
    throw new TeamSlugTakenError();
  }
}

export class TeamRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findById({ id }: { id: number }): Promise<TeamRecord | null> {
    return this.prismaClient.team.findUnique({
      where: { id },
      select: teamSelect,
    });
  }

  async findByIdIncludeOrganizationSettings({ id }: { id: number }) {
    return this.prismaClient.team.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        metadata: true,
        isPlatform: true,
        organizationSettings: {
          select: {
            orgAutoAcceptEmail: true,
          },
        },
      },
    });
  }

  async findBySlug({ slug }: { slug: string }): Promise<TeamRecord | null> {
    return this.prismaClient.team.findFirst({
      where: { slug, parentId: null },
      select: teamSelect,
    });
  }

  /** Throws TeamSlugTakenError when another top-level team already uses the slug. */
  async create({
    name,
    slug,
    members,
  }: {
    name: string;
    slug: string;
    members?: { userId: number; role: MembershipRole; accepted: boolean }[];
  }): Promise<TeamRecord> {
    return this.prismaClient.$transaction(async (tx) => {
      await claimTopLevelSlug(tx, slug);
      // Nested create keeps the team and its initial memberships in one atomic statement.
      return tx.team.create({
        data: {
          name,
          slug,
          members: members?.length ? { create: members } : undefined,
        },
        select: teamSelect,
      });
    });
  }

  /** Throws TeamSlugTakenError when `data.slug` belongs to another top-level team. */
  async update({ id, data }: { id: number; data: TeamUpdateData }): Promise<TeamRecord> {
    const { slug } = data;
    if (slug === undefined) {
      return this.prismaClient.team.update({
        where: { id },
        data,
        select: teamSelect,
      });
    }
    return this.prismaClient.$transaction(async (tx) => {
      await claimTopLevelSlug(tx, slug, id);
      return tx.team.update({
        where: { id },
        data,
        select: teamSelect,
      });
    });
  }

  /**
   * Also deletes the team's invite tokens: the FK is ON DELETE SET NULL, and a token left with
   * teamId = null would no longer be recognised as a team invite by signup.
   */
  async delete({ id }: { id: number }): Promise<{ id: number }> {
    return this.prismaClient.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({ where: { teamId: id } });
      return tx.team.delete({
        where: { id },
        select: { id: true },
      });
    });
  }
}
