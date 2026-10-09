import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { LANDING_GITHUB_URL, LANDING_SIGN_UP_PATH } from "../constants";
import { RoundRobinPreview } from "./RoundRobinPreview";

export function LandingHero() {
  const { t } = useLocale();

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="mx-auto grid max-w-[1100px] items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-32">
      <div className="text-center lg:text-left">
        <h1
          id="landing-hero-title"
          className="font-cal text-emphasis text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          {t("landing_hero_title")}
        </h1>
        <p className="text-subtle mx-auto mt-5 max-w-md text-lg leading-relaxed lg:mx-0">
          {t("landing_hero_subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
          <Button
            href={LANDING_SIGN_UP_PATH}
            color="primary"
            size="lg"
            EndIcon="arrow-right"
            className="justify-center">
            {t("landing_get_started")}
          </Button>
          <Button
            href={LANDING_GITHUB_URL}
            color="secondary"
            size="lg"
            StartIcon="github"
            className="justify-center">
            {t("landing_view_on_github")}
          </Button>
        </div>
      </div>
      <RoundRobinPreview />
    </section>
  );
}
