"use client";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { useBrandColors } from "@calcom/features/bookings/Booker/utils/use-brand-colors";
import type { PublicTeamEventTypeDto, PublicTeamMemberDto } from "@calcom/features/teams/lib/types";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { Avatar, AvatarGroup } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";
import EmptyPage from "@calcom/web/modules/event-types/components/EmptyPage";
import type { TeamPublicPageProps } from "@server/lib/team/[slug]/getServerSideProps";
import classNames from "classnames";
import Link from "next/link";
import { Toaster } from "sonner";

export type PageProps = TeamPublicPageProps;

function toAvatarItems(members: PublicTeamMemberDto[]) {
  return members.map((member) => ({
    image: getUserAvatarUrl({ avatarUrl: member.avatarUrl }),
    alt: member.name ?? member.username ?? "",
    title: member.name ?? member.username ?? "",
  }));
}

function SchedulingTypeBadge({
  schedulingType,
}: {
  schedulingType: PublicTeamEventTypeDto["schedulingType"];
}) {
  const { t } = useLocale();
  if (schedulingType === "ROUND_ROBIN") {
    return (
      <Badge variant="gray" startIcon="users">
        {t("round_robin")}
      </Badge>
    );
  }
  if (schedulingType === "COLLECTIVE") {
    return (
      <Badge variant="gray" startIcon="users">
        {t("collective")}
      </Badge>
    );
  }
  return null;
}

export function TeamPublicView({ team, safeBio, descriptionsAsSafeHTML, isEmbed: isEmbedProp }: PageProps) {
  const { t } = useLocale();
  useBrandColors({
    brandColor: team.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    darkBrandColor: team.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
    theme: team.theme,
  });

  const isEmbed = useIsEmbed(isEmbedProp);
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const {
    // Route params must not leak into the event type links.
    slug: _slug,
    ...query
  } = useRouterQuery();

  const isBioEmpty = !safeBio || !safeBio.replace("<p><br></p>", "").length;
  const isEventListEmpty = team.eventTypes.length === 0;

  return (
    <>
      <div className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "max-w-3xl" : "")}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width  bg-default rounded-md" : "",
            "max-w-3xl px-4 py-12"
          )}>
          <div
            className="border-subtle bg-default text-default mb-8 overflow-hidden rounded-xl border"
            data-testid="team-profile">
            <div className="p-4">
              <Avatar size="lg" alt={team.name} imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)} />
              <h1 className="font-cal text-emphasis mt-4 mb-1 text-xl" data-testid="team-name">
                {team.name}
              </h1>
              {!isBioEmpty && (
                <>
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via markdownToSafeHTML */}
                  <div
                    className="text-default wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                    dangerouslySetInnerHTML={{ __html: safeBio }}
                  />
                </>
              )}
              {team.members.length > 0 && (
                <div className="mt-4" data-testid="team-members">
                  <span className="sr-only">{t("team_members")}</span>
                  <AvatarGroup size="sm" truncateAfter={8} items={toAvatarItems(team.members)} />
                </div>
              )}
            </div>
          </div>

          <div
            className={classNames("rounded-md ", !isEventListEmpty && "border-subtle border")}
            data-testid="event-types">
            {team.eventTypes.map((type) => (
              <Link
                key={type.id}
                style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
                prefetch={false}
                href={{
                  pathname: `/team/${team.slug}/${type.slug}`,
                  query,
                }}
                passHref
                onClick={async () => {
                  sdkActionManager?.fire("eventTypeSelected", {
                    eventType: type,
                  });
                }}
                className="bg-default border-subtle dark:bg-cal-muted dark:hover:bg-subtle hover:bg-cal-muted group relative border-b transition first:rounded-t-md last:rounded-b-md last:border-b-0"
                data-testid="event-type-link">
                <Icon
                  name="arrow-right"
                  className="text-emphasis absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                />
                <div className="block w-full p-5">
                  <div className="flex flex-wrap items-center">
                    <h2 className="text-default pr-2 text-sm font-semibold">{type.title}</h2>
                  </div>
                  <div className="text-subtle">
                    {descriptionsAsSafeHTML[type.id] && (
                      <div
                        className="text-subtle line-clamp-4 wrap-break-word py-1 text-sm sm:max-w-[650px] [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600 [&>*:not(:first-child)]:hidden"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via markdownToSafeHTML
                        dangerouslySetInnerHTML={{ __html: descriptionsAsSafeHTML[type.id] }}
                      />
                    )}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <ul className="flex flex-wrap gap-x-2 gap-y-1">
                        <li>
                          <Badge variant="gray" startIcon="clock">
                            {type.length}m
                          </Badge>
                        </li>
                        {type.schedulingType && type.schedulingType !== "MANAGED" && (
                          <li>
                            <SchedulingTypeBadge schedulingType={type.schedulingType} />
                          </li>
                        )}
                      </ul>
                      {type.hosts.length > 0 && (
                        <AvatarGroup size="sm" truncateAfter={4} items={toAvatarItems(type.hosts)} />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {isEventListEmpty && <EmptyPage name={team.name} />}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}

export default TeamPublicView;
