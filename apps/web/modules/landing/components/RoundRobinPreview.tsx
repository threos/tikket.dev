import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";

type PreviewHost = {
  name: string;
  share: number;
  isNext: boolean;
};

const PREVIEW_HOSTS: PreviewHost[] = [
  { name: "Ada", share: 50, isNext: true },
  { name: "Ben", share: 30, isNext: false },
  { name: "Cleo", share: 20, isNext: false },
];

const NEXT_HOST_NAME = PREVIEW_HOSTS.find((host) => host.isNext)?.name ?? "";

// Decorative mock of a round-robin event. It is hidden from assistive tech because the
// hero copy already says the same thing in words.
export function RoundRobinPreview() {
  const { t } = useLocale();

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm select-none lg:mr-0">
      <div className="bg-default border-subtle rounded-2xl border p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-emphasis truncate font-semibold">{t("landing_preview_event_title")}</p>
            <p className="text-subtle mt-1 flex items-center gap-1.5 text-sm">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {t("landing_preview_event_duration")}
            </p>
          </div>
          <span className="bg-subtle text-default inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
            <Icon name="repeat" className="h-3 w-3" />
            {t("landing_preview_round_robin")}
          </span>
        </div>

        <ul className="border-subtle mt-5 space-y-3 border-t pt-5">
          {PREVIEW_HOSTS.map((host) => (
            <li key={host.name} className="flex items-center gap-3">
              <span className="bg-emphasis text-emphasis flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {host.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-emphasis text-sm font-medium">{host.name}</span>
                  <span className="text-subtle text-xs tabular-nums">{host.share}%</span>
                </div>
                <div className="bg-subtle mt-1.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className={
                      host.isNext ? "bg-inverted h-full rounded-full" : "bg-emphasis h-full rounded-full"
                    }
                    style={{ width: `${host.share}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="bg-subtle mt-5 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm">
          <Icon name="circle-check" className="text-emphasis h-4 w-4 shrink-0" />
          <span className="text-default">{t("landing_preview_next_up", { name: NEXT_HOST_NAME })}</span>
        </div>
      </div>
    </div>
  );
}
