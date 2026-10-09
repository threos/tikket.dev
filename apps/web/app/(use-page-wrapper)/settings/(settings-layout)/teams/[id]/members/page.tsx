import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { parseTeamIdParam } from "~/settings/teams/lib/teamUtils";
import TeamMembersView from "~/settings/teams/team-members-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("add_team_members_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/members`
  );

const Page = async ({ params, searchParams }: PageProps) => {
  const teamId = parseTeamIdParam((await params).id);
  if (!teamId) notFound();

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/settings/teams/${teamId}/members`);
  }

  const { invite } = await searchParams;

  // Membership and role checks happen in the viewer.teams router; the view renders its errors.
  return <TeamMembersView teamId={teamId} openInviteDialogOnMount={invite === "1" || invite === "true"} />;
};

export default Page;
