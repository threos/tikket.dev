"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import type { TeamWithMembershipDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { useEffect, useState } from "react";
import { RoundRobinSettingsSection } from "./components/RoundRobinSettingsSection";
import { TeamDangerZone } from "./components/TeamDangerZone";
import { TeamProfileForm } from "./components/TeamProfileForm";
import { TeamQueryError } from "./components/TeamQueryError";
import { TeamFormSkeleton } from "./components/TeamsSkeletons";
import { useUpdateTeam } from "./hooks/useUpdateTeam";
import { canEditTeam, countAcceptedOwners } from "./lib/teamPermissions";

export default function TeamProfileView({ teamId }: { teamId: number }) {
  const { t } = useLocale();
  const teamQuery = trpc.viewer.teams.get.useQuery({ teamId });
  const team = teamQuery.data;

  return (
    <SettingsHeader
      title={t("profile")}
      description={team || teamQuery.error ? t("profile_team_description") : undefined}
      borderInShellHeader={true}>
      {teamQuery.error && <TeamQueryError error={teamQuery.error} />}
      {!teamQuery.error && team && <TeamProfileSections team={team} />}
      {!teamQuery.error && !team && <TeamFormSkeleton />}
    </SettingsHeader>
  );
}

function TeamProfileSections({ team }: { team: TeamWithMembershipDto }) {
  const actorRole = team.accepted ? team.role : null;
  const canEdit = canEditTeam(actorRole);
  // Only used to tell the last owner they can't leave; a forbidden roster just leaves it unknown.
  const membersQuery = trpc.viewer.teams.listMembers.useQuery(
    { teamId: team.id },
    { enabled: actorRole === "OWNER", retry: false }
  );
  const acceptedOwnerCount = membersQuery.data ? countAcceptedOwners(membersQuery.data) : null;

  return (
    <>
      <TeamProfileForm team={team} canEdit={canEdit} />
      <TeamVisibilityToggles team={team} canEdit={canEdit} />
      <RoundRobinSettingsSection team={team} canEdit={canEdit} />
      {actorRole && (
        <TeamDangerZone
          teamId={team.id}
          teamName={team.name}
          role={actorRole}
          acceptedOwnerCount={acceptedOwnerCount}
        />
      )}
    </>
  );
}

function TeamVisibilityToggles({ team, canEdit }: { team: TeamWithMembershipDto; canEdit: boolean }) {
  const { t } = useLocale();
  const [isPrivate, setIsPrivate] = useState(team.isPrivate);
  const [hideBookATeamMember, setHideBookATeamMember] = useState(team.hideBookATeamMember);

  useEffect(() => {
    setIsPrivate(team.isPrivate);
    setHideBookATeamMember(team.hideBookATeamMember);
  }, [team.isPrivate, team.hideBookATeamMember]);

  // Optimistic toggles: roll back to the server value if the save fails.
  const updateTeam = useUpdateTeam(team.id, {
    onError: () => {
      setIsPrivate(team.isPrivate);
      setHideBookATeamMember(team.hideBookATeamMember);
    },
  });

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("make_team_private")}
        description={t("make_team_private_description")}
        disabled={!canEdit || updateTeam.isPending}
        checked={isPrivate}
        onCheckedChange={(checked) => {
          setIsPrivate(checked);
          updateTeam.mutate({ teamId: team.id, isPrivate: checked });
        }}
        switchContainerClassName="mt-6"
        data-testid="make-team-private-toggle"
      />
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("hide_book_a_team_member")}
        description={t("hide_book_a_team_member_description")}
        disabled={!canEdit || updateTeam.isPending}
        checked={hideBookATeamMember}
        onCheckedChange={(checked) => {
          setHideBookATeamMember(checked);
          updateTeam.mutate({ teamId: team.id, hideBookATeamMember: checked });
        }}
        switchContainerClassName="mt-6"
        data-testid="hide-book-team-member-toggle"
      />
    </>
  );
}
