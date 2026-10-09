import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { parseTeamIdParam } from "~/settings/teams/lib/teamUtils";
import TeamProfileView from "~/settings/teams/team-profile-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/profile`
  );

const Page = async ({ params }: PageProps) => {
  const teamId = parseTeamIdParam((await params).id);
  if (!teamId) notFound();

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/settings/teams/${teamId}/profile`);
  }

  // Membership and role checks happen in the viewer.teams router; the view renders its errors.
  return <TeamProfileView teamId={teamId} />;
};

export default Page;
