"use client";

import type { TeamMemberDto, TeamRoleDto } from "@calcom/features/teams/lib/types";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";
import { useMemo, useState } from "react";
import { countAcceptedOwners, getMemberActions } from "../lib/teamPermissions";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { PendingBadge, RoleBadge } from "./RoleBadge";

type MemberListProps = {
  teamId: number;
  members: TeamMemberDto[];
  actorRole: TeamRoleDto | null;
  actorUserId: number | null;
  searchQuery: string;
};

function matchesQuery(member: TeamMemberDto, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return [member.name, member.email, member.username].some((value) =>
    value?.toLowerCase().includes(normalizedQuery)
  );
}

export function MemberList({ teamId, members, actorRole, actorUserId, searchQuery }: MemberListProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [memberToChangeRole, setMemberToChangeRole] = useState<TeamMemberDto | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberDto | null>(null);

  const acceptedOwnerCount = useMemo(() => countAcceptedOwners(members), [members]);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleMembers = useMemo(
    () => members.filter((member) => matchesQuery(member, normalizedQuery)),
    [members, normalizedQuery]
  );

  const removeMember = trpc.viewer.teams.removeMember.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.viewer.teams.listMembers.invalidate({ teamId }),
        utils.viewer.teams.list.invalidate(),
      ]);
      showToast(t("member_removed"), "success");
      setMemberToRemove(null);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const roleOptionsForDialog = memberToChangeRole
    ? getMemberActions({ actorRole, actorUserId, target: memberToChangeRole, acceptedOwnerCount }).roleOptions
    : [];

  if (!visibleMembers.length) {
    return (
      <p className="text-subtle px-4 py-10 text-center text-sm sm:px-6" role="status">
        {t("no_members_found")}
      </p>
    );
  }

  return (
    <>
      <ul className="divide-subtle divide-y" data-testid="team-member-list">
        {visibleMembers.map((member) => {
          const actions = getMemberActions({ actorRole, actorUserId, target: member, acceptedOwnerCount });
          const isSelf = member.userId === actorUserId;
          const displayName = member.name || member.username || member.email;
          return (
            <li
              key={member.membershipId}
              className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6"
              data-testid={`team-member-${member.userId}`}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  size="mdLg"
                  imageSrc={getUserAvatarUrl({ avatarUrl: member.avatarUrl })}
                  alt={displayName}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-emphasis truncate text-sm font-semibold">
                      {displayName}
                      {isSelf && <span className="text-subtle font-normal"> ({t("you")})</span>}
                    </p>
                    <RoleBadge role={member.role} />
                    {!member.accepted && <PendingBadge />}
                  </div>
                  <p className="text-subtle truncate text-sm">
                    {member.email}
                    {member.username ? ` · ${member.username}` : ""}
                  </p>
                </div>
              </div>
              {(actions.canChangeRole || actions.canRemove) && (
                <Dropdown modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="icon"
                      color="secondary"
                      StartIcon="ellipsis"
                      aria-label={t("team_member_actions", { name: displayName })}
                      data-testid={`member-actions-${member.userId}`}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.canChangeRole && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          StartIcon="shield"
                          onClick={() => setMemberToChangeRole(member)}>
                          {t("change_role")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    {actions.canRemove && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          color="destructive"
                          StartIcon="user-x"
                          onClick={() => setMemberToRemove(member)}>
                          {t("remove_member")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </Dropdown>
              )}
            </li>
          );
        })}
      </ul>

      <ChangeRoleDialog
        teamId={teamId}
        member={memberToChangeRole}
        roleOptions={roleOptionsForDialog}
        onOpenChange={(open) => {
          if (!open) setMemberToChangeRole(null);
        }}
      />

      <Dialog
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null);
        }}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_member")}
          confirmBtnText={t("confirm_remove_member")}
          loadingText={t("confirm_remove_member")}
          isPending={removeMember.isPending}
          onConfirm={(event) => {
            // Keep the dialog open until the server answers so errors are visible in context.
            event.preventDefault();
            if (!memberToRemove) return;
            removeMember.mutate({ teamId, userId: memberToRemove.userId });
          }}>
          <p className="mt-2">
            {t("team_remove_member_confirmation", {
              name: memberToRemove?.name || memberToRemove?.email || "",
            })}
          </p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
