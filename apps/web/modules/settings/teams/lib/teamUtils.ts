import type { TeamRoleDto } from "@calcom/features/teams/lib/types";
import { WEBSITE_URL } from "@calcom/lib/constants";

// Postgres `Int` columns cap at 2^31 - 1; anything above can't be a team id.
const MAX_TEAM_ID = 2_147_483_647;

export function parseTeamIdParam(value: string | string[] | undefined): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > MAX_TEAM_ID) return null;
  return id;
}

export function getTeamUrlPrefix(): string {
  return `${(WEBSITE_URL ?? "").replace(/^https?:\/\//, "")}/team/`;
}

export function getTeamPublicUrl(slug: string): string {
  return `${WEBSITE_URL ?? ""}/team/${slug}`;
}

export const TEAM_ROLE_LABEL_KEY: Record<TeamRoleDto, string> = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
};

export const TEAM_ROLE_DESCRIPTION_KEY: Record<TeamRoleDto, string> = {
  OWNER: "team_role_owner_description",
  ADMIN: "team_role_admin_description",
  MEMBER: "team_role_member_description",
};

// Letters change under case mapping and digits match \d; everything else (brackets, dashes, emoji)
// is skipped so names like "Sales (EMEA)" don't produce "S(".
function isLetterOrDigit(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase() || /\d/.test(char);
}

export function getInitials(name: string | null | undefined): string {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word).find(isLetterOrDigit))
    .filter((char): char is string => Boolean(char));
  if (!initials.length) return "?";
  const first = initials[0];
  const second = initials.length > 1 ? initials[initials.length - 1] : "";
  return `${first}${second}`.toUpperCase();
}

type ErrorWithCode = { data?: { code?: string } | null; message?: string } | null | undefined;

export function getTrpcErrorCode(error: ErrorWithCode): string | undefined {
  return error?.data?.code ?? undefined;
}
