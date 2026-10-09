import prismock from "@calcom/testing/lib/__mocks__/prisma";
import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { describe, expect, test } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

const booker = getBooker({ email: "booker@example.com", name: "Booker" });

const hostEmails = {
  101: "host101@example.com",
  102: "host102@example.com",
  103: "host103@example.com",
} as const;

type HostId = keyof typeof hostEmails;

function getHost(id: HostId) {
  return getOrganizer({
    name: `Host ${id}`,
    email: hostEmails[id],
    id,
    defaultScheduleId: null,
    schedules: [TestData.schedules.IstWorkHours],
    credentials: [getGoogleCalendarCredential()],
    selectedCalendars: [TestData.selectedCalendars.google],
  });
}

// Round-robin statistics only count bookings created in the current interval (MONTH by default),
// so historic bookings are anchored to the start of the current month.
function createdAtInCurrentMonth(minutesAfterMonthStart: number) {
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return new Date(monthStart + minutesAfterMonthStart * 60 * 1000).toISOString();
}

// Hosts that existed before the current interval are not treated as "new" by the weights calibration.
const hostCreatedLastYear = new Date(Date.UTC(new Date().getUTCFullYear() - 1, 0, 1));

const { dateString: bookingDay } = getDate({ dateIncrement: 1 });
const { dateString: historyDay } = getDate({ dateIncrement: 2 });

const requestedSlot = {
  start: `${bookingDay}T05:00:00.000Z`,
  end: `${bookingDay}T05:30:00.000Z`,
};

function pastRoundRobinBooking({
  id,
  userId,
  minutesAfterMonthStart,
  hourOnHistoryDay,
}: {
  id: number;
  userId: HostId;
  minutesAfterMonthStart: number;
  hourOnHistoryDay: number;
}) {
  const hour = String(hourOnHistoryDay).padStart(2, "0");
  return {
    id,
    uid: `rr-history-${id}`,
    eventTypeId: 1,
    userId,
    status: BookingStatus.ACCEPTED,
    // Kept on a different day than `requestedSlot` so it only affects fairness, not availability.
    startTime: `${historyDay}T${hour}:00:00.000Z`,
    endTime: `${historyDay}T${hour}:30:00.000Z`,
    createdAt: createdAtInCurrentMonth(minutesAfterMonthStart),
    attendees: [{ email: `attendee-${id}@example.com`, timeZone: "Asia/Kolkata" }],
  };
}

function conflictingBooking({ id, userId }: { id: number; userId: HostId }) {
  return {
    id,
    uid: `conflict-${id}`,
    eventTypeId: 1,
    userId,
    status: BookingStatus.ACCEPTED,
    startTime: requestedSlot.start,
    endTime: requestedSlot.end,
    createdAt: createdAtInCurrentMonth(1),
    attendees: [{ email: `conflict-attendee-${id}@example.com`, timeZone: "Asia/Kolkata" }],
  };
}

function setupMocks() {
  mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
  mockCalendarToHaveNoBusySlots("googlecalendar", { create: { uid: "MOCK_ID" } });
}

async function bookRequestedSlot() {
  const handleNewBooking = getNewBookingHandler();
  const bookingData = getMockRequestDataForBooking({
    data: {
      eventTypeId: 1,
      start: requestedSlot.start,
      end: requestedSlot.end,
      responses: {
        email: booker.email,
        name: booker.name,
        location: { optionValue: "", value: BookingLocations.CalVideo },
      },
    },
  });
  const createdBooking = await handleNewBooking({ bookingData });
  const bookingInDb = await prismock.booking.findFirst({
    where: { uid: createdBooking.uid },
    select: { userId: true, attendees: { select: { email: true } } },
  });
  return { createdBooking, bookingInDb };
}

const apps = [TestData.apps["google-calendar"], TestData.apps["daily-video"]];

