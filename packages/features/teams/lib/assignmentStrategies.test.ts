import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_STRATEGIES,
  getAssignmentStrategy,
  resolveAssignmentStrategyId,
} from "./assignmentStrategies";

describe("assignmentStrategies", () => {
  it("has unique ids", () => {
    const ids = ASSIGNMENT_STRATEGIES.map((strategy) => strategy.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("round-trips every strategy through its event type fields", () => {
    for (const strategy of ASSIGNMENT_STRATEGIES) {
      expect(resolveAssignmentStrategyId(strategy.fields)).toBe(strategy.id);
    }
  });

  it("resolves collective regardless of the weights flag", () => {
    expect(resolveAssignmentStrategyId({ schedulingType: "COLLECTIVE", isRRWeightsEnabled: true })).toBe(
      "collective"
    );
  });

  it("defaults unknown or missing scheduling types to round robin", () => {
    expect(resolveAssignmentStrategyId({ schedulingType: null })).toBe("round_robin");
    expect(resolveAssignmentStrategyId({ schedulingType: undefined, isRRWeightsEnabled: null })).toBe(
      "round_robin"
    );
  });

  it("only enables weights for weighted round robin", () => {
    expect(getAssignmentStrategy("weighted_round_robin").supportsWeights).toBe(true);
    expect(getAssignmentStrategy("round_robin").supportsWeights).toBe(false);
    expect(getAssignmentStrategy("collective").supportsWeights).toBe(false);
  });

  it("throws for an unknown id", () => {
    // @ts-expect-error -- deliberately passing an invalid id
    expect(() => getAssignmentStrategy("nope")).toThrow("Unknown assignment strategy: nope");
  });
});
