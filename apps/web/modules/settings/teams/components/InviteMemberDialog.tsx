"use client";

import type { TeamInviteResultDto, TeamRoleDto } from "@calcom/features/teams/lib/types";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, Label, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { assignableRoles } from "../lib/teamPermissions";
import { RoleRadioGroup } from "./RoleRadioGroup";

type InviteFormValues = { emailOrUsername: string; role: TeamRoleDto };

type InviteMemberDialogProps = {
  teamId: number;
  teamName: string;
  actorRole: TeamRoleDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShareableInvite = { invitee: string; inviteLink: string; emailSent: boolean };

export function InviteMemberDialog({
  teamId,
  teamName,
  actorRole,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const roleLabelId = useId();
  const roleOptions = assignableRoles(actorRole);
  // Set when the server could not send the invite email, so the admin can deliver the link themselves.
  const [shareableInvite, setShareableInvite] = useState<ShareableInvite | null>(null);

  const form = useForm<InviteFormValues>({ defaultValues: { emailOrUsername: "", role: "MEMBER" } });

  const resetDialog = () => {
    form.reset({ emailOrUsername: "", role: "MEMBER" });
    setShareableInvite(null);
  };

  const close = () => {
    onOpenChange(false);
    resetDialog();
  };

  const handleResult = (result: TeamInviteResultDto, invitee: string) => {
    if (result.status === "already_member") {
      form.setError("emailOrUsername", { message: t("team_invite_already_member", { invitee }) });
      showToast(t("team_invite_already_member", { invitee }), "warning");
      return;
    }

    // Email delivery failures are swallowed by the mailer, so "sent" can't be trusted; always hand the
    // admin the signup link for people without an account so the invite never silently goes nowhere.
    if (result.status === "invited_new_user" && result.inviteLink) {
      showToast(t("team_invite_created_share_link"), "success");
      setShareableInvite({ invitee, inviteLink: result.inviteLink, emailSent: result.emailSent });
      return;
    }

    if (result.status === "invited_new_user") {
      showToast(
        result.emailSent
          ? t("team_invite_sent_new_user", { invitee })
          : t("team_invite_created_no_email", { invitee }),
        "success"
      );
    } else {
      showToast(
        result.emailSent
          ? t("email_invite_team", { email: invitee })
          : t("team_invite_existing_user_no_email", { invitee }),
        "success"
      );
    }
    close();
  };

  const inviteMember = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: async (result, variables) => {
      await utils.viewer.teams.listMembers.invalidate({ teamId });
      handleResult(result, variables.emailOrUsername);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetDialog();
        onOpenChange(nextOpen);
      }}>
      <DialogContent
        type="creation"
        enableOverflow
        title={t("invite_team_member")}
        description={t("team_invite_dialog_description", { teamName })}
        data-testid="invite-member-dialog">
        {shareableInvite ? (
          <ShareInviteLink
            invitee={shareableInvite.invitee}
            inviteLink={shareableInvite.inviteLink}
            emailSent={shareableInvite.emailSent}
            onInviteAnother={resetDialog}
            onDone={close}
          />
        ) : (
          <Form
            form={form}
            handleSubmit={(values) => {
              inviteMember.mutate({
                teamId,
                emailOrUsername: values.emailOrUsername.trim(),
                role: values.role,
              });
            }}>
            <div className="stack-y-5">
              <TextField
                {...form.register("emailOrUsername", {
                  validate: (value) => value.trim().length > 0 || t("error_required_field"),
                })}
                label={t("email_or_username")}
                placeholder="jane@example.com"
                autoComplete="off"
                autoFocus
                spellCheck={false}
                data-testid="invite-email-or-username"
              />
              {roleOptions.length > 1 && (
                <div>
                  <Label id={roleLabelId}>{t("invite_as")}</Label>
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <RoleRadioGroup
                        aria-labelledby={roleLabelId}
                        value={field.value}
                        options={roleOptions}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {form.watch("role") !== "MEMBER" && (
                    <p className="text-subtle mt-2 text-xs">{t("team_invite_elevated_role_hint")}</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter showDivider className="mt-10">
              <DialogClose />
              <Button type="submit" loading={inviteMember.isPending} data-testid="invite-member-submit">
                {t("send_invite")}
              </Button>
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareInviteLink({
  invitee,
  inviteLink,
  emailSent,
  onInviteAnother,
  onDone,
}: ShareableInvite & { onInviteAnother: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const { isCopied, copyToClipboard } = useCopy();

  return (
    <>
      <div className="bg-cal-muted border-subtle rounded-lg border p-4" data-testid="invite-link-panel">
        <p className="text-emphasis text-sm font-semibold">{t("team_invite_link_title")}</p>
        <p className="text-subtle mt-1 text-sm">
          {emailSent
            ? t("team_invite_link_description_email_sent", { invitee })
            : t("team_invite_link_description", { invitee })}
        </p>
        <div className="mt-3 flex items-start gap-2">
          <TextField
            readOnly
            value={inviteLink}
            aria-label={t("team_invite_link_title")}
            containerClassName="min-w-0 flex-1"
            className="font-mono text-xs"
            data-testid="invite-link-input"
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            color="secondary"
            StartIcon={isCopied ? "check" : "copy"}
            data-testid="copy-invite-link"
            onClick={() =>
              copyToClipboard(inviteLink, {
                onSuccess: () => showToast(t("invite_link_copied"), "success"),
                onFailure: () => showToast(t("error_copying_to_clipboard"), "error"),
              })
            }>
            {isCopied ? t("copied") : t("copy")}
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">
          {isCopied ? t("invite_link_copied") : ""}
        </span>
      </div>
      <DialogFooter showDivider className="mt-10">
        <Button color="secondary" onClick={onInviteAnother} data-testid="invite-another">
          {t("team_invite_another")}
        </Button>
        <Button onClick={onDone} data-testid="invite-done">
          {t("done")}
        </Button>
      </DialogFooter>
    </>
  );
}
