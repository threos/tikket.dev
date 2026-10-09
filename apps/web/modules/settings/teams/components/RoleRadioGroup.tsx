import type { TeamRoleDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RadioAreaGroup } from "@calcom/ui/components/radio";
import { TEAM_ROLE_DESCRIPTION_KEY, TEAM_ROLE_LABEL_KEY } from "../lib/teamUtils";

type RoleRadioGroupProps = {
  value: TeamRoleDto;
  options: TeamRoleDto[];
  onChange: (role: TeamRoleDto) => void;
  disabled?: boolean;
  "aria-labelledby"?: string;
};

function isTeamRole(value: string, options: TeamRoleDto[]): value is TeamRoleDto {
  return options.some((option) => option === value);
}

export function RoleRadioGroup({ value, options, onChange, disabled, ...rest }: RoleRadioGroupProps) {
  const { t } = useLocale();
  return (
    <RadioAreaGroup.Group
      value={value}
      disabled={disabled}
      aria-labelledby={rest["aria-labelledby"]}
      className="flex flex-col gap-2"
      onValueChange={(next) => {
        if (isTeamRole(next, options)) onChange(next);
      }}>
      {options.map((role) => (
        <RadioAreaGroup.Item key={role} value={role} data-testid={`role-option-${role.toLowerCase()}`}>
          <strong className="text-emphasis block text-sm font-semibold">
            {t(TEAM_ROLE_LABEL_KEY[role])}
          </strong>
          <span className="text-subtle mt-0.5 block text-sm">{t(TEAM_ROLE_DESCRIPTION_KEY[role])}</span>
        </RadioAreaGroup.Item>
      ))}
    </RadioAreaGroup.Group>
  );
}
