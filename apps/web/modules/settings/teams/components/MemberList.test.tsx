import type { TeamMemberDto, TeamRoleDto } from "@calcom/features/teams/lib/types";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberList } from "./MemberList";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@calcom/ui/components/toast", () => ({ showToast: vi.fn() }));

vi.mock("@calcom/ui/components/avatar", () => ({ Avatar: () => null }));

// Render the menu inline so the available actions can be asserted without driving Radix pointer events.
vi.mock("@calcom/ui/components/dropdown", () => ({
  Dropdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div role="menu">{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@calcom/trpc/react", () => {
  const mutation = () => ({ mutate: () => undefined, isPending: false });
  const invalidate = { invalidate: async () => undefined };
  return {
    trpc: {
      useUtils: () => ({ viewer: { teams: { list: invalidate, get: invalidate, listMembers: invalidate } } }),
      viewer: {
        teams: { removeMember: { useMutation: mutation }, changeMemberRole: { useMutation: mutation } },
      },
    },
  };
});

function buildMember(overrides: Partial<TeamMemberDto>): TeamMemberDto {
  return {
    membershipId: overrides.userId ?? 1,
    userId: 1,
    name: "Owner One",
    email: "owner@example.com",
    username: "owner",
    avatarUrl: null,
    role: "OWNER",
    accepted: true,
    ...overrides,
  };
}

const members: TeamMemberDto[] = [
  buildMember({ userId: 1, name: "Olivia Owner", email: "olivia@example.com", role: "OWNER" }),
  buildMember({ userId: 2, name: "Adam Admin", email: "adam@example.com", username: "adam", role: "ADMIN" }),
  buildMember({ userId: 3, name: "Mia Member", email: "mia@example.com", username: "mia", role: "MEMBER" }),
  buildMember({
    userId: 4,
    name: null,
    email: "pending@example.com",
    username: null,
    role: "MEMBER",
    accepted: false,
  }),
];

function renderList(actorRole: TeamRoleDto | null, actorUserId: number, searchQuery = "") {
  return render(
    <MemberList
      teamId={9}
      members={members}
      actorRole={actorRole}
      actorUserId={actorUserId}
      searchQuery={searchQuery}
    />
  );
}

describe("MemberList", () => {
  it("renders every member with role and pending badges", () => {
    renderList("MEMBER", 3);

    expect(screen.getByText("Olivia Owner")).toBeInTheDocument();
    expect(within(screen.getByTestId("team-member-2")).getByTestId("role-badge-admin")).toBeInTheDocument();
    const pendingRow = screen.getByTestId("team-member-4");
    expect(within(pendingRow).getByTestId("pending-badge")).toBeInTheDocument();
    expect(within(pendingRow).getAllByText(/pending@example\.com/).length).toBeGreaterThan(0);
    expect(within(screen.getByTestId("team-member-3")).getByText(/you/)).toBeInTheDocument();
  });

  it("hides all member actions from a MEMBER", () => {
    renderList("MEMBER", 3);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("remove_member")).not.toBeInTheDocument();
    expect(screen.queryByText("change_role")).not.toBeInTheDocument();
  });

  it("lets an ADMIN manage members and admins but not owners or themselves", () => {
    renderList("ADMIN", 2);

    expect(screen.queryByTestId("member-actions-1")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("team-member-3")).getByText("remove_member")).toBeInTheDocument();
    expect(within(screen.getByTestId("team-member-3")).getByText("change_role")).toBeInTheDocument();
    expect(within(screen.getByTestId("team-member-2")).queryByText("remove_member")).not.toBeInTheDocument();
  });

  it("protects the only owner from the owner's own menu", () => {
    renderList("OWNER", 1);

    expect(screen.queryByTestId("member-actions-1")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("team-member-2")).getByText("remove_member")).toBeInTheDocument();
  });

  it("filters members client-side by name, email or username", () => {
    renderList("OWNER", 1, "ADAM");

    expect(screen.getByTestId("team-member-2")).toBeInTheDocument();
    expect(screen.queryByTestId("team-member-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("team-member-3")).not.toBeInTheDocument();
  });

  it("shows an empty result when nothing matches the search", () => {
    renderList("OWNER", 1, "nobody");

    expect(screen.getByRole("status")).toHaveTextContent("no_members_found");
  });
});
