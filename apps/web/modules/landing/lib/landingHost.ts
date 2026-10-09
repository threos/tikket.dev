export type LandingMode = "website" | "app" | "off";

type LandingConfig = {
  enabled: boolean;
  websiteUrl?: string;
  webAppUrl?: string;
};

function getHostname(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * The marketing host (e.g. tikket.dev) when it differs from the app host (e.g. app.tikket.dev).
 * Null when the landing page is off or both URLs share a host, so single-domain installs keep
 * serving everything from one origin.
 */
export function getWebsiteOnlyHost({ enabled, websiteUrl, webAppUrl }: LandingConfig): string | null {
  if (!enabled) return null;
  const websiteHost = getHostname(websiteUrl);
  const webAppHost = getHostname(webAppUrl);
  if (!websiteHost || websiteHost === webAppHost) return null;
  return websiteHost;
}

/**
 * "website": the request hit the separate marketing host, so always show the landing page.
 * "app": single-domain setup, so logged-out visitors of `/` see the landing page.
 * "off": keep sending logged-out visitors to the login screen.
 */
export function resolveLandingMode(config: LandingConfig & { requestHost?: string | null }): LandingMode {
  if (!config.enabled) return "off";
  const websiteOnlyHost = getWebsiteOnlyHost(config);
  if (!websiteOnlyHost) return "app";
  const requestHostname = config.requestHost?.split(":")[0].toLowerCase();
  return requestHostname === websiteOnlyHost ? "website" : "off";
}
