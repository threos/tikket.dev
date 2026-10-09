import { useLocale } from "@calcom/lib/hooks/useLocale";
import Link from "next/link";
import { LANDING_GITHUB_URL, LANDING_SIGN_IN_PATH } from "../constants";
import { Wordmark } from "./Wordmark";

const linkClassName =
  "text-subtle hover:text-emphasis focus-visible:ring-emphasis rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2";

export function LandingFooter() {
  const { t } = useLocale();

  return (
    <footer className="border-subtle border-t">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3">
          <Wordmark className="h-4" />
          <p className="text-subtle text-sm">
            {t("landing_footer_copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
        <nav aria-label={t("landing_footer_nav_label")}>
          <ul className="flex items-center gap-6 text-sm">
            <li>
              <a href={LANDING_GITHUB_URL} className={linkClassName}>
                {t("landing_github")}
              </a>
            </li>
            <li>
              <Link href={LANDING_SIGN_IN_PATH} className={linkClassName}>
                {t("landing_sign_in")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
