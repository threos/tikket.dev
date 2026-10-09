import type { TeamDto } from "@calcom/features/teams/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { getTrpcErrorCode } from "../lib/teamUtils";

type UseUpdateTeamOptions = {
  onSuccess?: (team: TeamDto) => void;
  onSlugConflict?: () => void;
  onError?: () => void;
};

export function useUpdateTeam(teamId: number, options: UseUpdateTeamOptions = {}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  return trpc.viewer.teams.update.useMutation({
    onSuccess: async (team) => {
      await Promise.all([
        utils.viewer.teams.get.invalidate({ teamId }),
        utils.viewer.teams.list.invalidate(),
      ]);
      showToast(t("team_updated_successfully"), "success");
      options.onSuccess?.(team);
    },
    onError: (error) => {
      options.onError?.();
      if (getTrpcErrorCode(error) === "CONFLICT" && options.onSlugConflict) {
        options.onSlugConflict();
        return;
      }
      showToast(error.message || t("error_updating_settings"), "error");
    },
  });
}