describe("Team round-robin assignment through RegularBookingService", () => {
  setupAndTeardown();

  test(
    "assigns the least recently booked available host",
    async () => {
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              users: [{ id: 101 }, { id: 102 }],
              hosts: [
                { userId: 101, isFixed: false, createdAt: hostCreatedLastYear },
                { userId: 102, isFixed: false, createdAt: hostCreatedLastYear },
              ],
            },
          ],
          // 101 was booked most recently, so 102 must win even though the id tie-break favours 101.
          bookings: [
            pastRoundRobinBooking({ id: 1, userId: 102, minutesAfterMonthStart: 10, hourOnHistoryDay: 4 }),
            pastRoundRobinBooking({ id: 2, userId: 101, minutesAfterMonthStart: 20, hourOnHistoryDay: 5 }),
          ],
          organizer: getHost(101),
          usersApartFromOrganizer: [getHost(102)],
          apps,
        })
      );
      setupMocks();

      const { createdBooking, bookingInDb } = await bookRequestedSlot();

      expect(createdBooking.luckyUsers).toEqual([102]);
      expect(bookingInDb?.userId).toBe(102);
    },
    timeout
  );

  test(
    "prefers the host with the higher priority over the least recently booked one",
    async () => {
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              users: [{ id: 101 }, { id: 102 }],
              hosts: [
                { userId: 101, isFixed: false, priority: 2, createdAt: hostCreatedLastYear },
                { userId: 102, isFixed: false, priority: 4, createdAt: hostCreatedLastYear },
              ],
            },
          ],
          // 102 was booked most recently, so without priorities 101 would be picked.
          bookings: [
            pastRoundRobinBooking({ id: 1, userId: 101, minutesAfterMonthStart: 10, hourOnHistoryDay: 4 }),
            pastRoundRobinBooking({ id: 2, userId: 102, minutesAfterMonthStart: 20, hourOnHistoryDay: 5 }),
          ],
          organizer: getHost(101),
          usersApartFromOrganizer: [getHost(102)],
          apps,
        })
      );
      setupMocks();

      const { createdBooking, bookingInDb } = await bookRequestedSlot();

      expect(createdBooking.luckyUsers).toEqual([102]);
      expect(bookingInDb?.userId).toBe(102);
    },
    timeout
  );

  test(
    "with weights enabled, assigns the host furthest below its weighted share",
    async () => {
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              isRRWeightsEnabled: true,
              users: [{ id: 101 }, { id: 102 }],
              hosts: [
                { userId: 101, isFixed: false, weight: 100, createdAt: hostCreatedLastYear },
                { userId: 102, isFixed: false, weight: 300, createdAt: hostCreatedLastYear },
              ],
            },
          ],
          // 102 has more bookings and the most recent one, yet with 3x the weight its target share
          // of 3 bookings is 2.25, so it is the under-booked host (101's target is only 0.75).
          bookings: [
            pastRoundRobinBooking({ id: 1, userId: 101, minutesAfterMonthStart: 10, hourOnHistoryDay: 4 }),
            pastRoundRobinBooking({ id: 2, userId: 102, minutesAfterMonthStart: 20, hourOnHistoryDay: 5 }),
            pastRoundRobinBooking({ id: 3, userId: 102, minutesAfterMonthStart: 30, hourOnHistoryDay: 6 }),
          ],
          organizer: getHost(101),
          usersApartFromOrganizer: [getHost(102)],
          apps,
        })
      );
      setupMocks();

      const { createdBooking, bookingInDb } = await bookRequestedSlot();

      expect(createdBooking.luckyUsers).toEqual([102]);
      expect(bookingInDb?.userId).toBe(102);
    },
    timeout
  );

  test(
    "with weights enabled and equal weights, assigns the host with fewer bookings",
    async () => {
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              isRRWeightsEnabled: true,
              users: [{ id: 101 }, { id: 102 }],
              hosts: [
                { userId: 101, isFixed: false, weight: 100, createdAt: hostCreatedLastYear },
                { userId: 102, isFixed: false, weight: 100, createdAt: hostCreatedLastYear },
              ],
            },
          ],
          bookings: [
            pastRoundRobinBooking({ id: 1, userId: 101, minutesAfterMonthStart: 10, hourOnHistoryDay: 4 }),
            pastRoundRobinBooking({ id: 2, userId: 101, minutesAfterMonthStart: 20, hourOnHistoryDay: 5 }),
            pastRoundRobinBooking({ id: 3, userId: 102, minutesAfterMonthStart: 30, hourOnHistoryDay: 6 }),
          ],
          organizer: getHost(101),
          usersApartFromOrganizer: [getHost(102)],
          apps,
        })
      );
      setupMocks();

      const { createdBooking } = await bookRequestedSlot();

      expect(createdBooking.luckyUsers).toEqual([102]);
    },
    timeout
  );

  test(
    "always includes the fixed host alongside exactly one round-robin host",
    async () => {
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              users: [{ id: 101 }, { id: 102 }, { id: 103 }],
              hosts: [
                { userId: 101, isFixed: true, createdAt: hostCreatedLastYear },
                { userId: 102, isFixed: false, createdAt: hostCreatedLastYear },
                { userId: 103, isFixed: false, createdAt: hostCreatedLastYear },
              ],
            },
          ],
          bookings: [
            pastRoundRobinBooking({ id: 1, userId: 102, minutesAfterMonthStart: 10, hourOnHistoryDay: 4 }),
          ],
          organizer: getHost(101),
          usersApartFromOrganizer: [getHost(102), getHost(103)],
          apps,
        })
      );
      setupMocks();

      const { createdBooking, bookingInDb } = await bookRequestedSlot();

      // The first fixed host is the organizer; the round-robin host joins as a team member.
      expect(bookingInDb?.userId).toBe(101);
      expect(createdBooking.luckyUsers).toEqual([103]);
      const attendeeEmails = bookingInDb?.attendees.map((attendee) => attendee.email) ?? [];
      expect(attendeeEmails).toContain(hostEmails[103]);
      expect(attendeeEmails).not.toContain(hostEmails[102]);
    },
    timeout
  );

  test(
    "skips a round-robin host that is busy at the requested time",
    async () => {
      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              users: [{ id: 101 }, { id: 102 }],
              hosts: [
                { userId: 101, isFixed: false, createdAt: hostCreatedLastYear },
                { userId: 102, isFixed: false, createdAt: hostCreatedLastYear },
              ],
            },
          ],
          // 101 would win on recency, but already has a meeting in the requested slot.
          bookings: [
            pastRoundRobinBooking({ id: 1, userId: 102, minutesAfterMonthStart: 30, hourOnHistoryDay: 4 }),
            conflictingBooking({ id: 2, userId: 101 }),
          ],
          organizer: getHost(101),
          usersApartFromOrganizer: [getHost(102)],
          apps,
        })
      );
      setupMocks();

      const { createdBooking, bookingInDb } = await bookRequestedSlot();

      expect(createdBooking.luckyUsers).toEqual([102]);
      expect(bookingInDb?.userId).toBe(102);
    },
    timeout
  );

  describe("COLLECTIVE", () => {
    const collectiveEventType = {
      id: 1,
      slotInterval: 30,
      length: 30,
      schedulingType: SchedulingType.COLLECTIVE,
      users: [{ id: 101 }, { id: 102 }],
      hosts: [
        { userId: 101, isFixed: true },
        { userId: 102, isFixed: true },
      ],
    };

    test(
      "books all hosts when every host is free",
      async () => {
        await createBookingScenario(
          getScenarioData({
            eventTypes: [collectiveEventType],
            organizer: getHost(101),
            usersApartFromOrganizer: [getHost(102)],
            apps,
          })
        );
        setupMocks();

        const { bookingInDb } = await bookRequestedSlot();

        expect(bookingInDb?.userId).toBe(101);
        const attendeeEmails = bookingInDb?.attendees.map((attendee) => attendee.email) ?? [];
        expect(attendeeEmails).toContain(hostEmails[102]);
      },
      timeout
    );

    test(
      "fails without creating a booking when one host is busy",
      async () => {
        await createBookingScenario(
          getScenarioData({
            eventTypes: [collectiveEventType],
            bookings: [conflictingBooking({ id: 1, userId: 102 })],
            organizer: getHost(101),
            usersApartFromOrganizer: [getHost(102)],
            apps,
          })
        );
        setupMocks();

        await expect(bookRequestedSlot()).rejects.toThrow(ErrorCode.FixedHostsUnavailableForBooking);

        const bookings = await prismock.booking.findMany({ select: { uid: true } });
        expect(bookings.map((booking) => booking.uid)).toEqual(["conflict-1"]);
      },
      timeout
    );
  });
});
