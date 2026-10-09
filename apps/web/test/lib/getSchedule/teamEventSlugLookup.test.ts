import {
  createBookingScenario,
  TestData,
  Timezones,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { describe, expect, test, vi } from "vitest";
import { setupAndTeardown } from "./setupAndTeardown";

const plus1DateString = "2024-05-22";
const plus2DateString = "2024-05-23";

const sharedEventSlug = "intro-call";

async function createTwoTeamsWithSameEventSlug() {
  await createBookingScenario({
    eventTypes: [
      {
        id: 1,
        slug: sharedEventSlug,
        length: 60,
        slotInterval: 60,
        teamId: 1,
        schedulingType: "ROUND_ROBIN",
        hosts: [{ userId: 101, isFixed: false }],
      },
      {
        id: 2,
        slug: sharedEventSlug,
        length: 60,
        slotInterval: 60,
        teamId: 2,
        schedulingType: "ROUND_ROBIN",
        hosts: [{ userId: 102, isFixed: false }],
      },
    ],
    users: [
      {
        ...TestData.users.example,
        id: 101,
        username: "alice",
        email: "alice@example.com",
        schedules: [TestData.schedules.IstMorningShift],
        teams: [{ membership: { accepted: true }, team: { id: 1, name: "Team A", slug: "team-a" } }],
      },
      {
        ...TestData.users.example,
        id: 102,
        username: "bob",
        email: "bob@example.com",
        schedules: [TestData.schedules.IstEveningShift],
        defaultScheduleId: 2,
        teams: [{ membership: { accepted: true }, team: { id: 2, name: "Team B", slug: "team-b" } }],
      },
    ],
  });
}

function getSlotTimes(result: { slots: Record<string, { time: string }[]> }) {
  return (result.slots[plus2DateString] ?? []).map((slot) => slot.time);
}

describe("getSchedule - team event lookup by team slug", () => {
  const availableSlotsService = getAvailableSlotsService();
  setupAndTeardown();

  const buildInput = (teamSlug: string) => ({
    usernameList: [teamSlug],
    eventTypeSlug: sharedEventSlug,
    startTime: `${plus1DateString}T18:30:00.000Z`,
    endTime: `${plus2DateString}T18:29:59.999Z`,
    timeZone: Timezones["+5:30"],
    isTeamEvent: true,
    orgSlug: null,
  });

  test("resolves the event type of the requested team when two teams share an event slug", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");
    await createTwoTeamsWithSameEventSlug();

    const teamASchedule = await availableSlotsService.getAvailableSlots({ input: buildInput("team-a") });
    const teamBSchedule = await availableSlotsService.getAvailableSlots({ input: buildInput("team-b") });

    // Team A's only host works the IST morning shift, Team B's only host the IST evening shift.
    expect(getSlotTimes(teamASchedule)).toContain("2024-05-23T04:30:00.000Z");
    expect(getSlotTimes(teamASchedule)).not.toContain("2024-05-23T15:30:00.000Z");
    expect(getSlotTimes(teamBSchedule)).toContain("2024-05-23T15:30:00.000Z");
    expect(getSlotTimes(teamBSchedule)).not.toContain("2024-05-23T04:30:00.000Z");
    vi.useRealTimers();
  });

  test("throws NOT_FOUND for an unknown team slug instead of falling back to any event with that slug", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");
    await createTwoTeamsWithSameEventSlug();

    await expect(
      availableSlotsService.getAvailableSlots({ input: buildInput("unknown-team") })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    vi.useRealTimers();
  });

  test("throws NOT_FOUND for an unknown username on a non-team event", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");
    await createTwoTeamsWithSameEventSlug();

    await expect(
      availableSlotsService.getAvailableSlots({
        input: { ...buildInput("nobody"), isTeamEvent: false },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    vi.useRealTimers();
  });
});
