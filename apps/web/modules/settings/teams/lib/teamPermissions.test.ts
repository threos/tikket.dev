import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  canDeleteTeam,
  canEditTeam,
  canInviteMembers,
  canLeaveTeam,
  canManageMember,
  countAcceptedOwners,
  getMemberActions,
} from "./teamPermissions";

describe("teamPermissions", () => {
  describe("canEditTeam / canInviteMembers / canDeleteTeam", () => {
    it("lets owners and admins edit and invite, but only owners delete", () => {
      expect(canEditTeam("OWNER")).toBe(true);
      expect(canEditTeam("ADMIN")).toBe(true);
      expect(canEditTeam("MEMBER")).toBe(false);
      expect(canEditTeam(undefined)).toBe(false);

      expect(canInviteMembers("OWNER")).toBe(true);
      expect(canInviteMembers("ADMIN")).toBe(true);
      expect(canInviteMembers("MEMBER")).toBe(false);

      expect(canDeleteTeam("OWNER")).toBe(true);
      expect(canDeleteTeam("ADMIN")).toBe(false);
      expect(canDeleteTeam("MEMBER")).toBe(false);
    });
  });

  describe("assignableRoles", () => {
    it("lets owners assign every role", () => {
      expect(assignableRoles("OWNER")).toEqual(["MEMBER", "ADMIN", "OWNER"]);
    });

    it("never lets admins assign the owner role", () => {
      expect(assignableRoles("ADMIN")).toEqual(["MEMBER", "ADMIN"]);
    });

    it("gives members and non-members nothing", () => {
      expect(assignableRoles("MEMBER")).toEqual([]);
      expect(assignableRoles(null)).toEqual([]);
    });
  });

  describe("canManageMember", () => {
    it("lets owners manage everyone", () => {
      expect(canManageMember("OWNER", "OWNER")).toBe(true);
      expect(canManageMember("OWNER", "ADMIN")).toBe(true);
      expect(canManageMember("OWNER", "MEMBER")).toBe(true);
    });

    it("lets admins manage members and admins but not owners", () => {
      expect(canManageMember("ADMIN", "MEMBER")).toBe(true);
      expect(canManageMember("ADMIN", "ADMIN")).toBe(true);
      expect(canManageMember("ADMIN", "OWNER")).toBe(false);
    });

    it("gives members no management rights", () => {
      expect(canManageMember("MEMBER", "MEMBER")).toBe(false);
      expect(canManageMember(undefined, "MEMBER")).toBe(false);
    });
  });

  describe("countAcceptedOwners", () => {
    it("ignores pending owners", () => {
      expect(
        countAcceptedOwners([
          { userId: 1, role: "OWNER", accepted: true },
          { userId: 2, role: "OWNER", accepted: false },
          { userId: 3, role: "ADMIN", accepted: true },
        ])
      ).toBe(1);
    });
  });

  describe("getMemberActions", () => {
    const member = { userId: 2, role: "MEMBER" as const, accepted: true };
    const owner = { userId: 1, role: "OWNER" as const, accepted: true };

    it("hides every action for a MEMBER actor", () => {
      expect(
        getMemberActions({ actorRole: "MEMBER", actorUserId: 3, target: member, acceptedOwnerCount: 1 })
      ).toEqual({ canChangeRole: false, canRemove: false, roleOptions: [] });
    });

    it("lets an admin change and remove a member", () => {
      expect(
        getMemberActions({ actorRole: "ADMIN", actorUserId: 3, target: member, acceptedOwnerCount: 1 })
      ).toEqual({ canChangeRole: true, canRemove: true, roleOptions: ["MEMBER", "ADMIN"] });
    });

    it("does not let an admin touch an owner", () => {
      expect(
        getMemberActions({ actorRole: "ADMIN", actorUserId: 3, target: owner, acceptedOwnerCount: 2 })
      ).toEqual({ canChangeRole: false, canRemove: false, roleOptions: [] });
    });

    it("protects the last owner from demotion and removal", () => {
      const actions = getMemberActions({
        actorRole: "OWNER",
        actorUserId: 9,
        target: owner,
        acceptedOwnerCount: 1,
      });
      expect(actions.canChangeRole).toBe(false);
      expect(actions.canRemove).toBe(false);
    });

    it("allows demoting an owner when another owner exists", () => {
      const actions = getMemberActions({
        actorRole: "OWNER",
        actorUserId: 9,
        target: owner,
        acceptedOwnerCount: 2,
      });
      expect(actions.canChangeRole).toBe(true);
      expect(actions.canRemove).toBe(true);
    });

    it("never offers removing yourself", () => {
      const actions = getMemberActions({
        actorRole: "OWNER",
        actorUserId: 1,
        target: owner,
        acceptedOwnerCount: 2,
      });
      expect(actions.canRemove).toBe(false);
      expect(actions.canChangeRole).toBe(true);
    });
  });

  describe("canLeaveTeam", () => {
    it("lets members and admins leave", () => {
      expect(canLeaveTeam("MEMBER", 1)).toBe(true);
      expect(canLeaveTeam("ADMIN", 1)).toBe(true);
    });

    it("blocks the last owner from leaving", () => {
      expect(canLeaveTeam("OWNER", 1)).toBe(false);
      expect(canLeaveTeam("OWNER", 2)).toBe(true);
    });

    it("defers to the server when the owner count is unknown", () => {
      expect(canLeaveTeam("OWNER", null)).toBe(true);
      expect(canLeaveTeam(undefined, 2)).toBe(false);
    });
  });
});
