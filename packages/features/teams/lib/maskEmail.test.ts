import { describe, expect, it } from "vitest";
import { maskEmail } from "./maskEmail";

describe("maskEmail", () => {
  it("keeps the first character and the domain", () => {
    expect(maskEmail("bob@example.com")).toBe("b•••@example.com");
  });

  it("hides the length of the local part", () => {
    expect(maskEmail("b@example.com")).toBe("b•••@example.com");
    expect(maskEmail("bartholomew.smith@example.com")).toBe("b•••@example.com");
  });

  it("splits on the last @ so quoted local parts cannot leak", () => {
    expect(maskEmail('"a@b"@example.com')).toBe('"•••@example.com');
  });

  it("handles an empty local part", () => {
    expect(maskEmail("@example.com")).toBe("•••@example.com");
  });

  it("masks values that are not email addresses", () => {
    expect(maskEmail("bob")).toBe("b•••");
    expect(maskEmail("")).toBe("•••");
  });
});
