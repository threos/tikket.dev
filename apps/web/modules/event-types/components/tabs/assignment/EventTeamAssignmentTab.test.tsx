import type { FormValues, Host } from "@calcom/features/eventtypes/lib/types";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { EventTeamAssignmentTab } from "./EventTeamAssignmentTab";

vi.mock("@calcom/lib/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@calcom/lib/constants")>()),
}));

vi.mock("@calcom/features/components/controlled-dialog", async () => ({
  Dialog: (await import("@calcom/ui/components/dialog")).Dialog,
}));

const members = [
  { id: 1, name: "Ada", email: "ada@example.com", avatar: "" },
  { id: 2, name: "Bob", email: "bob@example.com", avatar: "" },
  { id: 3, name: "Cy", email: "cy@example.com", avatar: "" },
];

const host = (userId: number, overrides: Partial<Host> = {}): Host => ({
  userId,
  isFixed: false,
  priority: 2,
  weight: 100,
  groupId: null,
  ...overrides,
});

type Defaults = Pick<FormValues, "schedulingType" | "isRRWeightsEnabled" | "hosts" | "assignAllTeamMembers">;

const renderTab = (defaults: Partial<Defaults> = {}) => {
  const formRef: { current: UseFormReturn<FormValues> | null } = { current: null };
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const form = useForm<FormValues>({
      defaultValues: {
        schedulingType: "ROUND_ROBIN",
        isRRWeightsEnabled: false,
        hosts: [],
        hostGroups: [],
        assignAllTeamMembers: false,
        ...defaults,
      },
    });
    formRef.current = form;
    // Mirrors the editor, which reads dirtyFields to build the update payload; RHF only tracks subscribed state.
    void form.formState.dirtyFields;
    return (
      <TooltipProvider>
        <FormProvider {...form}>{children}</FormProvider>
      </TooltipProvider>
    );
  };

  render(
    <EventTeamAssignmentTab
      orgId={null}
      team={{ id: 10, name: "Sales" }}
      teamMembers={members}
      eventType={{ id: 1, schedulingType: defaults.schedulingType ?? "ROUND_ROBIN" }}
    />,
    { wrapper: Wrapper }
  );

  const getForm = () => {
    if (!formRef.current) throw new Error("form not rendered");
    return formRef.current;
  };
  return { getForm };
};

const rowsIn = (testId: string) => within(screen.getByTestId(testId)).queryAllByTestId("assignment-host-row");

