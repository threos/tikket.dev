vi.mock("@calcom/lib/next-seo.config", () => ({
  default: {
    headSeo: {
      siteName: "Tikket",
    },
    defaultNextSeo: {
      title: "Tikket",
      description: "Scheduling infrastructure for everyone.",
    },
  },
  seoConfig: {
    headSeo: {
      siteName: "Tikket",
    },
  },
  buildSeoMeta: vi.fn().mockReturnValue({}),
}));
