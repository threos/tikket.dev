import { loadTranslations } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/team/[slug]/[type]/getServerSideProps";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { PageProps as TeamTypePageProps } from "~/team/views/team-type-public-view";
import TeamTypePublicView from "~/team/views/team-type-public-view";

const getData = withAppDirSsr<TeamTypePageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const locale = props.eventData.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <TeamTypePublicView {...props} />
      </CustomI18nProvider>
    );
  }

  return <TeamTypePublicView {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const { booking, eventData, isBrandingHidden, isSEOIndexable, teamSlug, slug } = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const rescheduleUid = booking?.uid;
  const profileName = eventData.profile?.name ?? "";
  const title = eventData.title ?? "";
  const meeting = {
    title,
    profile: { name: profileName, image: eventData.profile.image },
    users: eventData.subsetOfUsers.map((user) => ({
      name: `${user.name}`,
      username: `${user.username}`,
    })),
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden,
    WEBAPP_URL,
    `/team/${teamSlug}/${slug}`
  );

  return {
    ...metadata,
    robots: {
      follow: isSEOIndexable,
      index: isSEOIndexable,
    },
  };
};

export default ServerPage;
