"use client";

import type { TeamWithMembershipDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useState } from "react";
import { canEditTeam } from "../lib/teamPermissions";
import { getTeamPublicUrl, getTeamUrlPrefix } from "../lib/teamUtils";
import { RoleBadge } from "./RoleBadge";
import { TeamAvatar } from "./TeamAvatar";

export function TeamListItem({ team }: { team: TeamWithMembershipDto }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const settingsHref = `/settings/teams/${team.id}/profile`;

  const leaveTeam = trpc.viewer.teams.leave.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("team_left_successfully", { teamName: team.name }), "success");
      setIsLeaveDialogOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  return (
    <li
      className="hover:bg-cal-muted group relative flex items-center justify-between gap-3 px-4 py-4 transition-colors sm:px-6"
      data-testid={`team-list-item-${team.id}`}>
      <div className="flex min-w-0 items-center gap-3">
        <TeamAvatar name={team.name} logoUrl={team.logoUrl} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* The stretched link makes the whole row clickable while the actions menu stays separately focusable. */}
            <Link
              href={settingsHref}
              className="text-emphasis focus-visible:ring-emphasis truncate rounded-sm text-sm font-semibold after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2">
              {team.name}
            </Link>
            <RoleBadge role={team.role} />
          </div>
          <p className="text-subtle truncate text-sm">
            {team.slug ? `${getTeamUrlPrefix()}${team.slug}` : t("team_slug_pending")}
            <span aria-hidden="true"> · </span>
            {t("number_member", { count: team.memberCount })}
          </p>
        </div>
      </div>

      <div className="relative z-10 shrink-0">
        <Dropdown modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="icon"
              color="secondary"
              StartIcon="ellipsis"
              aria-label={t("team_actions", { teamName: team.name })}
              data-testid={`team-actions-${team.id}`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <DropdownItem type="button" StartIcon="settings" href={settingsHref}>
                {canEditTeam(team.role) ? t("edit") : t("profile")}
              </DropdownItem>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DropdownItem type="button" StartIcon="users" href={`/settings/teams/${team.id}/members`}>
                {t("members")}
              </DropdownItem>
            </DropdownMenuItem>
            {team.slug && (
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  StartIcon="external-link"
                  href={getTeamPublicUrl(team.slug)}
                  target="_blank"
                  rel="noreferrer">
                  {t("view_public_page")}
                </DropdownItem>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <DropdownItem
                type="button"
                color="destructive"
                StartIcon="log-out"
                onClick={() => setIsLeaveDialogOpen(true)}>
                {t("leave_team")}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>

      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("leave_team")}
          confirmBtnText={t("confirm_leave_team")}
          loadingText={t("confirm_leave_team")}
          isPending={leaveTeam.isPending}
          onConfirm={(event) => {
            event.preventDefault();
            leaveTeam.mutate({ teamId: team.id });
          }}>
          <p className="mt-2">{t("leave_team_confirmation_message")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </li>
  );
}
