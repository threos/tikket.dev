import type { PrismaClient } from "@calcom/prisma/client";

export class VerificationTokenRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create({
    identifier,
    token,
    expires,
    expiresInDays,
    teamId,
  }: {
    identifier: string;
    token: string;
    expires: Date;
    expiresInDays: number;
    teamId: number;
  }): Promise<{ id: number; token: string }> {
    return this.prismaClient.verificationToken.create({
      data: { identifier, token, expires, expiresInDays, teamId },
      select: { id: true, token: true },
    });
  }
}
