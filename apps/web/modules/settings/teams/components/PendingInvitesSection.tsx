"use client";

import type { TeamWithMembershipDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { useId } from "react";
import { TEAM_ROLE_LABEL_KEY } from "../lib/teamUtils";
import { TeamAvatar } from "./TeamAvatar";

export function PendingInvitesSection({ invites }: { invites: TeamWithMembershipDto[] }) {
  const { t } = useLocale();
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="border-subtle border-b"
      data-testid="pending-invites-section">
      <h2 id={headingId} className="text-emphasis bg-cal-muted px-4 pb-2 pt-4 text-sm font-semibold sm:px-6">
        {t("pending_invites")}
      </h2>
      <ul className="divide-subtle bg-cal-muted divide-y">
        {invites.map((invite) => (
          <PendingInviteRow key={invite.id} invite={invite} />
        ))}
      </ul>
    </section>
  );
}

function PendingInviteRow({ invite }: { invite: TeamWithMembershipDto }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const onError = (error: { message: string }) => {
    showToast(error.message || t("something_went_wrong"), "error");
  };

  const acceptInvite = trpc.viewer.teams.acceptInvite.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("team_invite_accepted", { teamName: invite.name }), "success");
    },
    onError,
  });

  const declineInvite = trpc.viewer.teams.declineInvite.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("team_invite_declined", { teamName: invite.name }), "success");
    },
    onError,
  });

  const isBusy = acceptInvite.isPending || declineInvite.isPending;

  return (
    <li
      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      data-testid={`pending-invite-${invite.id}`}>
      <div className="flex min-w-0 items-center gap-3">
        <TeamAvatar name={invite.name} logoUrl={invite.logoUrl} />
        <div className="min-w-0">
          <p className="text-emphasis truncate text-sm font-semibold">{invite.name}</p>
          <p className="text-subtle text-sm">
            {t("invited_by_team", { teamName: invite.name, role: t(TEAM_ROLE_LABEL_KEY[invite.role]) })}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:justify-end">
        <Button
          color="secondary"
          size="sm"
          disabled={isBusy}
          loading={declineInvite.isPending}
          onClick={() => declineInvite.mutate({ teamId: invite.id })}
          aria-label={t("team_decline_invite_from", { teamName: invite.name })}
          data-testid={`decline-invite-${invite.id}`}>
          {t("decline")}
        </Button>
        <Button
          size="sm"
          disabled={isBusy}
          loading={acceptInvite.isPending}
          onClick={() => acceptInvite.mutate({ teamId: invite.id })}
          aria-label={t("team_accept_invite_from", { teamName: invite.name })}
          data-testid={`accept-invite-${invite.id}`}>
          {t("accept")}
        </Button>
      </div>
    </li>
  );
}
