import type { Host } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";
import type { ReactNode } from "react";
import type { AssignableMember } from "./hostAssignment";
import { getPriorityLabelKey } from "./hostAssignment";

export type MemberOption = {
  value: number;
  label: string;
  email: string;
  avatar: string;
};

export const toMemberOption = (member: AssignableMember): MemberOption => ({
  value: member.id,
  label: member.name || member.email,
  email: member.email,
  avatar: member.avatar,
});

type HostGroupSectionProps = {
  testId: string;
  title: string;
  description: ReactNode;
  hosts: readonly Host[];
  membersById: ReadonlyMap<number, AssignableMember>;
  // When undefined the group is not editable through a picker (e.g. everyone is assigned automatically).
  pickerOptions?: readonly MemberOption[];
  onSelectionChange?: (selectedUserIds: number[]) => void;
  onRemove?: (userId: number) => void;
  removeLabel?: string;
  showPriority: boolean;
  showWeight: boolean;
  bookingShares?: ReadonlyMap<number, number>;
  onEditPriority?: (host: Host) => void;
  onEditWeight?: (host: Host) => void;
  emptyMessage: string;
};

export function HostGroupSection({
  testId,
  title,
  description,
  hosts,
  membersById,
  pickerOptions,
  onSelectionChange,
  onRemove,
  removeLabel,
  showPriority,
  showWeight,
  bookingShares,
  onEditPriority,
  onEditWeight,
  emptyMessage,
}: HostGroupSectionProps) {
  const { t } = useLocale();

  const selectedOptions: MemberOption[] = [];
  for (const host of hosts) {
    const member = membersById.get(host.userId);
    if (member) selectedOptions.push(toMemberOption(member));
  }

  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <div>
        <h3 className="text-emphasis text-sm font-semibold leading-none">
          {title}
          <span className="text-subtle ml-2 font-normal tabular-nums">{hosts.length}</span>
        </h3>
        <p className="text-subtle mt-1.5 text-sm">{description}</p>
      </div>

      {pickerOptions && onSelectionChange && (
        <Select<MemberOption, true>
          isMulti
          isSearchable
          isClearable={false}
          controlShouldRenderValue={false}
          closeMenuOnSelect={false}
          aria-label={t("add_hosts_to_group", { group: title })}
          placeholder={t("search_team_members")}
          noOptionsMessage={() => t("no_more_team_members")}
          options={pickerOptions}
          value={selectedOptions}
          getOptionValue={(option) => String(option.value)}
          filterOption={(option, input) => {
            const query = input.trim().toLowerCase();
            if (!query) return true;
            return (
              option.data.label.toLowerCase().includes(query) ||
              option.data.email.toLowerCase().includes(query)
            );
          }}
          formatOptionLabel={(option, { context }) =>
            context === "menu" ? (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar size="xs" imageSrc={option.avatar} alt={option.label} />
                <span className="truncate">{option.label}</span>
                {option.label !== option.email && (
                  <span className="text-subtle truncate text-xs">{option.email}</span>
                )}
              </span>
            ) : (
              option.label
            )
          }
          onChange={(options) => onSelectionChange(options.map((option) => option.value))}
        />
      )}

      {hosts.length === 0 ? (
        <p className="border-subtle text-subtle rounded-md border border-dashed px-4 py-3 text-sm">
          {emptyMessage}
        </p>
      ) : (
        <ul className="border-subtle divide-subtle max-h-[28rem] divide-y overflow-y-auto overscroll-contain rounded-md border">
          {hosts.map((host) => {
            const member = membersById.get(host.userId);
            const name = member ? member.name || member.email : t("former_team_member");
            const priorityLabel = t(getPriorityLabelKey(host.priority));
            const share = bookingShares?.get(host.userId);
            return (
              <li
                key={host.userId}
                data-testid="assignment-host-row"
                className="flex items-center gap-3 px-3 py-2 sm:px-4">
                <Avatar size="sm" imageSrc={member?.avatar} alt={name} />
                <div className="min-w-0 flex-1">
                  <p className="text-emphasis truncate text-sm font-medium">{name}</p>
                  {member && member.name && <p className="text-subtle truncate text-xs">{member.email}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {showPriority && onEditPriority && (
                    <Tooltip content={t("change_priority")}>
                      <Button
                        type="button"
                        color="minimal"
                        size="sm"
                        data-testid="host-priority-button"
                        aria-label={t("priority_for_user", { userName: name })}
                        onClick={() => onEditPriority(host)}
                        className={classNames(
                          "capitalize",
                          (host.priority ?? 2) > 2 ? "text-emphasis" : "text-subtle"
                        )}>
                        {priorityLabel}
                      </Button>
                    </Tooltip>
                  )}
                  {showWeight && onEditWeight && (
                    <>
                      {share !== undefined && (
                        <span
                          data-testid="host-booking-share"
                          className="text-subtle hidden whitespace-nowrap text-xs tabular-nums sm:inline">
                          {t("booking_share_percent", { percent: share })}
                        </span>
                      )}
                      <Tooltip content={t("set_weight")}>
                        <Button
                          type="button"
                          color="minimal"
                          size="sm"
                          data-testid="host-weight-button"
                          aria-label={t("weight_for_user", { userName: name })}
                          onClick={() => onEditWeight(host)}
                          className="tabular-nums">
                          {t("weight_value", { weight: host.weight ?? 100 })}
                        </Button>
                      </Tooltip>
                    </>
                  )}
                  {onRemove && (
                    <Tooltip content={removeLabel ?? t("remove")}>
                      <Button
                        type="button"
                        color="minimal"
                        variant="icon"
                        size="sm"
                        StartIcon="x"
                        data-testid="host-remove-button"
                        aria-label={`${removeLabel ?? t("remove")}: ${name}`}
                        onClick={() => onRemove(host.userId)}
                      />
                    </Tooltip>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
