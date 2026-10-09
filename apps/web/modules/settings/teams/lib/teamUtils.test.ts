import { describe, expect, it } from "vitest";
import { getInitials, getTrpcErrorCode, parseTeamIdParam } from "./teamUtils";

describe("parseTeamIdParam", () => {
  it("accepts positive integers", () => {
    expect(parseTeamIdParam("1")).toBe(1);
    expect(parseTeamIdParam("42")).toBe(42);
  });

  it("rejects anything that is not a plain positive integer", () => {
    for (const value of ["0", "-1", "1.5", "1e3", "abc", "", " 1", "99999999999", undefined]) {
      expect(parseTeamIdParam(value)).toBeNull();
    }
    expect(parseTeamIdParam(["1"])).toBeNull();
  });
});

describe("getInitials", () => {
  it("uses the first and last word", () => {
    expect(getInitials("Sales Team Europe")).toBe("SE");
    expect(getInitials("acme")).toBe("A");
  });

  it("ignores punctuation and keeps non-latin letters and digits", () => {
    expect(getInitials("Seeded Team (Marketing)")).toBe("SM");
    expect(getInitials("Équipe — Ventes")).toBe("ÉV");
    expect(getInitials("Team 42")).toBe("T4");
    expect(getInitials("(( ))")).toBe("?");
  });

  it("falls back to a placeholder", () => {
    expect(getInitials("   ")).toBe("?");
    expect(getInitials(null)).toBe("?");
  });
});

describe("getTrpcErrorCode", () => {
  it("reads the tRPC error code when present", () => {
    expect(getTrpcErrorCode({ data: { code: "FORBIDDEN" } })).toBe("FORBIDDEN");
    expect(getTrpcErrorCode({ data: null })).toBeUndefined();
    expect(getTrpcErrorCode(null)).toBeUndefined();
  });
});
