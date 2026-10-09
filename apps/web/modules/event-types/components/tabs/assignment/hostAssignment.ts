import type { Host } from "@calcom/features/eventtypes/lib/types";
import type { AssignmentStrategy } from "@calcom/features/teams/lib/assignmentStrategies";
import { DEFAULT_HOST_PRIORITY, DEFAULT_HOST_WEIGHT } from "@calcom/features/teams/lib/assignmentStrategies";

export type AssignableMember = {
  id: number;
  name: string | null;
  email: string;
  avatar: string;
};

const PRIORITY_LABEL_KEYS = ["lowest", "low", "medium", "high", "highest"] as const;

export function getPriorityLabelKey(priority: number | null | undefined): string {
  return PRIORITY_LABEL_KEYS[priority ?? DEFAULT_HOST_PRIORITY] ?? PRIORITY_LABEL_KEYS[DEFAULT_HOST_PRIORITY];
}

export function createHost(userId: number, isFixed: boolean): Host {
  return {
    userId,
    isFixed,
    priority: DEFAULT_HOST_PRIORITY,
    weight: DEFAULT_HOST_WEIGHT,
    groupId: null,
  };
}

export function splitHosts(hosts: readonly Host[]): { fixed: Host[]; rotating: Host[] } {
  const fixed: Host[] = [];
  const rotating: Host[] = [];
  for (const host of hosts) {
    if (host.isFixed) fixed.push(host);
    else rotating.push(host);
  }
  return { fixed, rotating };
}

/**
 * Share of round-robin bookings each rotating host is expected to receive, in whole percent.
 * Only meaningful for weighted round robin: the booking engine distributes proportionally to weight.
 */
export function computeBookingShares(rotatingHosts: readonly Pick<Host, "userId" | "weight">[]) {
  const shares = new Map<number, number>();
  let totalWeight = 0;
  for (const host of rotatingHosts) totalWeight += Math.max(0, host.weight ?? DEFAULT_HOST_WEIGHT);

  for (const host of rotatingHosts) {
    const weight = Math.max(0, host.weight ?? DEFAULT_HOST_WEIGHT);
    shares.set(host.userId, totalWeight === 0 ? 0 : Math.round((weight / totalWeight) * 100));
  }
  return shares;
}

/**
 * Returns the hosts adjusted to what the target strategy can express. Collective events need every
 * host to attend, so everyone becomes fixed. Coming from collective, everybody was fixed only
 * because of the strategy, so they become rotating hosts instead of leaving the rotation empty.
 */
export function applyStrategyToHosts(
  hosts: readonly Host[],
  from: AssignmentStrategy,
  to: AssignmentStrategy
): Host[] {
  if (!to.supportsFixedHosts) return hosts.map((host) => ({ ...host, isFixed: true }));
  if (!from.supportsFixedHosts) return hosts.map((host) => ({ ...host, isFixed: false }));
  return [...hosts];
}

/** True when moving to the target strategy would throw away fixed/rotating, priority or weight settings. */
export function strategyChangeLosesHostSettings(
  hosts: readonly Host[],
  from: AssignmentStrategy,
  to: AssignmentStrategy
): boolean {
  if (!from.supportsFixedHosts || to.supportsFixedHosts) return false;
  const { fixed, rotating } = splitHosts(hosts);
  if (fixed.length > 0 && rotating.length > 0) return true;
  return rotating.some(
    (host) =>
      (from.supportsPriority && (host.priority ?? DEFAULT_HOST_PRIORITY) !== DEFAULT_HOST_PRIORITY) ||
      (from.supportsWeights && (host.weight ?? DEFAULT_HOST_WEIGHT) !== DEFAULT_HOST_WEIGHT)
  );
}

/**
 * Makes every member a host while keeping settings of members that already are hosts. New members
 * join the rotation (or become required attendees for collective events).
 */
export function buildHostsForAllMembers(
  members: readonly Pick<AssignableMember, "id">[],
  currentHosts: readonly Host[],
  strategy: AssignmentStrategy
): Host[] {
  const hostsByUserId = new Map(currentHosts.map((host) => [host.userId, host]));
  return members.map((member) => {
    const existing = hostsByUserId.get(member.id);
    if (existing) return strategy.supportsFixedHosts ? existing : { ...existing, isFixed: true };
    return createHost(member.id, !strategy.supportsFixedHosts);
  });
}

/**
 * Replaces the hosts of one group (fixed or rotating) with the selected user ids. A member can only
 * be in one group, so selecting someone already in the other group moves them.
 */
export function setGroupMembers({
  hosts,
  isFixed,
  selectedUserIds,
  keepUnselectedAsOtherGroup,
}: {
  hosts: readonly Host[];
  isFixed: boolean;
  selectedUserIds: readonly number[];
  // With "assign all team members" everyone stays a host, so deselecting moves them to the other group.
  keepUnselectedAsOtherGroup: boolean;
}): Host[] {
  const selected = new Set(selectedUserIds);
  const hostsByUserId = new Map(hosts.map((host) => [host.userId, host]));
  const result: Host[] = [];

  for (const host of hosts) {
    if (selected.has(host.userId)) {
      result.push(host.isFixed === isFixed ? host : { ...host, isFixed });
      continue;
    }
    if (host.isFixed !== isFixed) result.push(host);
    else if (keepUnselectedAsOtherGroup) result.push({ ...host, isFixed: !isFixed });
  }

  for (const userId of selectedUserIds) {
    if (!hostsByUserId.has(userId)) result.push(createHost(userId, isFixed));
  }
  return result;
}

export type AssignmentWarning = "assignment_no_hosts_warning" | "assignment_no_rotating_hosts_warning";

export function getAssignmentWarning(
  hosts: readonly Host[],
  strategy: AssignmentStrategy
): AssignmentWarning | null {
  if (hosts.length === 0) return "assignment_no_hosts_warning";
  if (strategy.supportsFixedHosts && !hosts.some((host) => !host.isFixed)) {
    return "assignment_no_rotating_hosts_warning";
  }
  return null;
}

export function getMembersMissingFromHosts<T extends Pick<AssignableMember, "id">>(
  members: readonly T[],
  hosts: readonly Host[]
): T[] {
  const hostIds = new Set(hosts.map((host) => host.userId));
  return members.filter((member) => !hostIds.has(member.id));
}
