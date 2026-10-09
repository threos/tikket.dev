import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import PageWrapper from "@calcom/web/components/PageWrapperAppDir";
import LandingView from "@calcom/web/modules/landing/landing-view";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

// Hosted deployments opt in to the public landing page; self-hosted installs keep sending
// logged-out visitors straight to the login screen.
const isLandingPageEnabled = () => process.env.LANDING_PAGE_ENABLED === "true";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("landing_meta_title"),
    (t) => t("landing_meta_description"),
    undefined,
    undefined,
    "/"
  );
};

const RootPage = async () => {
  const headersList = await headers();
  const session = await getServerSession({ req: buildLegacyRequest(headersList, await cookies()) });

  if (!session?.user?.id) {
    if (!isLandingPageEnabled()) {
      redirect("/auth/login");
    }

    return (
      <PageWrapper requiresLicense={false} nonce={headersList.get("x-csp-nonce") ?? undefined}>
        <LandingView />
      </PageWrapper>
    );
  }

  // Check if user needs onboarding and redirect before going to event-types
  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    redirect(onboardingPath);
  }

  redirect("/event-types");
};

export default RootPage;
