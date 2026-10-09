import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProfileOption } from "./CreateEventTypeDialog";
import { getNewEventTypeHref, NewEventTypeButton } from "./NewEventTypeButton";

const personal: ProfileOption = {
  teamId: null,
  label: "Ada Lovelace",
  image: "",
  membershipRole: null,
  slug: "ada",
  permissions: { canCreateEventType: true },
};

const team = (teamId: number, label: string): ProfileOption => ({
  teamId,
  label,
  image: "",
  membershipRole: "ADMIN",
  slug: label.toLowerCase(),
  permissions: { canCreateEventType: true },
});

const openMenu = (trigger: HTMLElement) => {
  // jsdom lacks PointerEvent, so open the Radix menu the way keyboard users do.
  fireEvent.keyDown(trigger, { key: "Enter" });
};

describe("NewEventTypeButton", () => {
  it("links straight to the personal create dialog when there is only one profile", () => {
    render(<NewEventTypeButton profileOptions={[personal]} />);

    const button = screen.getByTestId("new-event-type");
    expect(button.getAttribute("href")).toBe("?dialog=new&eventPage=ada");
  });

  it("lists the personal profile and every team the user can create event types for", async () => {
    render(<NewEventTypeButton profileOptions={[personal, team(7, "Sales"), team(8, "Support")]} />);

    openMenu(screen.getByTestId("new-event-type"));

    expect(await screen.findByTestId("new-event-type-option-personal")).toHaveAttribute(
      "href",
      "?dialog=new&eventPage=ada"
    );
    expect(screen.getByTestId("new-event-type-option-7")).toHaveAttribute(
      "href",
      "?dialog=new&eventPage=sales&teamId=7"
    );
    expect(screen.getByTestId("new-event-type-option-8")).toHaveTextContent("Support");
  });

  it("renders nothing without profiles", () => {
    const { container } = render(<NewEventTypeButton profileOptions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("getNewEventTypeHref", () => {
  it("adds the team id for team profiles", () => {
    expect(getNewEventTypeHref({ teamId: 3, slug: "team-a" })).toBe("?dialog=new&eventPage=team-a&teamId=3");
  });
});
