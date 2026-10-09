import { isAuthorizedCronRequest } from "@calcom/lib/server/isAuthorizedCronRequest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import tasker from "..";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  await tasker.cleanup();
  return NextResponse.json({ success: true });
}
