import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import Link from "next/link";
import { LANDING_SIGN_IN_PATH, LANDING_SIGN_UP_PATH } from "../constants";
import { Wordmark } from "./Wordmark";

export function LandingHeader() {
  const { t } = useLocale();

  return (
    <header className="border-subtle border-b">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="focus-visible:ring-emphasis -m-1 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2">
          <Wordmark className="h-7" />
        </Link>
        <nav aria-label={t("landing_nav_label")} className="flex items-center gap-2">
          <Button href={LANDING_SIGN_IN_PATH} color="minimal">
            {t("landing_sign_in")}
          </Button>
          <Button href={LANDING_SIGN_UP_PATH} color="primary">
            {t("landing_get_started")}
          </Button>
        </nav>
      </div>
    </header>
  );
}
