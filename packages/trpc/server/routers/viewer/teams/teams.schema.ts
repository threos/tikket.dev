import { z } from "zod";

const ZTeamRole = z.enum(["MEMBER", "ADMIN", "OWNER"]);

export const ZTeamIdInputSchema = z.object({
  teamId: z.number().int().positive(),
});
export type TTeamIdInputSchema = z.infer<typeof ZTeamIdInputSchema>;

export const ZCreateTeamInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
});
export type TCreateTeamInputSchema = z.infer<typeof ZCreateTeamInputSchema>;

export const ZUpdateTeamInputSchema = ZTeamIdInputSchema.extend({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(100).optional(),
  bio: z.string().max(1000).nullable().optional(),
  isPrivate: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  rrResetInterval: z.enum(["MONTH", "DAY"]).optional(),
  rrTimestampBasis: z.enum(["CREATED_AT", "START_TIME"]).optional(),
});
export type TUpdateTeamInputSchema = z.infer<typeof ZUpdateTeamInputSchema>;

export const ZInviteMemberInputSchema = ZTeamIdInputSchema.extend({
  emailOrUsername: z.string().trim().min(1).max(254),
  role: ZTeamRole.default("MEMBER"),
});
export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;

export const ZChangeMemberRoleInputSchema = ZTeamIdInputSchema.extend({
  userId: z.number().int().positive(),
  role: ZTeamRole,
});
export type TChangeMemberRoleInputSchema = z.infer<typeof ZChangeMemberRoleInputSchema>;

export const ZRemoveMemberInputSchema = ZTeamIdInputSchema.extend({
  userId: z.number().int().positive(),
});
export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
