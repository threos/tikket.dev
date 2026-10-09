"use client";

import type { TeamWithMembershipDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";
import { VerticalTabItem } from "@calcom/ui/components/navigation";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { TeamAvatar } from "./TeamAvatar";

const CHILD_ITEM_CLASS = "h-auto min-h-7 w-fit px-2! py-1!";
const CHILD_TEXT_CLASS = "text-emphasis font-medium text-sm";

function isTeamPath(pathname: string | null, teamId: number) {
  return !!pathname?.startsWith(`/settings/teams/${teamId}/`);
}

function TeamSidebarGroup({ team, defaultOpen }: { team: TeamWithMembershipDto; defaultOpen: boolean }) {
  const pathname = usePathname();
  const childrenId = useId();
  const isCurrentTeam = isTeamPath(pathname, team.id);
  const [isOpen, setIsOpen] = useState(defaultOpen || isCurrentTeam);

  useEffect(() => {
    if (isCurrentTeam) setIsOpen(true);
  }, [isCurrentTeam]);

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={childrenId}
        onClick={() => setIsOpen((open) => !open)}
        className="hover:bg-subtle text-emphasis focus-visible:ring-emphasis ml-7 flex min-h-7 w-[calc(100%-1.75rem)] items-center gap-2 rounded-md px-2 py-1 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2"
        data-testid={`settings-sidebar-team-${team.id}`}>
        <TeamAvatar name={team.name} logoUrl={team.logoUrl} size="xs" />
        <span className="min-w-0 flex-1 truncate">{team.name}</span>
        <Icon
          name="chevron-right"
          aria-hidden="true"
          className={classNames(
            "text-subtle h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none",
            isOpen && "rotate-90"
          )}
        />
      </button>
      {isOpen && (
        <div id={childrenId} className="mt-1 flex flex-col space-y-1">
          <VerticalTabItem
            name="profile"
            href={`/settings/teams/${team.id}/profile`}
            textClassNames={CHILD_TEXT_CLASS}
            className={classNames(CHILD_ITEM_CLASS, "ml-12")}
            trackingMetadata={{ section: "teams", page: "profile" }}
            disableChevron
          />
          <VerticalTabItem
            name="members"
            href={`/settings/teams/${team.id}/members`}
            textClassNames={CHILD_TEXT_CLASS}
            className={classNames(CHILD_ITEM_CLASS, "ml-12")}
            trackingMetadata={{ section: "teams", page: "members" }}
            disableChevron
          />
        </div>
      )}
    </div>
  );
}

export function TeamsSettingsSidebarSection() {
  const { t } = useLocale();
  const pathname = usePathname();
  const { data: teams, isPending } = trpc.viewer.teams.list.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });

  const acceptedTeams = teams?.filter((team) => team.accepted) ?? [];
  const pendingInviteCount = teams?.filter((team) => !team.accepted).length ?? 0;

  return (
    <div data-testid="settings-sidebar-teams">
      <div className="group flex h-7 w-full flex-row items-center rounded-md px-2 font-medium text-default text-sm leading-none">
        <Icon name="users" className="h-[16px] w-[16px] stroke-[2px] text-subtle md:mt-0 ltr:mr-3 rtl:ml-3" />
        <p className="truncate font-medium text-sm text-subtle leading-5">{t("teams")}</p>
      </div>
      <div className="mb-3 flex flex-col space-y-1">
        <div className="flex items-start gap-2">
          {/* VerticalTabItem matches by substring, which would keep this highlighted on every team page. */}
          <Link
            href="/settings/teams"
            aria-current={pathname === "/settings/teams" ? "page" : undefined}
            className="hover:bg-subtle [&[aria-current='page']]:bg-subtle [&[aria-current='page']]:text-emphasis text-emphasis ml-7 flex h-auto min-h-7 w-fit flex-row items-center rounded-md px-2 py-1 text-sm font-medium transition"
            data-testid="vertical-tab-all_teams">
            {t("all_teams")}
          </Link>
          {pendingInviteCount > 0 && (
            <Badge variant="orange" className="mt-1 text-xs">
              <span aria-hidden="true">{pendingInviteCount}</span>
              <span className="sr-only">
                {t("team_pending_invites_count", { count: pendingInviteCount })}
              </span>
            </Badge>
          )}
        </div>
        {isPending ? (
          <div className="ml-9 space-y-2 py-1" aria-hidden="true">
            <SkeletonText className="h-4 w-28" />
          </div>
        ) : (
          acceptedTeams.map((team) => (
            <TeamSidebarGroup key={team.id} team={team} defaultOpen={acceptedTeams.length === 1} />
          ))
        )}
        <VerticalTabItem
          name="add_a_team"
          href="/settings/teams?create=1"
          icon="plus"
          isChild
          textClassNames="text-subtle font-medium text-sm"
          className={CHILD_ITEM_CLASS}
          trackingMetadata={{ section: "teams", page: "add_a_team" }}
          disableChevron
        />
      </div>
    </div>
  );
}
