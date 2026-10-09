// ORM-agnostic DTOs shared by the teams services, the `viewer.teams` tRPC router and the web UI.

export type TeamRoleDto = "MEMBER" | "ADMIN" | "OWNER";

export type RRResetIntervalDto = "MONTH" | "DAY";

export type RRTimestampBasisDto = "CREATED_AT" | "START_TIME";

export type TeamDto = {
  id: number;
  name: string;
  slug: string | null;
  bio: string | null;
  logoUrl: string | null;
  isPrivate: boolean;
  hideBookATeamMember: boolean;
  rrResetInterval: RRResetIntervalDto;
  rrTimestampBasis: RRTimestampBasisDto;
};

export type TeamWithMembershipDto = TeamDto & {
  role: TeamRoleDto;
  accepted: boolean;
  memberCount: number;
};

export type TeamMemberDto = {
  membershipId: number;
  userId: number;
  name: string | null;
  // Masked (e.g. "b•••@example.com") while `accepted` is false, so an invite can't be used to look up
  // someone's address.
  email: string;
  username: string | null;
  avatarUrl: string | null;
  role: TeamRoleDto;
  accepted: boolean;
};

export type TeamInviteStatusDto = "invited_existing_user" | "invited_new_user" | "already_member";

export type TeamInviteResultDto = {
  status: TeamInviteStatusDto;
  // Shareable link so admins can deliver the invite themselves when email is not configured.
  inviteLink: string | null;
  emailSent: boolean;
};

export type PublicTeamMemberDto = {
  userId: number;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type PublicTeamEventTypeDto = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  length: number;
  schedulingType: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null;
  hosts: PublicTeamMemberDto[];
};

export type PublicTeamProfileDto = {
  id: number;
  name: string;
  slug: string;
  bio: string | null;
  logoUrl: string | null;
  isPrivate: boolean;
  hideBranding: boolean;
  theme: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
  // Empty when the team is private.
  members: PublicTeamMemberDto[];
  eventTypes: PublicTeamEventTypeDto[];
};
