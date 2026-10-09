import type {
  AssignmentStrategy,
  AssignmentStrategyId,
} from "@calcom/features/teams/lib/assignmentStrategies";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";
import { RadioAreaGroup } from "@calcom/ui/components/radio";

type AssignmentStrategyPickerProps = {
  strategies: readonly AssignmentStrategy[];
  value: AssignmentStrategyId;
  onChange: (id: AssignmentStrategyId) => void;
  // "grid" lays the cards side by side on wide screens, "stack" keeps them in one column (dialogs).
  layout?: "grid" | "stack";
  disabled?: boolean;
  name?: string;
};

export function AssignmentStrategyPicker({
  strategies,
  value,
  onChange,
  layout = "grid",
  disabled,
  name = "assignmentStrategy",
}: AssignmentStrategyPickerProps) {
  const { t } = useLocale();
  const strategyIds = new Set<string>(strategies.map((strategy) => strategy.id));

  return (
    <RadioAreaGroup.Group
      name={name}
      value={value}
      disabled={disabled}
      aria-label={t("assignment_strategy")}
      onValueChange={(next) => {
        if (strategyIds.has(next)) onChange(next as AssignmentStrategyId);
      }}
      className={classNames("grid gap-3", layout === "grid" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1")}>
      {strategies.map((strategy) => {
        const isSelected = strategy.id === value;
        return (
          <RadioAreaGroup.Item
            key={strategy.id}
            value={strategy.id}
            disabled={disabled}
            data-testid={`assignment-strategy-${strategy.id}`}
            className={classNames(
              "bg-default h-full transition-colors",
              isSelected ? "border-emphasis bg-cal-muted" : "border-subtle hover:border-emphasis",
              "[&>button]:left-auto [&>button]:right-4 [&>button]:top-4"
            )}
            classNames={{ container: "flex h-full w-full cursor-pointer flex-col gap-3 p-4 pr-10" }}>
            <span
              aria-hidden
              className={classNames(
                "flex h-8 w-8 items-center justify-center rounded-md border",
                isSelected
                  ? "border-emphasis bg-default text-emphasis"
                  : "border-subtle bg-subtle text-default"
              )}>
              <Icon name={strategy.icon} className="h-4 w-4" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-emphasis text-sm font-semibold leading-none">{t(strategy.labelKey)}</span>
              <span className="text-subtle text-sm leading-snug">{t(strategy.descriptionKey)}</span>
            </span>
          </RadioAreaGroup.Item>
        );
      })}
    </RadioAreaGroup.Group>
  );
}
