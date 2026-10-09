import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { getTrpcErrorCode } from "../lib/teamUtils";

type TeamQueryErrorProps = {
  error: { data?: { code?: string } | null; message?: string } | null;
  onRetry?: () => void;
};

export function TeamQueryError({ error, onRetry }: TeamQueryErrorProps) {
  const { t } = useLocale();
  const code = getTrpcErrorCode(error);

  const backToTeams = (
    <Button color="secondary" href="/settings/teams" StartIcon="arrow-left">
      {t("back_to_teams")}
    </Button>
  );

  if (code === "FORBIDDEN" || code === "UNAUTHORIZED") {
    return (
      <EmptyScreen
        Icon="lock"
        headline={t("dont_have_access_this_page")}
        description={t("team_access_forbidden_description")}
        className="rounded-b-lg rounded-t-none border-t-0"
        buttonRaw={backToTeams}
      />
    );
  }

  if (code === "NOT_FOUND") {
    return (
      <EmptyScreen
        Icon="users"
        headline={t("team_not_found")}
        description={t("team_not_found_description")}
        className="rounded-b-lg rounded-t-none border-t-0"
        buttonRaw={backToTeams}
      />
    );
  }

  return (
    <EmptyScreen
      Icon="triangle-alert"
      headline={t("error_loading_data")}
      description={error?.message || t("something_went_wrong")}
      className="rounded-b-lg rounded-t-none border-t-0"
      buttonRaw={
        onRetry ? (
          <Button color="secondary" onClick={onRetry}>
            {t("try_again")}
          </Button>
        ) : (
          backToTeams
        )
      }
    />
  );
}
