import { handleWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/handleWebhookScheduledTriggers";
import { isAuthorizedCronRequest } from "@calcom/lib/server/isAuthorizedCronRequest";
import prisma from "@calcom/prisma";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function handler(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  await handleWebhookScheduledTriggers(prisma);

  return NextResponse.json({ ok: true });
}

export const GET = defaultResponderForAppDir(handler);
export const POST = defaultResponderForAppDir(handler);
