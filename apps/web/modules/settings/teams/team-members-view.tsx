"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { InviteMemberDialog } from "./components/InviteMemberDialog";
import { MemberList } from "./components/MemberList";
import { TeamQueryError } from "./components/TeamQueryError";
import { TeamRowsSkeleton } from "./components/TeamsSkeletons";
import { canInviteMembers } from "./lib/teamPermissions";

type TeamMembersViewProps = {
  teamId: number;
  openInviteDialogOnMount?: boolean;
};

export default function TeamMembersView({ teamId, openInviteDialogOnMount = false }: TeamMembersViewProps) {
  const { t } = useLocale();
  const session = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(openInviteDialogOnMount);

  const teamQuery = trpc.viewer.teams.get.useQuery({ teamId });
  const membersQuery = trpc.viewer.teams.listMembers.useQuery({ teamId }, { enabled: !!teamQuery.data });

  const team = teamQuery.data;
  const actorRole = team?.accepted ? team.role : null;
  const actorUserId = session.data?.user?.id ?? null;
  const canInvite = canInviteMembers(actorRole);

  let headerDescription: string | undefined;
  if (team) headerDescription = t("team_members_page_description", { teamName: team.name });
  else if (teamQuery.error) headerDescription = t("add_team_members_description");

  const renderBody = () => {
    if (teamQuery.error) return <TeamQueryError error={teamQuery.error} />;
    if (membersQuery.error) {
      return <TeamQueryError error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />;
    }
    if (!team || !membersQuery.data) return <TeamRowsSkeleton />;

    // The server only returns a plain member's own row for private teams.
    const isRosterHidden = team.isPrivate && actorRole === "MEMBER";

    return (
      <div className="border-subtle rounded-b-lg border border-t-0">
        {isRosterHidden && (
          <div className="border-subtle border-b px-4 py-3 sm:px-6" data-testid="private-team-roster-notice">
            <Alert severity="info" title={t("team_is_private")} message={t("you_cannot_see_team_members")} />
          </div>
        )}
        <div className="border-subtle border-b px-4 py-3 sm:px-6">
          <TextField
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("team_search_members")}
            addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
            containerClassName="max-w-sm"
            data-testid="team-member-search"
          />
        </div>
        <MemberList
          teamId={teamId}
          members={membersQuery.data}
          actorRole={actorRole}
          actorUserId={actorUserId}
          searchQuery={searchQuery}
        />
      </div>
    );
  };

  return (
    <SettingsHeader
      title={t("team_members")}
      description={headerDescription}
      borderInShellHeader={true}
      CTA={
        canInvite ? (
          <Button
            color="secondary"
            StartIcon="user-plus"
            size="sm"
            variant="fab"
            onClick={() => setIsInviteDialogOpen(true)}
            data-testid="invite-member-button">
            {t("invite")}
          </Button>
        ) : null
      }>
      {renderBody()}
      {team && actorRole && canInvite && (
        <InviteMemberDialog
          teamId={teamId}
          teamName={team.name}
          actorRole={actorRole}
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />
      )}
    </SettingsHeader>
  );
}
