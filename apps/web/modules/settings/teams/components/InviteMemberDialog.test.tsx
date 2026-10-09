import type { TeamInviteResultDto, TeamRoleDto } from "@calcom/features/teams/lib/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteMemberDialog } from "./InviteMemberDialog";

type MutationOptions = {
  onSuccess?: (result: TeamInviteResultDto, variables: { emailOrUsername: string }) => Promise<void> | void;
};

const mocks = vi.hoisted(() => ({
  inviteResult: null as TeamInviteResultDto | null,
  mutate: vi.fn(),
  showToast: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@calcom/ui/components/toast", () => ({ showToast: mocks.showToast }));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({ viewer: { teams: { listMembers: { invalidate: async () => undefined } } } }),
    viewer: {
      teams: {
        inviteMember: {
          useMutation: (options: MutationOptions) => ({
            isPending: false,
            mutate: (variables: { emailOrUsername: string }) => {
              mocks.mutate(variables);
              if (mocks.inviteResult) void options.onSuccess?.(mocks.inviteResult, variables);
            },
          }),
        },
      },
    },
  },
}));

function renderDialog(actorRole: TeamRoleDto = "OWNER") {
  const onOpenChange = vi.fn();
  render(
    <InviteMemberDialog teamId={5} teamName="Sales" actorRole={actorRole} open onOpenChange={onOpenChange} />
  );
  return { onOpenChange };
}

function submitInvite(value: string) {
  fireEvent.change(screen.getByLabelText("email_or_username"), { target: { value } });
  fireEvent.click(screen.getByTestId("invite-member-submit"));
}

describe("InviteMemberDialog", () => {
  beforeEach(() => {
    mocks.inviteResult = null;
    mocks.mutate.mockReset();
    mocks.showToast.mockReset();
    mocks.writeText.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: mocks.writeText } });
  });

  it("only offers roles the actor may assign", () => {
    renderDialog("ADMIN");
    expect(screen.getByTestId("role-option-member")).toBeInTheDocument();
    expect(screen.getByTestId("role-option-admin")).toBeInTheDocument();
    expect(screen.queryByTestId("role-option-owner")).not.toBeInTheDocument();
  });

  it("lets owners invite other owners", () => {
    renderDialog("OWNER");
    expect(screen.getByTestId("role-option-owner")).toBeInTheDocument();
  });

  it("shows a copyable invite link when the email could not be sent", async () => {
    mocks.inviteResult = {
      status: "invited_new_user",
      inviteLink: "https://tikket.test/signup?token=abc",
      emailSent: false,
    };
    const { onOpenChange } = renderDialog();

    submitInvite("new@example.com");

    const panel = await screen.findByTestId("invite-link-panel");
    expect(panel).toBeInTheDocument();
    expect(screen.getByLabelText("team_invite_link_title")).toHaveValue(
      "https://tikket.test/signup?token=abc"
    );
    expect(mocks.mutate).toHaveBeenCalledWith({
      teamId: 5,
      emailOrUsername: "new@example.com",
      role: "MEMBER",
    });
    expect(mocks.showToast).toHaveBeenCalledWith("team_invite_created_share_link", "success");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByTestId("copy-invite-link"));
    await waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith("https://tikket.test/signup?token=abc"));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("invite_link_copied", "success"));
  });

  it("still shows the invite link for new users when the email was sent", async () => {
    mocks.inviteResult = {
      status: "invited_new_user",
      inviteLink: "https://tikket.test/signup?token=def",
      emailSent: true,
    };
    renderDialog();

    submitInvite("new@example.com");

    expect(await screen.findByTestId("invite-link-panel")).toHaveTextContent(
      "team_invite_link_description_email_sent"
    );
    expect(screen.getByLabelText("team_invite_link_title")).toHaveValue(
      "https://tikket.test/signup?token=def"
    );
  });

  it("closes with a success toast when the invite email was sent", async () => {
    mocks.inviteResult = { status: "invited_existing_user", inviteLink: null, emailSent: true };
    const { onOpenChange } = renderDialog();

    submitInvite("jane");

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mocks.showToast).toHaveBeenCalledWith("email_invite_team", "success");
    expect(screen.queryByTestId("invite-link-panel")).not.toBeInTheDocument();
  });

  it("keeps the dialog open and warns when the person is already a member", async () => {
    mocks.inviteResult = { status: "already_member", inviteLink: null, emailSent: false };
    const { onOpenChange } = renderDialog();

    submitInvite("jane@example.com");

    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith("team_invite_already_member", "warning")
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("does not submit an empty invite", async () => {
    renderDialog();

    submitInvite("   ");

    expect(await screen.findByText("error_required_field")).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
