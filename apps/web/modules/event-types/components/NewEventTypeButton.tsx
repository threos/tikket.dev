import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import type { ProfileOption } from "./CreateEventTypeDialog";

export const getNewEventTypeHref = (option: Pick<ProfileOption, "teamId" | "slug">) => {
  const params = new URLSearchParams({ dialog: "new", eventPage: option.slug ?? "" });
  if (option.teamId) params.set("teamId", String(option.teamId));
  return `?${params.toString()}`;
};

export function NewEventTypeButton({ profileOptions }: { profileOptions: ProfileOption[] }) {
  const { t } = useLocale();
  const [firstOption] = profileOptions;
  if (!firstOption) return null;

  if (profileOptions.length === 1) {
    return (
      <Button data-testid="new-event-type" StartIcon="plus" href={getNewEventTypeHref(firstOption)}>
        {t("new")}
      </Button>
    );
  }

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button data-testid="new-event-type" StartIcon="plus" EndIcon="chevron-down">
          {t("new")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t("create_event_type_for")}</DropdownMenuLabel>
          {profileOptions.map((option) => {
            const label = option.label ?? option.slug ?? "";
            return (
              <DropdownMenuItem key={option.teamId ?? "personal"}>
                <DropdownItem
                  href={getNewEventTypeHref(option)}
                  data-testid={`new-event-type-option-${option.teamId ?? "personal"}`}
                  childrenClassName="truncate leading-normal"
                  CustomStartIcon={<Avatar size="xs" imageSrc={option.image} alt={label} className="mr-2" />}>
                  {option.teamId ? label : `${label} (${t("personal")})`}
                </DropdownItem>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
}
