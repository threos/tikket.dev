import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import {
  ZChangeMemberRoleInputSchema,
  ZCreateTeamInputSchema,
  ZInviteMemberInputSchema,
  ZRemoveMemberInputSchema,
  ZTeamIdInputSchema,
  ZUpdateTeamInputSchema,
} from "./teams.schema";

export const teamsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { listTeamsHandler } = await import("./teams.handler");
    return listTeamsHandler({ ctx });
  }),
  get: authedProcedure.input(ZTeamIdInputSchema).query(async ({ ctx, input }) => {
    const { getTeamHandler } = await import("./teams.handler");
    return getTeamHandler({ ctx, input });
  }),
  create: authedProcedure.input(ZCreateTeamInputSchema).mutation(async ({ ctx, input }) => {
    const { createTeamHandler } = await import("./teams.handler");
    return createTeamHandler({ ctx, input });
  }),
  update: authedProcedure.input(ZUpdateTeamInputSchema).mutation(async ({ ctx, input }) => {
    const { updateTeamHandler } = await import("./teams.handler");
    return updateTeamHandler({ ctx, input });
  }),
  delete: authedProcedure.input(ZTeamIdInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteTeamHandler } = await import("./teams.handler");
    return deleteTeamHandler({ ctx, input });
  }),
  listMembers: authedProcedure.input(ZTeamIdInputSchema).query(async ({ ctx, input }) => {
    const { listMembersHandler } = await import("./members.handler");
    return listMembersHandler({ ctx, input });
  }),
  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async ({ ctx, input }) => {
    const { inviteMemberHandler } = await import("./members.handler");
    return inviteMemberHandler({ ctx, input });
  }),
  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async ({ ctx, input }) => {
    const { changeMemberRoleHandler } = await import("./members.handler");
    return changeMemberRoleHandler({ ctx, input });
  }),
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async ({ ctx, input }) => {
    const { removeMemberHandler } = await import("./members.handler");
    return removeMemberHandler({ ctx, input });
  }),
  acceptInvite: authedProcedure.input(ZTeamIdInputSchema).mutation(async ({ ctx, input }) => {
    const { acceptInviteHandler } = await import("./members.handler");
    return acceptInviteHandler({ ctx, input });
  }),
  declineInvite: authedProcedure.input(ZTeamIdInputSchema).mutation(async ({ ctx, input }) => {
    const { declineInviteHandler } = await import("./members.handler");
    return declineInviteHandler({ ctx, input });
  }),
  leave: authedProcedure.input(ZTeamIdInputSchema).mutation(async ({ ctx, input }) => {
    const { leaveTeamHandler } = await import("./members.handler");
    return leaveTeamHandler({ ctx, input });
  }),
});
