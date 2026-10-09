// Assignment strategies are product-level presets over the booking engine's existing fields
// (`schedulingType` + `isRRWeightsEnabled`). Keeping them in one registry lets the UI and API add
// strategies without scattering `schedulingType` conditionals through components and handlers.

export type AssignmentStrategyId = "collective" | "round_robin" | "weighted_round_robin";

export type AssignmentStrategyFields = {
  schedulingType: "COLLECTIVE" | "ROUND_ROBIN";
  isRRWeightsEnabled: boolean;
};

export type AssignmentStrategy = {
  id: AssignmentStrategyId;
  labelKey: string;
  descriptionKey: string;
  icon: "users" | "refresh-cw" | "sliders-horizontal";
  // Collective events need every host, so a "fixed vs rotating" split is meaningless there.
  supportsFixedHosts: boolean;
  supportsPriority: boolean;
  supportsWeights: boolean;
  fields: AssignmentStrategyFields;
};

const collective: AssignmentStrategy = {
  id: "collective",
  labelKey: "collective",
  descriptionKey: "assignment_strategy_collective_description",
  icon: "users",
  supportsFixedHosts: false,
  supportsPriority: false,
  supportsWeights: false,
  fields: { schedulingType: "COLLECTIVE", isRRWeightsEnabled: false },
};

const roundRobin: AssignmentStrategy = {
  id: "round_robin",
  labelKey: "round_robin",
  descriptionKey: "assignment_strategy_round_robin_description",
  icon: "refresh-cw",
  supportsFixedHosts: true,
  supportsPriority: true,
  supportsWeights: false,
  fields: { schedulingType: "ROUND_ROBIN", isRRWeightsEnabled: false },
};

const weightedRoundRobin: AssignmentStrategy = {
  id: "weighted_round_robin",
  labelKey: "weighted_round_robin",
  descriptionKey: "assignment_strategy_weighted_round_robin_description",
  icon: "sliders-horizontal",
  supportsFixedHosts: true,
  supportsPriority: true,
  supportsWeights: true,
  fields: { schedulingType: "ROUND_ROBIN", isRRWeightsEnabled: true },
};

export const ASSIGNMENT_STRATEGIES: readonly AssignmentStrategy[] = [roundRobin, weightedRoundRobin, collective];

const strategiesById = new Map<AssignmentStrategyId, AssignmentStrategy>(
  ASSIGNMENT_STRATEGIES.map((strategy) => [strategy.id, strategy])
);

export function getAssignmentStrategy(id: AssignmentStrategyId): AssignmentStrategy {
  const strategy = strategiesById.get(id);
  if (!strategy) throw new Error(`Unknown assignment strategy: ${id}`);
  return strategy;
}

export function resolveAssignmentStrategyId(eventType: {
  schedulingType: string | null | undefined;
  isRRWeightsEnabled?: boolean | null;
}): AssignmentStrategyId {
  if (eventType.schedulingType === "COLLECTIVE") return "collective";
  return eventType.isRRWeightsEnabled ? "weighted_round_robin" : "round_robin";
}

export const DEFAULT_HOST_PRIORITY = 2;
export const DEFAULT_HOST_WEIGHT = 100;
