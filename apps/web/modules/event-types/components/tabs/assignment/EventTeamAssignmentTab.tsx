import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { PriorityDialog, WeightDialog } from "@calcom/features/eventtypes/components/dialogs/HostEditDialogs";
import type { EventTypeSetup, FormValues, Host } from "@calcom/features/eventtypes/lib/types";
import type {
  AssignmentStrategy,
  AssignmentStrategyId,
} from "@calcom/features/teams/lib/assignmentStrategies";
import {
  ASSIGNMENT_STRATEGIES,
  getAssignmentStrategy,
  resolveAssignmentStrategyId,
} from "@calcom/features/teams/lib/assignmentStrategies";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { SettingsToggle } from "@calcom/ui/components/form";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { AssignmentStrategyPicker } from "./AssignmentStrategyPicker";
import { HostGroupSection, toMemberOption } from "./HostGroupSection";
import type { AssignableMember } from "./hostAssignment";
import {
  applyStrategyToHosts,
  buildHostsForAllMembers,
  computeBookingShares,
  createHost,
  getAssignmentWarning,
  getMembersMissingFromHosts,
  setGroupMembers,
  splitHosts,
  strategyChangeLosesHostSettings,
} from "./hostAssignment";

type TeamMemberInput = {
  id: number;
  name: string | null;
  email: string;
  avatar: string;
};

export type EventTeamAssignmentTabProps = {
  orgId: number | null;
  teamMembers: readonly TeamMemberInput[];
  team: { id: number; name?: string | null } | null;
  eventType: Pick<EventTypeSetup, "id" | "schedulingType">;
};

const DIRTY = { shouldDirty: true } as const;

const closeWhenFalse =
  (close: () => void): Dispatch<SetStateAction<boolean>> =>
  (value) => {
    const open = typeof value === "function" ? value(true) : value;
    if (!open) close();
  };

