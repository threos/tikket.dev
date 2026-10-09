import type { Prisma, PrismaClient } from "@calcom/prisma/client";

const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const publicTeamSelect = {
  id: true,
  name: true,
  slug: true,
  bio: true,
  logoUrl: true,
  isPrivate: true,
  hideBranding: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  members: {
    where: { accepted: true },
    select: { user: { select: publicUserSelect } },
    orderBy: { id: "asc" },
  },
  eventTypes: {
    where: { hidden: false },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      length: true,
      schedulingType: true,
      hosts: {
        select: { user: { select: publicUserSelect } },
      },
    },
    orderBy: [{ position: "desc" }, { id: "asc" }],
  },
} satisfies Prisma.TeamSelect;

export type PublicTeamRecord = Prisma.TeamGetPayload<{ select: typeof publicTeamSelect }>;

export class PublicTeamRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findBySlugIncludePublicEventTypesAndMembers({
    slug,
  }: {
    slug: string;
  }): Promise<PublicTeamRecord | null> {
    // Sub-team slugs are only unique inside their organization, so public URLs resolve top-level teams only.
    return this.prismaClient.team.findFirst({
      where: { slug, parentId: null, isOrganization: false },
      select: publicTeamSelect,
    });
  }
}
