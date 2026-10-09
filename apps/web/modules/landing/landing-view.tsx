"use client";

import { LandingFeatures } from "./components/LandingFeatures";
import { LandingFooter } from "./components/LandingFooter";
import { LandingHeader } from "./components/LandingHeader";
import { LandingHero } from "./components/LandingHero";
import type { PreviewHost } from "./lib/previewHosts";

export default function LandingView({ previewHosts }: { previewHosts: PreviewHost[] }) {
  return (
    <div className="bg-default text-default flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero previewHosts={previewHosts} />
        <LandingFeatures />
      </main>
      <LandingFooter />
    </div>
  );
}
