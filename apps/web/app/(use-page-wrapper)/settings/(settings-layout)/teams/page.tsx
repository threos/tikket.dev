import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import TeamsListingView from "~/settings/teams/teams-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative"),
    undefined,
    undefined,
    "/settings/teams"
  );

const Page = async ({ searchParams }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/settings/teams");
  }

  const { create } = await searchParams;

  return <TeamsListingView openCreateDialogOnMount={create === "1" || create === "true"} />;
};

export default Page;
