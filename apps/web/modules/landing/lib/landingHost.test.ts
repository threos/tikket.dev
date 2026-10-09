import { describe, expect, it } from "vitest";
import { getWebsiteHostVariants, getWebsiteOnlyHost, resolveLandingMode } from "./landingHost";

const split = { websiteUrl: "https://tikket.dev", webAppUrl: "https://app.tikket.dev" };
const single = { websiteUrl: "https://tikket.dev", webAppUrl: "https://tikket.dev" };

describe("getWebsiteOnlyHost", () => {
  it("returns the website host when it differs from the app host", () => {
    expect(getWebsiteOnlyHost({ enabled: true, ...split })).toBe("tikket.dev");
  });

  it("returns null when the landing page is disabled", () => {
    expect(getWebsiteOnlyHost({ enabled: false, ...split })).toBeNull();
  });

  it("returns null when website and app share a host", () => {
    expect(getWebsiteOnlyHost({ enabled: true, ...single })).toBeNull();
  });

  it("returns null for missing or invalid URLs", () => {
    expect(getWebsiteOnlyHost({ enabled: true, webAppUrl: "https://app.tikket.dev" })).toBeNull();
    expect(getWebsiteOnlyHost({ enabled: true, websiteUrl: "not a url", webAppUrl: "x" })).toBeNull();
  });
});

describe("resolveLandingMode", () => {
  it("is off when disabled", () => {
    expect(resolveLandingMode({ enabled: false, ...split, requestHost: "tikket.dev" })).toBe("off");
  });

  it("serves the landing page on the website host, ignoring port and case", () => {
    expect(resolveLandingMode({ enabled: true, ...split, requestHost: "Tikket.dev:443" })).toBe("website");
  });

  it("treats the www and apex forms of the website host the same", () => {
    expect(resolveLandingMode({ enabled: true, ...split, requestHost: "www.tikket.dev" })).toBe("website");
    expect(
      resolveLandingMode({
        enabled: true,
        websiteUrl: "https://www.tikket.dev",
        webAppUrl: "https://app.tikket.dev",
        requestHost: "tikket.dev",
      })
    ).toBe("website");
  });

  it("keeps the app host on the login flow when domains are split", () => {
    expect(resolveLandingMode({ enabled: true, ...split, requestHost: "app.tikket.dev" })).toBe("off");
  });

  it("uses single-domain mode when website and app share a host", () => {
    expect(resolveLandingMode({ enabled: true, ...single, requestHost: "tikket.dev" })).toBe("app");
  });
});

describe("getWebsiteHostVariants", () => {
  it("returns apex and www forms", () => {
    expect(getWebsiteHostVariants("tikket.dev")).toEqual(["tikket.dev", "www.tikket.dev"]);
    expect(getWebsiteHostVariants("www.tikket.dev")).toEqual(["tikket.dev", "www.tikket.dev"]);
  });
});
