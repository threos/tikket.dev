import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule, getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
import slugify from "@calcom/lib/slugify";
import type { EmbedProps } from "app/WithEmbedSSR";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

async function getTeamTypePageProps(context: GetServerSidePropsContext) {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) return { notFound: true } as const;

  const { slug: teamSlug, type: eventSlug } = parsedParams.data;
  const { rescheduleUid, duration: queryDuration } = context.query;
  const session = await getServerSession({ req: context.req });

  // Public team URLs never carry an org context, which scopes the lookup to top-level teams,
  // matching how the slots endpoint resolves the same team + event slug pair.
  const eventData = await EventRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug,
      isTeamEvent: true,
      org: null,
      fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
    },
    session?.user?.id
  );

  // Managed event types are templates for members' own event types and are not bookable as a team.
  if (!eventData || !eventData.team || eventData.schedulingType === "MANAGED") {
    return { notFound: true } as const;
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const isBrandingHidden = eventData.teamId ? await getHideBranding({ teamId: eventData.teamId }) : false;

  return {
    props: {
      eventData,
      entity: { ...eventData.entity, eventTypeId: eventData.id },
      duration: getMultipleDurationValue(
        eventData.metadata?.multipleDuration,
        queryDuration,
        eventData.length
      ),
      durationConfig: eventData.metadata?.multipleDuration ?? [],
      booking,
      user: teamSlug,
      teamSlug,
      slug: eventSlug,
      isBrandingHidden,
      isTeamEvent: true as const,
      isSEOIndexable: !eventData.hidden,
    },
  };
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  return await getTeamTypePageProps(context);
};

export type TeamTypePageProps = Extract<
  Awaited<ReturnType<typeof getTeamTypePageProps>>,
  { props: unknown }
>["props"] &
  EmbedProps;
