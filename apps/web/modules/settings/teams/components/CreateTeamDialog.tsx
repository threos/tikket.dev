"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getTeamUrlPrefix, getTrpcErrorCode } from "../lib/teamUtils";

type CreateTeamFormValues = { name: string; slug: string };

type CreateTeamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  // Once the user types in the URL field we stop overwriting it from the name.
  const [isSlugEditedManually, setIsSlugEditedManually] = useState(false);

  const schema = z.object({
    name: z.string().trim().min(1, t("must_enter_team_name")),
    slug: z.string().min(1, t("team_url_required")),
  });

  const form = useForm<CreateTeamFormValues>({
    defaultValues: { name: "", slug: "" },
    resolver: zodResolver(schema),
  });

  const resetDialog = () => {
    form.reset({ name: "", slug: "" });
    setIsSlugEditedManually(false);
  };

  const createTeam = trpc.viewer.teams.create.useMutation({
    onSuccess: async (team) => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("team_created_successfully", { teamName: team.name }), "success");
      onOpenChange(false);
      resetDialog();
      router.push(`/settings/teams/${team.id}/members?invite=1`);
    },
    onError: (error) => {
      if (getTrpcErrorCode(error) === "CONFLICT") {
        form.setError("slug", { message: t("team_url_taken") }, { shouldFocus: true });
        return;
      }
      showToast(error.message || t("error_creating_team"), "error");
    },
  });

  const nameField = form.register("name");
  const slugField = form.register("slug");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetDialog();
        onOpenChange(nextOpen);
      }}>
      <DialogContent
        type="creation"
        title={t("create_team")}
        description={t("create_new_team_description")}
        data-testid="create-team-dialog">
        <Form
          form={form}
          handleSubmit={(values) => {
            createTeam.mutate({ name: values.name.trim(), slug: slugify(values.slug) });
          }}>
          <div className="stack-y-5">
            <TextField
              {...nameField}
              label={t("team_name")}
              placeholder={t("org_team_names_example_2")}
              autoComplete="off"
              autoFocus
              data-testid="team-name-input"
              onChange={(event) => {
                void nameField.onChange(event);
                if (!isSlugEditedManually) {
                  form.setValue("slug", slugify(event.target.value), {
                    shouldValidate: !!form.formState.errors.slug,
                  });
                }
              }}
            />
            <TextField
              {...slugField}
              label={t("team_url")}
              addOnLeading={getTeamUrlPrefix()}
              autoComplete="off"
              spellCheck={false}
              dataTestid="team-slug"
              onChange={(event) => {
                setIsSlugEditedManually(true);
                form.setValue("slug", slugify(event.target.value, true), {
                  shouldDirty: true,
                  shouldValidate: !!form.formState.errors.slug,
                });
              }}
            />
          </div>
          <DialogFooter showDivider className="mt-10">
            <DialogClose />
            <Button type="submit" loading={createTeam.isPending} data-testid="create-team-submit">
              {t("create_team")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
