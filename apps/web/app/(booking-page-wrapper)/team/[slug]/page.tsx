import { WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/team/[slug]/getServerSideProps";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { PageProps as TeamPageProps } from "~/team/views/team-public-view";
import TeamPublicView from "~/team/views/team-public-view";

const getData = withAppDirSsr<TeamPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <TeamPublicView {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const { team, markdownStrippedBio } = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const meeting = {
    title: markdownStrippedBio,
    profile: { name: team.name, image: getPlaceholderAvatar(team.logoUrl, team.name) },
    users: team.members.map((member) => ({
      username: `${member.username ?? ""}`,
      name: `${member.name ?? ""}`,
    })),
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    () => team.name,
    () => markdownStrippedBio,
    team.hideBranding,
    WEBAPP_URL,
    `/team/${team.slug}`
  );

  return {
    ...metadata,
    robots: {
      follow: !team.isPrivate,
      index: !team.isPrivate,
    },
  };
};

export default ServerPage;
