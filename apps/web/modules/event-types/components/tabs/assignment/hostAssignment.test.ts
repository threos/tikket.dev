import type { Host } from "@calcom/features/eventtypes/lib/types";
import { getAssignmentStrategy } from "@calcom/features/teams/lib/assignmentStrategies";
import { describe, expect, it } from "vitest";
import {
  applyStrategyToHosts,
  buildHostsForAllMembers,
  computeBookingShares,
  createHost,
  getAssignmentWarning,
  getMembersMissingFromHosts,
  getPriorityLabelKey,
  setGroupMembers,
  splitHosts,
  strategyChangeLosesHostSettings,
} from "./hostAssignment";

const roundRobin = getAssignmentStrategy("round_robin");
const weighted = getAssignmentStrategy("weighted_round_robin");
const collective = getAssignmentStrategy("collective");

const host = (userId: number, overrides: Partial<Host> = {}): Host => ({
  ...createHost(userId, false),
  ...overrides,
});

describe("computeBookingShares", () => {
  it("splits bookings proportionally to weight", () => {
    const shares = computeBookingShares([
      { userId: 1, weight: 100 },
      { userId: 2, weight: 300 },
    ]);
    expect(shares.get(1)).toBe(25);
    expect(shares.get(2)).toBe(75);
  });

  it("gives equal shares for default weights", () => {
    const shares = computeBookingShares([host(1), host(2), host(3), host(4)]);
    expect(Array.from(shares.values())).toEqual([25, 25, 25, 25]);
  });

  it("returns 0 for everyone when all weights are zero", () => {
    const shares = computeBookingShares([
      { userId: 1, weight: 0 },
      { userId: 2, weight: 0 },
    ]);
    expect(shares.get(1)).toBe(0);
    expect(shares.get(2)).toBe(0);
  });

  it("treats negative weights as zero", () => {
    const shares = computeBookingShares([
      { userId: 1, weight: -50 },
      { userId: 2, weight: 50 },
    ]);
    expect(shares.get(1)).toBe(0);
    expect(shares.get(2)).toBe(100);
  });

  it("returns an empty map without hosts", () => {
    expect(computeBookingShares([]).size).toBe(0);
  });
});

describe("applyStrategyToHosts", () => {
  it("makes everyone fixed for collective", () => {
    const result = applyStrategyToHosts([host(1), host(2, { isFixed: true })], roundRobin, collective);
    expect(result.every((h) => h.isFixed)).toBe(true);
  });

  it("puts everyone into the rotation when leaving collective", () => {
    const result = applyStrategyToHosts(
      [host(1, { isFixed: true }), host(2, { isFixed: true })],
      collective,
      roundRobin
    );
    expect(result.every((h) => !h.isFixed)).toBe(true);
  });

  it("keeps the fixed/rotating split between round robin variants", () => {
    const hosts = [host(1, { isFixed: true }), host(2)];
    expect(applyStrategyToHosts(hosts, roundRobin, weighted)).toEqual(hosts);
  });
});

describe("strategyChangeLosesHostSettings", () => {
  it("warns when fixed and rotating hosts would be flattened", () => {
    expect(
      strategyChangeLosesHostSettings([host(1, { isFixed: true }), host(2)], roundRobin, collective)
    ).toBe(true);
  });

  it("warns when custom priorities would be dropped", () => {
    expect(strategyChangeLosesHostSettings([host(1, { priority: 4 })], roundRobin, collective)).toBe(true);
  });

  it("warns about custom weights only when coming from weighted round robin", () => {
    expect(strategyChangeLosesHostSettings([host(1, { weight: 50 })], weighted, collective)).toBe(true);
    expect(strategyChangeLosesHostSettings([host(1, { weight: 50 })], roundRobin, collective)).toBe(false);
  });

  it("does not warn for default settings or between round robin variants", () => {
    expect(strategyChangeLosesHostSettings([host(1), host(2)], roundRobin, collective)).toBe(false);
    expect(strategyChangeLosesHostSettings([host(1, { isFixed: true }), host(2)], roundRobin, weighted)).toBe(
      false
    );
  });
});

describe("buildHostsForAllMembers", () => {
  const members = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it("keeps existing host settings and adds the rest as rotating hosts", () => {
    const result = buildHostsForAllMembers(members, [host(2, { isFixed: true, priority: 4 })], roundRobin);
    expect(result).toEqual([host(1), host(2, { isFixed: true, priority: 4 }), host(3)]);
  });

  it("adds everyone as a required host for collective", () => {
    const result = buildHostsForAllMembers(members, [host(2)], collective);
    expect(result.every((h) => h.isFixed)).toBe(true);
    expect(result.map((h) => h.userId)).toEqual([1, 2, 3]);
  });

  it("drops hosts that are no longer members", () => {
    const result = buildHostsForAllMembers([{ id: 1 }], [host(1), host(9)], roundRobin);
    expect(result.map((h) => h.userId)).toEqual([1]);
  });
});

describe("setGroupMembers", () => {
  it("adds new fixed hosts and removes deselected ones", () => {
    const result = setGroupMembers({
      hosts: [host(1, { isFixed: true }), host(2)],
      isFixed: true,
      selectedUserIds: [3],
      keepUnselectedAsOtherGroup: false,
    });
    expect(result).toEqual([host(2), host(3, { isFixed: true })]);
  });

  it("moves a member between groups instead of duplicating them", () => {
    const result = setGroupMembers({
      hosts: [host(1), host(2)],
      isFixed: true,
      selectedUserIds: [1],
      keepUnselectedAsOtherGroup: false,
    });
    expect(result).toEqual([host(1, { isFixed: true }), host(2)]);
  });

  it("keeps deselected members as hosts of the other group when everyone must be a host", () => {
    const result = setGroupMembers({
      hosts: [host(1, { isFixed: true }), host(2)],
      isFixed: true,
      selectedUserIds: [],
      keepUnselectedAsOtherGroup: true,
    });
    expect(result).toEqual([host(1), host(2)]);
  });
});

describe("getAssignmentWarning", () => {
  it("warns when there are no hosts", () => {
    expect(getAssignmentWarning([], collective)).toBe("assignment_no_hosts_warning");
    expect(getAssignmentWarning([], roundRobin)).toBe("assignment_no_hosts_warning");
  });

  it("warns when round robin has nobody to rotate", () => {
    expect(getAssignmentWarning([host(1, { isFixed: true })], roundRobin)).toBe(
      "assignment_no_rotating_hosts_warning"
    );
  });

  it("is fine for collective with only fixed hosts", () => {
    expect(getAssignmentWarning([host(1, { isFixed: true })], collective)).toBeNull();
  });
});

describe("helpers", () => {
  it("splits fixed and rotating hosts", () => {
    const { fixed, rotating } = splitHosts([host(1, { isFixed: true }), host(2), host(3)]);
    expect(fixed.map((h) => h.userId)).toEqual([1]);
    expect(rotating.map((h) => h.userId)).toEqual([2, 3]);
  });

  it("maps priorities to labels, defaulting to medium", () => {
    expect(getPriorityLabelKey(0)).toBe("lowest");
    expect(getPriorityLabelKey(4)).toBe("highest");
    expect(getPriorityLabelKey(null)).toBe("medium");
    expect(getPriorityLabelKey(99)).toBe("medium");
  });

  it("finds members that are not hosts", () => {
    expect(getMembersMissingFromHosts([{ id: 1 }, { id: 2 }], [host(1)])).toEqual([{ id: 2 }]);
  });
});
