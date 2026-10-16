import prisma from "@calcom/prisma";
import { z } from "zod";

const CACHE_TTL_MS = 5 * 60 * 1000;

const computeInstallCountsFromDB = async (): Promise<Record<string, number>> => {
  const mostPopularApps = z.array(z.object({ appId: z.string(), installCount: z.number() })).parse(
    await prisma.$queryRaw`
    SELECT
      c."appId",
      COUNT(*)::integer AS "installCount"
    FROM
      "Credential" c
    WHERE
      c."appId" IS NOT NULL
    GROUP BY
      c."appId"
    ORDER BY
      "installCount" DESC
    `
  );
  return mostPopularApps.reduce(
    (acc, { appId, installCount }) => {
      acc[appId] = installCount;
      return acc;
    },
    {} as Record<string, number>
  );
};

// An in-process cache instead of Next's `unstable_cache`: this is called from Pages Router API
// routes (tRPC `apps.integrations`), where `unstable_cache` throws "incrementalCache missing".
let cached: { expiresAt: number; counts: Promise<Record<string, number>> } | null = null;

const getInstallCountPerApp = async (): Promise<Record<string, number>> => {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.counts;

  const counts = computeInstallCountsFromDB();
  cached = { expiresAt: now + CACHE_TTL_MS, counts };
  counts.catch(() => {
    if (cached?.counts === counts) cached = null;
  });
  return counts;
};

export const resetInstallCountCache = () => {
  cached = null;
};

export default getInstallCountPerApp;
export { computeInstallCountsFromDB };
