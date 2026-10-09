import type { TeamWithMembershipDto } from "@calcom/features/teams/lib/types";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamsListingView from "./teams-listing-view";

const state = vi.hoisted(() => ({
  listResult: { data: undefined as unknown, isPending: true, error: null as unknown },
}));

vi.mock("@calcom/lib/constants", async () => ({
  ...(await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants")),
  WEBSITE_URL: "https://tikket.test",
}));

vi.mock("@calcom/ui/components/toast", () => ({ showToast: vi.fn() }));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings/teams",
}));

vi.mock("@calcom/trpc/react", () => {
  const invalidate = { invalidate: async () => undefined };
  const mutation = () => ({ mutate: () => undefined, isPending: false });
  return {
    trpc: {
      useUtils: () => ({ viewer: { teams: { list: invalidate, get: invalidate, listMembers: invalidate } } }),
      viewer: {
        teams: {
          list: { useQuery: () => ({ ...state.listResult, refetch: async () => undefined }) },
          create: { useMutation: mutation },
          leave: { useMutation: mutation },
          acceptInvite: { useMutation: mutation },
          declineInvite: { useMutation: mutation },
        },
      },
    },
  };
});

function buildTeam(overrides: Partial<TeamWithMembershipDto>): TeamWithMembershipDto {
  return {
    id: 1,
    name: "Sales",
    slug: "sales",
    bio: null,
    logoUrl: null,
    isPrivate: false,
    hideBookATeamMember: false,
    rrResetInterval: "MONTH",
    rrTimestampBasis: "CREATED_AT",
    role: "OWNER",
    accepted: true,
    memberCount: 3,
    ...overrides,
  };
}

describe("TeamsListingView", () => {
  beforeEach(() => {
    state.listResult = { data: undefined, isPending: true, error: null };
  });

  it("renders a skeleton while teams are loading", () => {
    const { container } = render(<TeamsListingView />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByTestId("teams-list")).not.toBeInTheDocument();
  });

  it("renders accepted teams and pending invitations separately", () => {
    state.listResult = {
      isPending: false,
      error: null,
      data: [
        buildTeam({ id: 1, name: "Sales", slug: "sales", role: "OWNER" }),
        buildTeam({ id: 2, name: "Support", slug: "support", role: "MEMBER" }),
        buildTeam({ id: 3, name: "Marketing", slug: "marketing", role: "ADMIN", accepted: false }),
      ],
    };

    render(<TeamsListingView />);

    const list = screen.getByTestId("teams-list");
    expect(within(list).getByText("Sales")).toBeInTheDocument();
    expect(within(list).getByText("Support")).toBeInTheDocument();
    expect(within(list).queryByText("Marketing")).not.toBeInTheDocument();
    expect(within(list).getByText(/tikket\.test\/team\/sales/)).toBeInTheDocument();
    expect(
      within(screen.getByTestId("team-list-item-1")).getByTestId("role-badge-owner")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("team-list-item-2")).getByTestId("role-badge-member")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sales" })).toHaveAttribute("href", "/settings/teams/1/profile");

    const invites = screen.getByTestId("pending-invites-section");
    expect(within(invites).getByText("pending_invites")).toBeInTheDocument();
    expect(within(invites).getByText("Marketing")).toBeInTheDocument();
    expect(within(invites).getByTestId("accept-invite-3")).toHaveTextContent("accept");
    expect(within(invites).getByTestId("decline-invite-3")).toHaveTextContent("decline");
  });

  it("shows the empty state when the user has no teams or invites", () => {
    state.listResult = { isPending: false, error: null, data: [] };

    render(<TeamsListingView />);

    const empty = screen.getByTestId("empty-screen");
    expect(within(empty).getByText("no_teams")).toBeInTheDocument();
    expect(within(empty).getByText("create_team_to_get_started")).toBeInTheDocument();
    expect(within(empty).getByTestId("empty-create-team")).toBeInTheDocument();
    expect(screen.queryByTestId("pending-invites-section")).not.toBeInTheDocument();
  });

  it("still lists invitations when there are no accepted teams yet", () => {
    state.listResult = {
      isPending: false,
      error: null,
      data: [buildTeam({ id: 7, name: "Ops", accepted: false, role: "MEMBER" })],
    };

    render(<TeamsListingView />);

    expect(within(screen.getByTestId("pending-invites-section")).getByText("Ops")).toBeInTheDocument();
    expect(screen.getByText("team_accept_invite_or_create")).toBeInTheDocument();
  });

  it("explains a forbidden error instead of crashing", () => {
    state.listResult = {
      isPending: false,
      data: undefined,
      error: { data: { code: "FORBIDDEN" }, message: "" },
    };

    render(<TeamsListingView />);

    expect(screen.getByText("dont_have_access_this_page")).toBeInTheDocument();
  });
});
