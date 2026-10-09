import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TeamDto, TeamWithMembershipDto } from "@calcom/features/teams/lib/types";
import type { TrpcSessionUser } from "../../../types";
import type { TCreateTeamInputSchema, TTeamIdInputSchema, TUpdateTeamInputSchema } from "./teams.schema";

type AuthedCtx = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
};

export const listTeamsHandler = async ({ ctx }: AuthedCtx): Promise<TeamWithMembershipDto[]> => {
  return getTeamService().listTeamsForUser(ctx.user.id);
};

export const getTeamHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TTeamIdInputSchema }): Promise<TeamWithMembershipDto> => {
  return getTeamService().getTeam(input.teamId, ctx.user.id);
};

export const createTeamHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TCreateTeamInputSchema }): Promise<TeamDto> => {
  return getTeamService().createTeam(ctx.user.id, input);
};

export const updateTeamHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TUpdateTeamInputSchema }): Promise<TeamDto> => {
  const { teamId, ...data } = input;
  return getTeamService().updateTeam(teamId, ctx.user.id, data);
};

export const deleteTeamHandler = async ({
  ctx,
  input,
}: AuthedCtx & { input: TTeamIdInputSchema }): Promise<{ id: number }> => {
  return getTeamService().deleteTeam(input.teamId, ctx.user.id);
};
