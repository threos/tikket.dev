import { timingSafeEqual } from "node:crypto";
import process from "node:process";

type CronRequest = {
  url: string;
  headers: { get(name: string): string | null };
};

function safeEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Accepts either the self-hosted `CRON_API_KEY` (raw `authorization` header or `apiKey` query param)
 * or Vercel Cron's `Authorization: Bearer $CRON_SECRET`.
 */
export function isAuthorizedCronRequest(request: CronRequest): boolean {
  const provided = request.headers.get("authorization") || new URL(request.url).searchParams.get("apiKey");
  if (!provided) return false;

  // An unset secret must never match, otherwise "Bearer undefined" would authorize the request.
  const cronApiKey = process.env.CRON_API_KEY;
  if (cronApiKey && safeEqual(provided, cronApiKey)) return true;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && safeEqual(provided, `Bearer ${cronSecret}`)) return true;

  return false;
}
