"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import type { RRResetIntervalDto, RRTimestampBasisDto, TeamDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { RadioAreaGroup } from "@calcom/ui/components/radio";
import { useEffect, useId, useState } from "react";
import { useUpdateTeam } from "../hooks/useUpdateTeam";

type Option<T extends string> = { value: T; labelKey: string; descriptionKey: string };

const RESET_INTERVAL_OPTIONS: Option<RRResetIntervalDto>[] = [
  { value: "MONTH", labelKey: "monthly", descriptionKey: "rr_reset_interval_month_description" },
  { value: "DAY", labelKey: "daily", descriptionKey: "rr_reset_interval_day_description" },
];

const TIMESTAMP_BASIS_OPTIONS: Option<RRTimestampBasisDto>[] = [
  {
    value: "CREATED_AT",
    labelKey: "rr_timestamp_basis_created_at",
    descriptionKey: "rr_timestamp_basis_created_at_description",
  },
  {
    value: "START_TIME",
    labelKey: "rr_timestamp_basis_start_time",
    descriptionKey: "rr_timestamp_basis_start_time_description",
  },
];

function OptionGroup<T extends string>({
  label,
  helper,
  value,
  options,
  disabled,
  onChange,
  testId,
}: {
  label: string;
  helper: string;
  value: T;
  options: Option<T>[];
  disabled: boolean;
  onChange: (value: T) => void;
  testId: string;
}) {
  const { t } = useLocale();
  const labelId = useId();
  const helperId = useId();
  return (
    <div>
      <p id={labelId} className="text-emphasis text-sm font-semibold">
        {label}
      </p>
      <p id={helperId} className="text-subtle mb-3 mt-1 text-sm">
        {helper}
      </p>
      <RadioAreaGroup.Group
        value={value}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={helperId}
        className="grid gap-2 sm:grid-cols-2"
        data-testid={testId}
        onValueChange={(next) => {
          const match = options.find((option) => option.value === next);
          if (match) onChange(match.value);
        }}>
        {options.map((option) => (
          <RadioAreaGroup.Item key={option.value} value={option.value} className="h-full">
            <strong className="text-emphasis block text-sm font-semibold">{t(option.labelKey)}</strong>
            <span className="text-subtle mt-0.5 block text-sm">{t(option.descriptionKey)}</span>
          </RadioAreaGroup.Item>
        ))}
      </RadioAreaGroup.Group>
    </div>
  );
}

export function RoundRobinSettingsSection({ team, canEdit }: { team: TeamDto; canEdit: boolean }) {
  const { t } = useLocale();
  const headingId = useId();
  const [resetInterval, setResetInterval] = useState<RRResetIntervalDto>(team.rrResetInterval);
  const [timestampBasis, setTimestampBasis] = useState<RRTimestampBasisDto>(team.rrTimestampBasis);

  useEffect(() => {
    setResetInterval(team.rrResetInterval);
    setTimestampBasis(team.rrTimestampBasis);
  }, [team.rrResetInterval, team.rrTimestampBasis]);

  const updateTeam = useUpdateTeam(team.id);
  const isDirty = resetInterval !== team.rrResetInterval || timestampBasis !== team.rrTimestampBasis;

  return (
    <section aria-labelledby={headingId} className="mt-6" data-testid="round-robin-settings">
      <div className="border-subtle rounded-t-lg border px-4 py-6 sm:px-6">
        <h2 id={headingId} className="font-cal text-emphasis text-base font-semibold leading-5">
          {t("round_robin_settings")}
        </h2>
        <p className="text-subtle mt-1 text-sm">{t("round_robin_settings_description")}</p>
      </div>
      <div className="border-subtle stack-y-8 border-x px-4 py-8 sm:px-6">
        <OptionGroup
          label={t("rr_reset_interval")}
          helper={t("rr_reset_interval_helper")}
          value={resetInterval}
          options={RESET_INTERVAL_OPTIONS}
          disabled={!canEdit}
          onChange={setResetInterval}
          testId="rr-reset-interval"
        />
        <OptionGroup
          label={t("rr_timestamp_basis")}
          helper={t("rr_timestamp_basis_helper")}
          value={timestampBasis}
          options={TIMESTAMP_BASIS_OPTIONS}
          disabled={!canEdit}
          onChange={setTimestampBasis}
          testId="rr-timestamp-basis"
        />
      </div>
      <SectionBottomActions align="end">
        {canEdit ? (
          <Button
            color="primary"
            loading={updateTeam.isPending}
            disabled={!isDirty}
            data-testid="rr-settings-submit"
            onClick={() =>
              updateTeam.mutate({
                teamId: team.id,
                rrResetInterval: resetInterval,
                rrTimestampBasis: timestampBasis,
              })
            }>
            {t("update")}
          </Button>
        ) : (
          <p className="text-subtle text-sm">{t("team_profile_read_only")}</p>
        )}
      </SectionBottomActions>
    </section>
  );
}
