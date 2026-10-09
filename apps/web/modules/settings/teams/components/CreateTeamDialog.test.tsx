import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTeamDialog } from "./CreateTeamDialog";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@calcom/lib/constants", async () => ({
  ...(await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants")),
  WEBSITE_URL: "https://tikket.test",
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));

vi.mock("@calcom/ui/components/toast", () => ({ showToast: vi.fn() }));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({ viewer: { teams: { list: { invalidate: async () => undefined } } } }),
    viewer: {
      teams: {
        create: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) },
      },
    },
  },
}));

function renderDialog() {
  render(<CreateTeamDialog open onOpenChange={vi.fn()} />);
  return {
    nameInput: screen.getByLabelText("team_name") as HTMLInputElement,
    slugInput: screen.getByLabelText("team_url") as HTMLInputElement,
  };
}

describe("CreateTeamDialog", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.push.mockReset();
  });

  it("shows the public team URL prefix", () => {
    renderDialog();
    expect(screen.getByText("tikket.test/team/")).toBeInTheDocument();
  });

  it("derives the slug from the team name while the slug is untouched", () => {
    const { nameInput, slugInput } = renderDialog();

    fireEvent.change(nameInput, { target: { value: "Sales Team Europe" } });

    expect(slugInput.value).toBe("sales-team-europe");
  });

  it("stops deriving the slug once the user edits it manually", () => {
    const { nameInput, slugInput } = renderDialog();

    fireEvent.change(nameInput, { target: { value: "Sales" } });
    fireEvent.change(slugInput, { target: { value: "Custom Slug" } });
    expect(slugInput.value).toBe("custom-slug");

    fireEvent.change(nameInput, { target: { value: "Sales Team" } });
    expect(slugInput.value).toBe("custom-slug");
  });

  it("submits the trimmed name and normalized slug", async () => {
    const { nameInput } = renderDialog();

    fireEvent.change(nameInput, { target: { value: "  Sales Team  " } });
    fireEvent.click(screen.getByTestId("create-team-submit"));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({ name: "Sales Team", slug: "sales-team" })
    );
  });

  it("requires a team name", async () => {
    renderDialog();

    fireEvent.click(screen.getByTestId("create-team-submit"));

    expect(await screen.findByText("must_enter_team_name")).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