export const EventTeamAssignmentTab = ({ teamMembers, eventType }: EventTeamAssignmentTabProps) => {
  const { t } = useLocale();
  const { setValue, getValues, control } = useFormContext<FormValues>();

  const schedulingType = useWatch({ control, name: "schedulingType" });
  const isRRWeightsEnabled = useWatch({ control, name: "isRRWeightsEnabled" });
  const watchedHosts = useWatch({ control, name: "hosts" });
  const assignAllTeamMembers = useWatch({ control, name: "assignAllTeamMembers" }) ?? false;
  const hosts: Host[] = useMemo(() => watchedHosts ?? [], [watchedHosts]);

  const [pendingStrategy, setPendingStrategy] = useState<AssignmentStrategy | null>(null);
  const [editingPriorityHost, setEditingPriorityHost] = useState<Host | null>(null);
  const [editingWeightHost, setEditingWeightHost] = useState<Host | null>(null);

  const members: AssignableMember[] = useMemo(
    () =>
      teamMembers.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        avatar: member.avatar,
      })),
    [teamMembers]
  );
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const allMemberOptions = useMemo(() => members.map(toMemberOption), [members]);

  const strategy = getAssignmentStrategy(resolveAssignmentStrategyId({ schedulingType, isRRWeightsEnabled }));
  const { fixed: fixedHosts, rotating: rotatingHosts } = useMemo(() => splitHosts(hosts), [hosts]);
  const fixedIds = useMemo(() => new Set(fixedHosts.map((host) => host.userId)), [fixedHosts]);
  const rotatingIds = useMemo(() => new Set(rotatingHosts.map((host) => host.userId)), [rotatingHosts]);
  const bookingShares = useMemo(
    () => (strategy.supportsWeights ? computeBookingShares(rotatingHosts) : undefined),
    [strategy.supportsWeights, rotatingHosts]
  );
  const missingMembers = useMemo(() => getMembersMissingFromHosts(members, hosts), [members, hosts]);
  const warning = getAssignmentWarning(hosts, strategy);

  // Managed event types are not part of the assignment strategy registry.
  if (eventType.schedulingType === SchedulingType.MANAGED) {
    return <Alert severity="info" title={t("assignment_managed_not_supported")} />;
  }

  const setHosts = (nextHosts: Host[]) => setValue("hosts", nextHosts, DIRTY);

  const applyStrategy = (next: AssignmentStrategy) => {
    setValue("schedulingType", SchedulingType[next.fields.schedulingType], DIRTY);
    setValue("isRRWeightsEnabled", next.fields.isRRWeightsEnabled, DIRTY);
    if (strategy.supportsFixedHosts !== next.supportsFixedHosts) {
      setHosts(applyStrategyToHosts(getValues("hosts") ?? [], strategy, next));
    }
  };

  const onStrategyChange = (id: AssignmentStrategyId) => {
    if (id === strategy.id) return;
    const next = getAssignmentStrategy(id);
    if (strategyChangeLosesHostSettings(hosts, strategy, next)) {
      setPendingStrategy(next);
      return;
    }
    applyStrategy(next);
  };

  const onAssignAllChange = (active: boolean) => {
    setValue("assignAllTeamMembers", active, DIRTY);
    // The booking engine only reads the Host table, so "all members" has to be materialised as hosts.
    if (active) setHosts(buildHostsForAllMembers(members, hosts, strategy));
  };

  const updateGroup = (isFixed: boolean, selectedUserIds: number[]) =>
    setHosts(
      setGroupMembers({
        hosts,
        isFixed,
        selectedUserIds,
        keepUnselectedAsOtherGroup: assignAllTeamMembers,
      })
    );

  const setCollectiveHosts = (selectedUserIds: number[]) => {
    const currentById = new Map(hosts.map((host) => [host.userId, host]));
    setHosts(
      selectedUserIds.map((userId) => {
        const existing = currentById.get(userId);
        return existing ? { ...existing, isFixed: true } : createHost(userId, true);
      })
    );
  };

  const removeFromGroup = (isFixed: boolean, userId: number) => {
    const group = isFixed ? fixedHosts : rotatingHosts;
    updateGroup(
      isFixed,
      group.filter((host) => host.userId !== userId).map((host) => host.userId)
    );
  };

  const toCheckedOption = (host: Host): CheckedSelectOption => {
    const member = membersById.get(host.userId);
    return {
      value: String(host.userId),
      label: member ? member.name || member.email : String(host.userId),
      avatar: member?.avatar ?? "",
      priority: host.priority,
      weight: host.weight,
      isFixed: host.isFixed,
      groupId: host.groupId,
    };
  };

  // Host edit dialogs hand back the full list of rotating hosts; merge them so per-host data
  // such as schedules and locations survives.
  const onRotatingHostsEdited = (updated: readonly CheckedSelectOption[]) => {
    const currentHosts = getValues("hosts") ?? [];
    const currentById = new Map(currentHosts.map((host) => [host.userId, host]));
    const updatedRotating: Host[] = [];
    for (const option of updated) {
      const userId = Number(option.value);
      const existing = currentById.get(userId);
      if (!existing) continue;
      updatedRotating.push({
        ...existing,
        isFixed: false,
        priority: option.priority ?? existing.priority,
        weight: option.weight ?? existing.weight,
        groupId: option.groupId ?? existing.groupId,
      });
    }
    setHosts([...currentHosts.filter((host) => host.isFixed), ...updatedRotating]);
  };

  const rotatingHostOptions = rotatingHosts.map(toCheckedOption);

  const fixedPickerOptions = assignAllTeamMembers
    ? allMemberOptions
    : allMemberOptions.filter((option) => !rotatingIds.has(option.value));
  const rotatingPickerOptions = allMemberOptions.filter((option) => !fixedIds.has(option.value));

  return (
    <div className="stack-y-6">
      <section className="border-subtle rounded-lg border p-6" data-testid="assignment-strategy-section">
        <h2 className="text-emphasis text-base font-semibold leading-none">{t("assignment_strategy")}</h2>
        <p className="text-subtle mb-4 mt-1.5 text-sm">{t("assignment_strategy_section_description")}</p>
        <AssignmentStrategyPicker
          strategies={ASSIGNMENT_STRATEGIES}
          value={strategy.id}
          onChange={onStrategyChange}
        />
      </section>

      <section className="border-subtle rounded-lg border" data-testid="assignment-hosts-section">
        <div className="border-subtle border-b p-6">
          <h2 className="text-emphasis text-base font-semibold leading-none">{t("hosts")}</h2>
          <p className="text-subtle mt-1.5 text-sm">
            {strategy.supportsFixedHosts
              ? t("assignment_hosts_round_robin_description")
              : t("assignment_hosts_collective_description")}
          </p>
        </div>

        <div className="border-subtle border-b px-6 py-5">
          <SettingsToggle
            data-testid="assign-all-team-members-toggle"
            toggleSwitchAtTheEnd
            title={t("assign_all_team_members")}
            description={t("assign_all_team_members_description")}
            labelClassName="text-sm"
            checked={assignAllTeamMembers}
            onCheckedChange={onAssignAllChange}
          />
          {assignAllTeamMembers && missingMembers.length > 0 && (
            <Alert
              className="mt-4"
              severity="info"
              title={t("assignment_members_not_hosts_yet", { count: missingMembers.length })}
              actions={
                <Button
                  type="button"
                  color="secondary"
                  size="sm"
                  onClick={() => setHosts(buildHostsForAllMembers(members, hosts, strategy))}>
                  {t("add_them_as_hosts")}
                </Button>
              }
            />
          )}
        </div>

        <div className="stack-y-8 p-6">
          {warning && (
            <div data-testid="assignment-warning">
              <Alert severity="warning" title={t(warning)} />
            </div>
          )}

          {strategy.supportsFixedHosts ? (
            <>
              <HostGroupSection
                testId="fixed-hosts-group"
                title={t("fixed_hosts")}
                description={t("fixed_hosts_description")}
                hosts={fixedHosts}
                membersById={membersById}
                pickerOptions={fixedPickerOptions}
                onSelectionChange={(ids) => updateGroup(true, ids)}
                onRemove={(userId) => removeFromGroup(true, userId)}
                removeLabel={assignAllTeamMembers ? t("move_to_rotation") : undefined}
                showPriority={false}
                showWeight={false}
                emptyMessage={t("no_fixed_hosts")}
              />
              <HostGroupSection
                testId="rotating-hosts-group"
                title={t("round_robin_hosts")}
                description={
                  strategy.supportsWeights
                    ? t("rotating_hosts_weighted_description")
                    : t("rotating_hosts_description")
                }
                hosts={rotatingHosts}
                membersById={membersById}
                pickerOptions={assignAllTeamMembers ? undefined : rotatingPickerOptions}
                onSelectionChange={(ids) => updateGroup(false, ids)}
                onRemove={assignAllTeamMembers ? undefined : (userId) => removeFromGroup(false, userId)}
                showPriority={strategy.supportsPriority}
                showWeight={strategy.supportsWeights}
                bookingShares={bookingShares}
                onEditPriority={setEditingPriorityHost}
                onEditWeight={setEditingWeightHost}
                emptyMessage={t("no_rotating_hosts")}
              />
            </>
          ) : (
            <HostGroupSection
              testId="collective-hosts-group"
              title={t("hosts")}
              description={t("collective_hosts_description")}
              hosts={hosts}
              membersById={membersById}
              pickerOptions={assignAllTeamMembers ? undefined : allMemberOptions}
              onSelectionChange={setCollectiveHosts}
              onRemove={
                assignAllTeamMembers
                  ? undefined
                  : (userId) =>
                      setCollectiveHosts(
                        hosts.filter((host) => host.userId !== userId).map((host) => host.userId)
                      )
              }
              showPriority={false}
              showWeight={false}
              emptyMessage={t("start_assigning_members_above")}
            />
          )}
        </div>
      </section>

      {editingPriorityHost && (
        <PriorityDialog
          key={`priority-${editingPriorityHost.userId}`}
          isOpenDialog
          setIsOpenDialog={closeWhenFalse(() => setEditingPriorityHost(null))}
          option={toCheckedOption(editingPriorityHost)}
          options={rotatingHostOptions}
          onChange={onRotatingHostsEdited}
        />
      )}
      {editingWeightHost && (
        <WeightDialog
          key={`weight-${editingWeightHost.userId}`}
          isOpenDialog
          setIsOpenDialog={closeWhenFalse(() => setEditingWeightHost(null))}
          option={toCheckedOption(editingWeightHost)}
          options={rotatingHostOptions}
          onChange={onRotatingHostsEdited}
        />
      )}

      <Dialog
        open={pendingStrategy !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStrategy(null);
        }}>
        <ConfirmationDialogContent
          variety="warning"
          title={t("switch_to_strategy", { strategy: pendingStrategy ? t(pendingStrategy.labelKey) : "" })}
          confirmBtnText={t("switch_strategy")}
          onConfirm={() => {
            if (pendingStrategy) applyStrategy(pendingStrategy);
            setPendingStrategy(null);
          }}>
          {t("switch_to_collective_warning")}
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};

export default EventTeamAssignmentTab;
