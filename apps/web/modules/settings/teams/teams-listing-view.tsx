"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { useState } from "react";
import { CreateTeamDialog } from "./components/CreateTeamDialog";
import { PendingInvitesSection } from "./components/PendingInvitesSection";
import { TeamListItem } from "./components/TeamListItem";
import { TeamQueryError } from "./components/TeamQueryError";
import { TeamRowsSkeleton } from "./components/TeamsSkeletons";

type TeamsListingViewProps = {
  openCreateDialogOnMount?: boolean;
};

export default function TeamsListingView({ openCreateDialogOnMount = false }: TeamsListingViewProps) {
  const { t } = useLocale();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(openCreateDialogOnMount);
  const { data: teams, isPending, error, refetch } = trpc.viewer.teams.list.useQuery();

  const pendingInvites = teams?.filter((team) => !team.accepted) ?? [];
  const acceptedTeams = teams?.filter((team) => team.accepted) ?? [];

  const openCreateDialog = () => setIsCreateDialogOpen(true);

  const renderBody = () => {
    if (isPending) return <TeamRowsSkeleton />;
    if (error) return <TeamQueryError error={error} onRetry={() => void refetch()} />;

    if (!pendingInvites.length && !acceptedTeams.length) {
      return (
        <EmptyScreen
          Icon="users"
          headline={t("no_teams")}
          description={t("create_team_to_get_started")}
          className="rounded-b-lg rounded-t-none border-t-0"
          buttonRaw={
            <Button StartIcon="plus" onClick={openCreateDialog} data-testid="empty-create-team">
              {t("create_team")}
            </Button>
          }
        />
      );
    }

    return (
      <div className="border-subtle overflow-hidden rounded-b-lg border border-t-0">
        {pendingInvites.length > 0 && <PendingInvitesSection invites={pendingInvites} />}
        {acceptedTeams.length > 0 ? (
          <ul className="divide-subtle divide-y" aria-label={t("teams")} data-testid="teams-list">
            {acceptedTeams.map((team) => (
              <TeamListItem key={team.id} team={team} />
            ))}
          </ul>
        ) : (
          <EmptyScreen
            Icon="users"
            headline={t("no_teams")}
            description={t("team_accept_invite_or_create")}
            border={false}
            buttonRaw={
              <Button color="secondary" StartIcon="plus" onClick={openCreateDialog}>
                {t("create_team")}
              </Button>
            }
          />
        )}
      </div>
    );
  };

  return (
    <SettingsHeader
      title={t("teams")}
      description={t("create_manage_teams_collaborative")}
      borderInShellHeader={true}
      CTA={
        <Button
          color="secondary"
          StartIcon="plus"
          size="sm"
          variant="fab"
          onClick={openCreateDialog}
          data-testid="new-team-button">
          {t("new_team")}
        </Button>
      }>
      {renderBody()}
      <CreateTeamDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </SettingsHeader>
  );
}
