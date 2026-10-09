"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import type { TeamDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { Button } from "@calcom/ui/components/button";
import { Editor } from "@calcom/ui/components/editor";
import { Form, Label, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUpdateTeam } from "../hooks/useUpdateTeam";
import { getTeamPublicUrl, getTeamUrlPrefix } from "../lib/teamUtils";
import { TeamAvatar } from "./TeamAvatar";

type TeamProfileFormValues = { name: string; slug: string; bio: string };

function toFormValues(team: TeamDto): TeamProfileFormValues {
  return { name: team.name, slug: team.slug ?? "", bio: team.bio ?? "" };
}

export function TeamProfileForm({ team, canEdit }: { team: TeamDto; canEdit: boolean }) {
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);

  const schema = z.object({
    name: z.string().trim().min(1, t("must_enter_team_name")),
    slug: z.string().min(1, t("team_url_required")),
    bio: z.string(),
  });

  const form = useForm<TeamProfileFormValues>({
    defaultValues: toFormValues(team),
    resolver: zodResolver(schema),
  });

  const updateTeam = useUpdateTeam(team.id, {
    onSuccess: (updated) => form.reset(toFormValues(updated)),
    onSlugConflict: () => form.setError("slug", { message: t("team_url_taken") }, { shouldFocus: true }),
  });

  const {
    formState: { isDirty },
  } = form;
  const slugField = form.register("slug");

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        updateTeam.mutate({
          teamId: team.id,
          name: values.name.trim(),
          slug: slugify(values.slug),
          bio: values.bio.trim() ? values.bio : null,
        });
      }}>
      <fieldset disabled={!canEdit} className="border-subtle border-x px-4 pb-10 pt-8 sm:px-6">
        <legend className="sr-only">{t("team_info")}</legend>
        <div className="flex items-center gap-4">
          <TeamAvatar name={form.watch("name") || team.name} logoUrl={team.logoUrl} />
          <div className="min-w-0">
            <p className="text-emphasis truncate text-sm font-semibold">{team.name}</p>
            {team.slug ? (
              <a
                href={getTeamPublicUrl(team.slug)}
                target="_blank"
                rel="noreferrer"
                className="text-subtle hover:text-emphasis inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline">
                {`${getTeamUrlPrefix()}${team.slug}`}
                <Icon name="external-link" className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">{t("view_public_page")}</span>
              </a>
            ) : (
              <p className="text-subtle text-sm">{t("team_slug_pending")}</p>
            )}
          </div>
        </div>
        <div className="mt-6">
          <TextField {...form.register("name")} label={t("team_name")} data-testid="team-profile-name" />
        </div>
        <div className="mt-6">
          <TextField
            {...slugField}
            label={t("team_url")}
            addOnLeading={getTeamUrlPrefix()}
            spellCheck={false}
            dataTestid="team-profile-slug"
            onChange={(event) =>
              form.setValue("slug", slugify(event.target.value, true), {
                shouldDirty: true,
                shouldValidate: !!form.formState.errors.slug,
              })
            }
          />
        </div>
        <div className="mt-6">
          <Label>{t("about")}</Label>
          <Editor
            getText={() => md.render(form.getValues("bio") || "")}
            setText={(value: string) => {
              form.setValue("bio", turndown(value), { shouldDirty: true });
            }}
            editable={canEdit}
            excludedToolbarItems={["blockType"]}
            disableLists
            firstRender={firstRender}
            setFirstRender={setFirstRender}
            height="120px"
            placeholder={t("team_description")}
          />
          <p className="text-subtle mt-2 text-sm">{t("team_description")}</p>
        </div>
      </fieldset>
      <SectionBottomActions align="end">
        {canEdit ? (
          <Button
            type="submit"
            color="primary"
            loading={updateTeam.isPending}
            disabled={!isDirty}
            data-testid="team-profile-submit">
            {t("update")}
          </Button>
        ) : (
          <p className="text-subtle text-sm">{t("team_profile_read_only")}</p>
        )}
      </SectionBottomActions>
    </Form>
  );
}
