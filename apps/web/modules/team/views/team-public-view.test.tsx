import type { PublicTeamProfileDto } from "@calcom/features/teams/lib/types";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamPublicView from "./team-public-view";

vi.mock("@calcom/lib/constants", async () => {
  return await vi.importActual("@calcom/lib/constants");
});

vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: vi.fn(),
}));

const alice = { userId: 1, name: "Alice", username: "alice", avatarUrl: null };
const bob = { userId: 2, name: "Bob", username: "bob", avatarUrl: null };

function buildTeam(overrides: Partial<PublicTeamProfileDto> = {}): PublicTeamProfileDto {
  return {
    id: 10,
    name: "Sales Team",
    slug: "sales",
    bio: "We sell things",
    logoUrl: null,
    isPrivate: false,
    hideBranding: false,
    theme: null,
    brandColor: null,
    darkBrandColor: null,
    members: [alice, bob],
    eventTypes: [
      {
        id: 100,
        slug: "demo",
        title: "Product demo",
        description: "A product demo",
        length: 30,
        schedulingType: "ROUND_ROBIN",
        hosts: [alice, bob],
      },
      {
        id: 101,
        slug: "kickoff",
        title: "Kickoff",
        description: null,
        length: 60,
        schedulingType: "COLLECTIVE",
        hosts: [alice],
      },
    ],
    ...overrides,
  };
}

function renderView(team: PublicTeamProfileDto) {
  return render(
    <TeamPublicView
      team={team}
      safeBio="<p>We sell things</p>"
      markdownStrippedBio="We sell things"
      descriptionsAsSafeHTML={{ 100: "<p>A product demo</p>" }}
    />
  );
}

describe("TeamPublicView", () => {
  beforeEach(() => {
    vi.mocked(useRouterQuery).mockReturnValue({ slug: "sales" });
  });

  it("renders the team and links each event type card to its team booking page", () => {
    renderView(buildTeam());

    expect(screen.getByTestId("team-name").textContent).toBe("Sales Team");
    const links = screen.getAllByTestId("event-type-link");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/team/sales/demo");
    expect(links[1].getAttribute("href")).toBe("/team/sales/kickoff");
    expect(screen.getByText("Product demo")).toBeTruthy();
    expect(screen.getByText("30m")).toBeTruthy();
    expect(screen.getByText("60m")).toBeTruthy();
    expect(screen.getByText("round_robin")).toBeTruthy();
    expect(screen.getByText("collective")).toBeTruthy();
    expect(screen.getByTestId("team-members")).toBeTruthy();
  });

  it("does not render the member list for a private team", () => {
    renderView(buildTeam({ isPrivate: true, members: [] }));

    expect(screen.queryByTestId("team-members")).toBeNull();
    expect(screen.getAllByTestId("event-type-link")).toHaveLength(2);
  });

  it("shows the empty state when the team has no event types", () => {
    renderView(buildTeam({ eventTypes: [] }));

    expect(screen.queryAllByTestId("event-type-link")).toHaveLength(0);
    expect(screen.getByText("no_event_types")).toBeTruthy();
  });
});
