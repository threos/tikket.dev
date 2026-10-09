import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/team/[slug]/getServerSideProps";
import type { PageProps as ServerPageProps } from "app/_types";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { cookies, headers } from "next/headers";
import TeamPublicView, { type PageProps as ClientPageProps } from "~/team/views/team-public-view";

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
    },
  };
};

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  return <TeamPublicView {...props} />;
};

export default ServerPage;