describe("EventTeamAssignmentTab", () => {
  it("sets schedulingType and isRRWeightsEnabled from the selected strategy", () => {
    const { getForm } = renderTab({ hosts: [host(1), host(2)] });

    fireEvent.click(screen.getByTestId("assignment-strategy-weighted_round_robin"));
    expect(getForm().getValues("schedulingType")).toBe("ROUND_ROBIN");
    expect(getForm().getValues("isRRWeightsEnabled")).toBe(true);
    expect(getForm().getFieldState("isRRWeightsEnabled").isDirty).toBe(true);

    fireEvent.click(screen.getByTestId("assignment-strategy-collective"));
    expect(getForm().getValues("schedulingType")).toBe("COLLECTIVE");
    expect(getForm().getValues("isRRWeightsEnabled")).toBe(false);
    expect(
      getForm()
        .getValues("hosts")
        .every((h) => h.isFixed)
    ).toBe(true);

    fireEvent.click(screen.getByTestId("assignment-strategy-round_robin"));
    expect(getForm().getValues("schedulingType")).toBe("ROUND_ROBIN");
    expect(
      getForm()
        .getValues("hosts")
        .every((h) => !h.isFixed)
    ).toBe(true);
  });

  it("groups fixed and round-robin hosts separately", () => {
    renderTab({ hosts: [host(1, { isFixed: true }), host(2), host(3)] });

    expect(rowsIn("fixed-hosts-group")).toHaveLength(1);
    expect(within(screen.getByTestId("fixed-hosts-group")).getByText("Ada")).toBeInTheDocument();
    expect(rowsIn("rotating-hosts-group")).toHaveLength(2);
    expect(screen.queryByTestId("collective-hosts-group")).not.toBeInTheDocument();
  });

  it("shows priorities but no weights for plain round robin", () => {
    renderTab({ hosts: [host(1), host(2)] });

    expect(screen.getAllByTestId("host-priority-button")).toHaveLength(2);
    expect(screen.queryByTestId("host-weight-button")).not.toBeInTheDocument();
  });

  it("shows weights and the share of bookings only for weighted round robin", () => {
    renderTab({
      isRRWeightsEnabled: true,
      hosts: [host(1, { isFixed: true }), host(2, { weight: 100 }), host(3, { weight: 300 })],
    });

    const rotating = within(screen.getByTestId("rotating-hosts-group"));
    expect(rotating.getAllByTestId("host-weight-button")).toHaveLength(2);
    expect(rotating.getAllByTestId("host-booking-share").map((el) => el.textContent)).toEqual([
      "booking_share_percent",
      "booking_share_percent",
    ]);
    expect(within(screen.getByTestId("fixed-hosts-group")).queryByTestId("host-weight-button")).toBeNull();
  });

  it("lists everyone as a required host without priority or weight for collective", () => {
    renderTab({
      schedulingType: "COLLECTIVE",
      hosts: [host(1, { isFixed: true }), host(2, { isFixed: true })],
    });

    expect(rowsIn("collective-hosts-group")).toHaveLength(2);
    expect(screen.queryByTestId("fixed-hosts-group")).not.toBeInTheDocument();
    expect(screen.queryByTestId("host-priority-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("host-weight-button")).not.toBeInTheDocument();
  });

  it("asks for confirmation before flattening fixed and round-robin hosts into collective", () => {
    const { getForm } = renderTab({ hosts: [host(1, { isFixed: true }), host(2)] });

    fireEvent.click(screen.getByTestId("assignment-strategy-collective"));
    expect(screen.getByText("switch_to_collective_warning")).toBeInTheDocument();
    expect(getForm().getValues("schedulingType")).toBe("ROUND_ROBIN");
  });

  it("warns when round robin has nobody to rotate", () => {
    renderTab({ hosts: [host(1, { isFixed: true })] });
    expect(
      within(screen.getByTestId("assignment-warning")).getByText("assignment_no_rotating_hosts_warning")
    ).toBeInTheDocument();
  });

  it("warns when there are no hosts", () => {
    renderTab({ schedulingType: "COLLECTIVE", hosts: [] });
    expect(
      within(screen.getByTestId("assignment-warning")).getByText("assignment_no_hosts_warning")
    ).toBeInTheDocument();
  });

  it("adds every team member as a host when assigning all team members", () => {
    const { getForm } = renderTab({ hosts: [host(2, { isFixed: true })] });

    fireEvent.click(screen.getByTestId("assign-all-team-members-toggle"));

    expect(getForm().getValues("assignAllTeamMembers")).toBe(true);
    expect(getForm().getFieldState("hosts").isDirty).toBe(true);
    expect(
      getForm()
        .getValues("hosts")
        .map((h) => [h.userId, h.isFixed])
    ).toEqual([
      [1, false],
      [2, true],
      [3, false],
    ]);
    expect(rowsIn("rotating-hosts-group")).toHaveLength(2);
    expect(within(screen.getByTestId("rotating-hosts-group")).queryByTestId("host-remove-button")).toBeNull();
  });

  it("removes a round-robin host", () => {
    const { getForm } = renderTab({ hosts: [host(1), host(2)] });

    fireEvent.click(
      within(screen.getByTestId("rotating-hosts-group")).getAllByTestId("host-remove-button")[0]
    );
    expect(
      getForm()
        .getValues("hosts")
        .map((h) => h.userId)
    ).toEqual([2]);
  });

  it("updates a host's weight through the weight dialog, including zero", () => {
    const { getForm } = renderTab({
      isRRWeightsEnabled: true,
      hosts: [host(1, { isFixed: true }), host(2), host(3)],
    });

    fireEvent.click(
      within(screen.getByTestId("rotating-hosts-group")).getAllByTestId("host-weight-button")[0]
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "confirm" }));

    const hosts = getForm().getValues("hosts");
    expect(hosts.find((h) => h.userId === 2)?.weight).toBe(0);
    expect(hosts.find((h) => h.userId === 3)?.weight).toBe(100);
    expect(hosts.find((h) => h.userId === 1)?.isFixed).toBe(true);
  });

  it("updates a host's priority through the priority dialog", async () => {
    const { getForm } = renderTab({ hosts: [host(1), host(2)] });

    fireEvent.click(
      within(screen.getByTestId("rotating-hosts-group")).getAllByTestId("host-priority-button")[1]
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(within(dialog).getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await within(dialog).findByText("highest"));
    fireEvent.click(within(dialog).getByRole("button", { name: "confirm" }));

    expect(
      getForm()
        .getValues("hosts")
        .find((h) => h.userId === 2)?.priority
    ).toBe(4);
    expect(getForm().getValues("hosts")).toHaveLength(2);
  });
});
