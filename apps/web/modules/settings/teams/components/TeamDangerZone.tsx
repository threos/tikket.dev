"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import type { TeamRoleDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { canDeleteTeam, canLeaveTeam } from "../lib/teamPermissions";

type TeamDangerZoneProps = {
  teamId: number;
  teamName: string;
  role: TeamRoleDto;
  // null when the roster isn't visible to us, in which case the server decides whether we can leave.
  acceptedOwnerCount: number | null;
};

export function TeamDangerZone({ teamId, teamName, role, acceptedOwnerCount }: TeamDangerZoneProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [openDialog, setOpenDialog] = useState<"delete" | "leave" | null>(null);

  const onDone = async (message: string) => {
    await utils.viewer.teams.list.invalidate();
    showToast(message, "success");
    setOpenDialog(null);
    router.push("/settings/teams");
  };

  const onError = (error: { message: string }) => {
    showToast(error.message || t("something_went_wrong"), "error");
  };

  const deleteTeam = trpc.viewer.teams.delete.useMutation({
    onSuccess: () => onDone(t("your_team_disbanded_successfully")),
    onError,
  });

  const leaveTeam = trpc.viewer.teams.leave.useMutation({
    onSuccess: () => onDone(t("team_left_successfully", { teamName })),
    onError,
  });

  const isOwner = canDeleteTeam(role);
  const leaveAllowed = canLeaveTeam(role, acceptedOwnerCount);

  const leaveButton = (
    <Button
      color={isOwner ? "secondary" : "destructive"}
      StartIcon="log-out"
      disabled={!leaveAllowed}
      onClick={() => setOpenDialog("leave")}
      data-testid="leave-team-button">
      {t("leave_team")}
    </Button>
  );

  return (
    <section className="mt-6" data-testid="team-danger-zone">
      <div className="border-subtle rounded-t-lg border border-b-0 p-6">
        <Label className="mb-0 text-base font-semibold text-red-700 dark:text-red-400">
          {t("danger_zone")}
        </Label>
        <p className="text-subtle text-sm">
          {isOwner ? t("team_deletion_cannot_be_undone") : t("team_leave_description")}
        </p>
      </div>
      <SectionBottomActions align="end" className="gap-2">
        {leaveAllowed ? (
          leaveButton
        ) : (
          <Tooltip content={t("team_last_owner_cannot_leave")}>
            {/* Disabled buttons don't emit pointer events, so the tooltip needs a wrapper to anchor to. */}
            <span tabIndex={0}>{leaveButton}</span>
          </Tooltip>
        )}
        {isOwner && (
          <Button
            color="destructive"
            StartIcon="trash-2"
            onClick={() => setOpenDialog("delete")}
            data-testid="disband-team-button">
            {t("disband_team")}
          </Button>
        )}
      </SectionBottomActions>

      <Dialog open={openDialog === "delete"} onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("disband_team")}
          confirmBtnText={t("confirm_disband_team")}
          loadingText={t("confirm_disband_team")}
          isPending={deleteTeam.isPending}
          onConfirm={(event) => {
            event.preventDefault();
            deleteTeam.mutate({ teamId });
          }}>
          <p className="mt-2">{t("disband_team_confirmation_message")}</p>
        </ConfirmationDialogContent>
      </Dialog>

      <Dialog open={openDialog === "leave"} onOpenChange={(open) => setOpenDialog(open ? "leave" : null)}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("leave_team")}
          confirmBtnText={t("confirm_leave_team")}
          loadingText={t("confirm_leave_team")}
          isPending={leaveTeam.isPending}
          onConfirm={(event) => {
            event.preventDefault();
            leaveTeam.mutate({ teamId });
          }}>
          <p className="mt-2">{t("leave_team_confirmation_message")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </section>
  );
}
