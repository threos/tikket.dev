import process from "node:process";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import CreateEventTypeForm from "@calcom/features/eventtypes/components/CreateEventTypeForm";
import type { AssignmentStrategyId } from "@calcom/features/teams/lib/assignmentStrategies";
import {
  ASSIGNMENT_STRATEGIES,
  getAssignmentStrategy,
} from "@calcom/features/teams/lib/assignmentStrategies";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import type { EventType } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useCreateEventType } from "~/event-types/hooks/useCreateEventType";
import { AssignmentStrategyPicker } from "./tabs/assignment/AssignmentStrategyPicker";

// Create only accepts schedulingType; weights are switched on later from the Assignment tab.
const CREATABLE_STRATEGIES = ASSIGNMENT_STRATEGIES.filter((strategy) => !strategy.fields.isRRWeightsEnabled);

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "";

// this describes the uniform data needed to create a new event type on Profile or Team
export interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  membershipRole?: MembershipRole | null;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

export interface ProfileOption {
  teamId: number | null | undefined;
  label: string | null;
  image: string;
  membershipRole: MembershipRole | null | undefined;
  slug: string | null;
  permissions: {
    canCreateEventType: boolean;
  };
}

const locationFormSchema = z.array(
  z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  })
);

const querySchema = z.object({
  eventPage: z.string().optional(),
  teamId: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  description: z.string().optional(),
  schedulingType: z.nativeEnum(SchedulingType).optional(),
  locations: z
    .string()
    .transform((jsonString) => locationFormSchema.parse(JSON.parse(jsonString)))
    .optional(),
});

export function CreateEventTypeDialog({ profileOptions }: { profileOptions: ProfileOption[] }) {
  const { t } = useLocale();
  const router = useRouter();
  const orgBranding = null;

  const {
    data: { teamId, eventPage: pageSlug, schedulingType: schedulingTypeFromQuery },
  } = useTypedQuery(querySchema);

  const teamProfile = teamId ? profileOptions.find((profile) => profile.teamId === teamId) : undefined;

  const onSuccessMutation = (eventType: EventType) => {
    router.replace(`/event-types/${eventType.id}${teamId ? "?tabName=team" : ""}`);
    showToast(
      t("event_type_created_successfully", {
        eventTypeTitle: eventType.title,
      }),
      "success"
    );
  };

  const onErrorMutation = (err: string) => {
    showToast(err, "error");
  };

  const SubmitButton = (isPending: boolean) => {
    return (
      <DialogFooter showDivider>
        <DialogClose />
        <Button type="submit" loading={isPending}>
          {t("continue")}
        </Button>
      </DialogFooter>
    );
  };

  const { form, createMutation, isManagedEventType } = useCreateEventType(onSuccessMutation, onErrorMutation);

  const initialStrategyId =
    schedulingTypeFromQuery === SchedulingType.COLLECTIVE ? "collective" : "round_robin";
  const [strategyId, setStrategyId] = useState<AssignmentStrategyId>(initialStrategyId);

  // The create schema requires both for team events; teamId comes from the URL so it survives reloads.
  useEffect(() => {
    if (!teamId) return;
    const strategy = getAssignmentStrategy(strategyId);
    form.setValue("teamId", teamId);
    form.setValue("schedulingType", SchedulingType[strategy.fields.schedulingType]);
  }, [teamId, strategyId, form]);

  const urlPrefix = WEBSITE_URL;

  return (
    <Dialog
      name="new"
      clearQueryParamsOnClose={[
        "eventPage",
        "teamId",
        "schedulingType",
        "type",
        "description",
        "title",
        "length",
        "slug",
        "locations",
      ]}>
      <DialogContent
        type="creation"
        enableOverflow
        title={teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
        description={t("new_event_type_to_book_description")}>
        {teamId && !teamProfile ? (
          <Alert severity="warning" title={t("error_event_type_unauthorized_create")} className="mt-4" />
        ) : (
          <CreateEventTypeForm
            urlPrefix={urlPrefix}
            isPending={createMutation.isPending}
            form={form}
            isManagedEventType={isManagedEventType}
            handleSubmit={(values) => {
              createMutation.mutate(values);
            }}
            SubmitButton={SubmitButton}
            pageSlug={teamId && teamProfile?.slug ? `team/${teamProfile.slug}` : pageSlug}
            extraFields={
              teamId ? (
                <fieldset>
                  <legend className="text-emphasis mb-1 text-sm font-medium">{t("assignment")}</legend>
                  <p className="text-subtle mb-3 text-sm">{t("create_team_event_assignment_description")}</p>
                  <AssignmentStrategyPicker
                    layout="stack"
                    name="createAssignmentStrategy"
                    strategies={CREATABLE_STRATEGIES}
                    value={strategyId}
                    onChange={setStrategyId}
                  />
                </fieldset>
              ) : null
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
