const MASK = "•••";

/**
 * Hides an email address while keeping it recognisable to someone who already knows it,
 * e.g. "bob@example.com" -> "b•••@example.com".
 */
export function maskEmail(email: string): string {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    return email ? `${email[0]}${MASK}` : MASK;
  }
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  return `${local.slice(0, 1)}${MASK}@${domain}`;
}
