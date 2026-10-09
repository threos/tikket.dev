import { TeamOwnerMinimumError } from "@calcom/features/teams/lib/errors";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import type { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

export type TeamMembershipHostInput = {
  userId: number;
  eventTypeId: number;
  memberId: number;
  isFixed: boolean;
  priority: number;
  weight: number;
};

const membershipSelect = {
  id: true,
  teamId: true,
  userId: true,
  role: true,
  accepted: true,
} satisfies Prisma.MembershipSelect;

export type TeamMembershipRecord = Prisma.MembershipGetPayload<{ select: typeof membershipSelect }>;

const membershipWithUserSelect = {
  ...membershipSelect,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.MembershipSelect;

export type TeamMembershipWithUserRecord = Prisma.MembershipGetPayload<{
  select: typeof membershipWithUserSelect;
}>;

const membershipWithTeamSelect = {
  ...membershipSelect,
  team: {
    select: {
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
      _count: {
        select: {
          members: { where: { accepted: true } },
        },
      },
    },
  },
} satisfies Prisma.MembershipSelect;

export type TeamMembershipWithTeamRecord = Prisma.MembershipGetPayload<{
  select: typeof membershipWithTeamSelect;
}>;

/**
 * When set, the write only commits if the team still has at least `minAcceptedOwners` accepted owners
 * afterwards; otherwise the transaction rolls back with a TeamOwnerMinimumError.
 */
export type AcceptedOwnersGuard = { minAcceptedOwners: number };

// Locking the owner rows serialises concurrent owner demotions/removals in the same team: the second
// transaction waits, then re-reads the committed rows, so two owners can't each see the other and both leave.
async function lockAcceptedOwners(tx: Prisma.TransactionClient, teamId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Membership" WHERE "teamId" = ${teamId} AND role = 'OWNER' AND accepted = true FOR UPDATE`;
}

async function throwIfTooFewAcceptedOwners(
  tx: Prisma.TransactionClient,
  teamId: number,
  guard: AcceptedOwnersGuard
): Promise<void> {
  const ownerCount = await tx.membership.count({ where: { teamId, role: "OWNER", accepted: true } });
  if (ownerCount < guard.minAcceptedOwners) {
    throw new TeamOwnerMinimumError();
  }
}

export class TeamMembershipRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByUserIdAndTeamId({
    userId,
    teamId,
  }: {
    userId: number;
    teamId: number;
  }): Promise<TeamMembershipRecord | null> {
    return this.prismaClient.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: membershipSelect,
    });
  }

  async findByUserIdAndTeamIdIncludeUser({
    userId,
    teamId,
  }: {
    userId: number;
    teamId: number;
  }): Promise<TeamMembershipWithUserRecord | null> {
    return this.prismaClient.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: membershipWithUserSelect,
    });
  }

  /** Accepted memberships of the user in the team itself or in the team's parent organization. */
  async findAcceptedByUserIdInTeamOrParent({
    userId,
    teamId,
  }: {
    userId: number;
    teamId: number;
  }): Promise<TeamMembershipRecord[]> {
    return this.prismaClient.membership.findMany({
      where: {
        userId,
        accepted: true,
        OR: [{ teamId }, { team: { children: { some: { id: teamId } } } }],
      },
      select: membershipSelect,
    });
  }

  async findAcceptedByUserIdAndRolesIncludeChildTeamIds({
    userId,
    roles,
  }: {
    userId: number;
    roles: MembershipRole[];
  }) {
    return this.prismaClient.membership.findMany({
      where: { userId, accepted: true, role: { in: roles } },
      select: {
        teamId: true,
        team: { select: { children: { select: { id: true } } } },
      },
    });
  }

  async findAllByUserIdIncludeTeam({ userId }: { userId: number }): Promise<TeamMembershipWithTeamRecord[]> {
    return this.prismaClient.membership.findMany({
      where: { userId, team: { isOrganization: false, parentId: null } },
      select: membershipWithTeamSelect,
      orderBy: { teamId: "asc" },
    });
  }

  async findByUserIdAndTeamIdIncludeTeam({
    userId,
    teamId,
  }: {
    userId: number;
    teamId: number;
  }): Promise<TeamMembershipWithTeamRecord | null> {
    return this.prismaClient.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: membershipWithTeamSelect,
    });
  }

  async findAllByTeamIdIncludeUser({ teamId }: { teamId: number }): Promise<TeamMembershipWithUserRecord[]> {
    return this.prismaClient.membership.findMany({
      where: { teamId },
      select: membershipWithUserSelect,
      orderBy: [{ accepted: "desc" }, { id: "asc" }],
    });
  }

  async create({
    userId,
    teamId,
    role,
    accepted,
  }: {
    userId: number;
    teamId: number;
    role: MembershipRole;
    accepted: boolean;
  }): Promise<TeamMembershipRecord> {
    return this.prismaClient.membership.create({
      data: { userId, teamId, role, accepted },
      select: membershipSelect,
    });
  }

  async updateRole({
    id,
    teamId,
    role,
    ownersGuard,
  }: {
    id: number;
    teamId: number;
    role: MembershipRole;
    ownersGuard?: AcceptedOwnersGuard;
  }): Promise<TeamMembershipWithUserRecord> {
    if (!ownersGuard) {
      return this.prismaClient.membership.update({
        where: { id },
        data: { role },
        select: membershipWithUserSelect,
      });
    }
    return this.prismaClient.$transaction(async (tx) => {
      await lockAcceptedOwners(tx, teamId);
      const membership = await tx.membership.update({
        where: { id },
        data: { role },
        select: membershipWithUserSelect,
      });
      await throwIfTooFewAcceptedOwners(tx, teamId, ownersGuard);
      return membership;
    });
  }

  async findAssignAllTeamMembersEventTypesByTeamId({
    teamId,
  }: {
    teamId: number;
  }): Promise<{ id: number; schedulingType: SchedulingType | null }[]> {
    return this.prismaClient.eventType.findMany({
      where: { teamId, assignAllTeamMembers: true },
      select: { id: true, schedulingType: true },
    });
  }

  async createHosts({ hosts }: { hosts: TeamMembershipHostInput[] }): Promise<void> {
    await this.prismaClient.host.createMany({ data: hosts, skipDuplicates: true });
  }

  async updateAcceptedIncludeHosts({
    id,
    hosts,
  }: {
    id: number;
    hosts: TeamMembershipHostInput[];
  }): Promise<TeamMembershipRecord> {
    return this.prismaClient.$transaction(async (tx) => {
      const membership = await tx.membership.update({
        where: { id },
        data: { accepted: true },
        select: membershipSelect,
      });
      if (hosts.length > 0) {
        await tx.host.createMany({ data: hosts, skipDuplicates: true });
      }
      return membership;
    });
  }

  async deleteById({ id }: { id: number }): Promise<void> {
    await this.prismaClient.membership.delete({ where: { id } });
  }

  /**
   * Deletes the membership together with everything that assigns the user to the team's event types:
   * host rows, the `users` relation and managed child event types.
   */
  async deleteByIdIncludeTeamEventTypeAssignments({
    id,
    userId,
    teamId,
    ownersGuard,
  }: {
    id: number;
    userId: number;
    teamId: number;
    ownersGuard?: AcceptedOwnersGuard;
  }): Promise<void> {
    await this.prismaClient.$transaction(async (tx) => {
      if (ownersGuard) {
        await lockAcceptedOwners(tx, teamId);
      }

      await tx.host.deleteMany({
        where: { userId, eventType: { teamId } },
      });

      const assignedEventTypes = await tx.eventType.findMany({
        where: { teamId, users: { some: { id: userId } } },
        select: { id: true },
      });

      if (assignedEventTypes.length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            eventTypes: {
              disconnect: assignedEventTypes.map(({ id: eventTypeId }) => ({ id: eventTypeId })),
            },
          },
          select: { id: true },
        });
      }

      await tx.eventType.deleteMany({
        where: { userId, parent: { teamId } },
      });

      await tx.membership.delete({ where: { id } });

      if (ownersGuard) {
        await throwIfTooFewAcceptedOwners(tx, teamId, ownersGuard);
      }
    });
  }
}
