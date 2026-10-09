"use client";

import type { TeamMemberDto, TeamRoleDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect, useId, useState } from "react";
import { RoleRadioGroup } from "./RoleRadioGroup";

type ChangeRoleDialogProps = {
  teamId: number;
  member: TeamMemberDto | null;
  roleOptions: TeamRoleDto[];
  onOpenChange: (open: boolean) => void;
};

export function ChangeRoleDialog({ teamId, member, roleOptions, onOpenChange }: ChangeRoleDialogProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const labelId = useId();
  const [role, setRole] = useState<TeamRoleDto>(member?.role ?? "MEMBER");

  useEffect(() => {
    if (member) setRole(member.role);
  }, [member]);

  const changeRole = trpc.viewer.teams.changeMemberRole.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.viewer.teams.listMembers.invalidate({ teamId }),
        utils.viewer.teams.get.invalidate({ teamId }),
        utils.viewer.teams.list.invalidate(),
      ]);
      showToast(t("role_updated_successfully"), "success");
      onOpenChange(false);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const memberName = member?.name || member?.email || "";

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent
        type="creation"
        enableOverflow
        title={t("change_member_role")}
        description={t("team_change_role_description", { name: memberName })}>
        <p id={labelId} className="sr-only">
          {t("role")}
        </p>
        <RoleRadioGroup aria-labelledby={labelId} value={role} options={roleOptions} onChange={setRole} />
        <DialogFooter showDivider className="mt-10">
          <DialogClose />
          <Button
            data-testid="change-role-submit"
            loading={changeRole.isPending}
            disabled={!member || role === member.role}
            onClick={() => {
              if (!member) return;
              changeRole.mutate({ teamId, userId: member.userId, role });
            }}>
            {t("update")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
