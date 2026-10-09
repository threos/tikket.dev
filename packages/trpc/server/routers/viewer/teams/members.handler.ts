import { getTeamMembershipService } from "@calcom/features/teams/di/TeamMembershipService.container";
import type { TeamInviteResultDto, TeamMemberDto } from "@calcom/features/teams/lib/types";
import type { TrpcSessionUser } from "../../../types";
import type {
  TChangeMemberRoleInputSchema,
  TInviteMemberInputSchema,
  TRemoveMemberInputSchema,
  TTeamIdInputSchema,
} from "./teams.schema";

type AuthedCtx = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
};

type Success = { success: true };

export const listMembersHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TTeamIdInputSchema }): Promise<TeamMemberDto[]> => {
  return getTeamMembershipService().listMembers(input.teamId, ctx.user.id);
};

export const inviteMemberHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TInviteMemberInputSchema }): Promise<TeamInviteResultDto> => {
  return getTeamMembershipService().inviteMember(input.teamId, ctx.user.id, {
    emailOrUsername: input.emailOrUsername,
    role: input.role,
  });
};

export const changeMemberRoleHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TChangeMemberRoleInputSchema }): Promise<TeamMemberDto> => {
  return getTeamMembershipService().changeMemberRole(input.teamId, ctx.user.id, input.userId, input.role);
};

export const removeMemberHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TRemoveMemberInputSchema }): Promise<Success> => {
  return getTeamMembershipService().removeMember(input.teamId, ctx.user.id, input.userId);
};

export const acceptInviteHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TTeamIdInputSchema }): Promise<Success> => {
  return getTeamMembershipService().acceptInvite(input.teamId, ctx.user.id);
};

export const declineInviteHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TTeamIdInputSchema }): Promise<Success> => {
  return getTeamMembershipService().declineInvite(input.teamId, ctx.user.id);
};

export const leaveTeamHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TTeamIdInputSchema }): Promise<Success> => {
  return getTeamMembershipService().leaveTeam(input.teamId, ctx.user.id);
};
