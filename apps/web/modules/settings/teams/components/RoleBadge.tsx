import type { TeamRoleDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { TEAM_ROLE_LABEL_KEY } from "../lib/teamUtils";

export function RoleBadge({ role }: { role: TeamRoleDto }) {
  const { t } = useLocale();
  return (
    <Badge variant={role === "OWNER" ? "blue" : "gray"} data-testid={`role-badge-${role.toLowerCase()}`}>
      {t(TEAM_ROLE_LABEL_KEY[role])}
    </Badge>
  );
}

export function PendingBadge() {
  const { t } = useLocale();
  return (
    <Badge variant="orange" data-testid="pending-badge">
      {t("pending")}
    </Badge>
  );
}
