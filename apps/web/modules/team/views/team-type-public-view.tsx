"use client";

import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerWebWrapper as Booker } from "@calcom/web/modules/bookings/components/BookerWebWrapper";
import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";
import type { TeamTypePageProps } from "@server/lib/team/[slug]/[type]/getServerSideProps";

export type PageProps = TeamTypePageProps;

export default function TeamTypePublicView({
  slug,
  isEmbed,
  user,
  booking,
  isBrandingHidden,
  entity,
  duration,
  durationConfig,
  eventData,
}: PageProps) {
  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
        <Booker
          eventData={eventData}
          username={user}
          eventSlug={slug}
          bookingData={booking}
          hideBranding={isBrandingHidden}
          isTeamEvent
          // Team slots default to API v2, a separate service Tikket doesn't run alongside the web app.
          useApiV2={false}
          entity={entity}
          duration={duration}
          durationConfig={durationConfig}
        />
      </main>
    </BookingPageErrorBoundary>
  );
}
