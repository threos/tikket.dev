import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { IconName } from "@calcom/ui/components/icon";
import { Icon } from "@calcom/ui/components/icon";

type Feature = {
  icon: IconName;
  titleKey: string;
  descriptionKey: string;
};

const FEATURES: Feature[] = [
  {
    icon: "users",
    titleKey: "landing_feature_teams_title",
    descriptionKey: "landing_feature_teams_description",
  },
  {
    icon: "shuffle",
    titleKey: "landing_feature_routing_title",
    descriptionKey: "landing_feature_routing_description",
  },
  {
    icon: "code",
    titleKey: "landing_feature_open_source_title",
    descriptionKey: "landing_feature_open_source_description",
  },
];

export function LandingFeatures() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="landing-features-title" className="border-subtle border-t">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 sm:py-20">
        <h2 id="landing-features-title" className="sr-only">
          {t("landing_features_title")}
        </h2>
        <ul className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {FEATURES.map((feature) => (
            <li key={feature.titleKey}>
              <span className="bg-subtle text-emphasis flex h-10 w-10 items-center justify-center rounded-lg">
                <Icon name={feature.icon} className="h-5 w-5" />
              </span>
              <h3 className="font-cal text-emphasis mt-4 text-lg">{t(feature.titleKey)}</h3>
              <p className="text-subtle mt-1.5 text-sm leading-relaxed">{t(feature.descriptionKey)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
