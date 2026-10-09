import type { Prisma, PrismaClient } from "@calcom/prisma/client";

const userLookupSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  locale: true,
} satisfies Prisma.UserSelect;

export type UserLookupRecord = Prisma.UserGetPayload<{ select: typeof userLookupSelect }>;

export class UserLookupRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findById({ id }: { id: number }): Promise<UserLookupRecord | null> {
    return this.prismaClient.user.findUnique({
      where: { id },
      select: userLookupSelect,
    });
  }

  async findByEmail({ email }: { email: string }): Promise<UserLookupRecord | null> {
    return this.prismaClient.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: userLookupSelect,
    });
  }

  /** Looks up a username in the global (non-organization) namespace. */
  async findByUsername({ username }: { username: string }): Promise<UserLookupRecord | null> {
    return this.prismaClient.user.findFirst({
      where: { username, organizationId: null },
      select: userLookupSelect,
    });
  }
}
