import dayjs from "@calcom/dayjs";
import { validateAndGetCorrectedUsernameInTeam } from "@calcom/features/auth/signup/utils/validateUsername";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";

export async function findTokenByToken({ token }: { token: string }) {
  const foundToken = await prisma.verificationToken.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      expires: true,
      teamId: true,
      identifier: true,
    },
  });

  if (!foundToken) {
    throw new HttpError({
      statusCode: 401,
      message: "Invalid Token",
    });
  }

  return foundToken;
}

/**
 * Only a token that still points at a team counts as a team invite. VerificationToken.team is
 * ON DELETE SET NULL, and other flows (e.g. email verification) also store tokens here, so a token
 * with teamId = null must not unlock invite-only behaviour such as signing up while signup is disabled.
 */
export async function isTeamInviteToken({ token }: { token: string }): Promise<boolean> {
  try {
    const { teamId } = await findTokenByToken({ token });
    return teamId !== null;
  } catch (error) {
    if (error instanceof HttpError) return false;
    throw error;
  }
}

// Tokens are issued for one email address; without this check anyone holding the link could sign up
// under any email. It applies to tokens whose team was deleted too, since those are still consumed.
export function throwIfTokenEmailMismatch({
  tokenIdentifier,
  email,
}: {
  tokenIdentifier: string;
  email: string;
}) {
  if (!tokenIdentifier.includes("@")) return;
  if (tokenIdentifier.trim().toLowerCase() === email.trim().toLowerCase()) return;
  throw new HttpError({
    statusCode: 403,
    message: "This invitation was sent to a different email address",
  });
}

export function throwIfTokenExpired(expires?: Date) {
  if (!expires) return;
  if (dayjs(expires).isBefore(dayjs())) {
    throw new HttpError({
      statusCode: 401,
      message: "Token expired",
    });
  }
}

export async function validateAndGetCorrectedUsernameForTeam({
  username,
  email,
  teamId,
  isSignup,
}: {
  username: string;
  email: string;
  teamId: number | null;
  isSignup: boolean;
}) {
  if (!teamId) return username;

  const teamUserValidation = await validateAndGetCorrectedUsernameInTeam(username, email, teamId, isSignup);
  if (!teamUserValidation.isValid) {
    throw new HttpError({
      statusCode: 409,
      message: "Username or email is already taken",
    });
  }
  if (!teamUserValidation.username) {
    throw new HttpError({
      statusCode: 422,
      message: "Invalid username",
    });
  }
  return teamUserValidation.username;
}
