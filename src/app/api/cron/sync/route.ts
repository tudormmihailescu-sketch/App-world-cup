import { NextRequest, NextResponse } from "next/server";
import { syncAllCompetitions } from "@/lib/sync";

export const dynamic = "force-dynamic";
// Give the sync enough room if several rounds need fetching.
export const maxDuration = 60;

/**
 * Scheduled sync endpoint. Triggered by the Vercel cron defined in
 * `vercel.json`, and safe to call from any external scheduler too.
 *
 * If `CRON_SECRET` is set, callers must present it as `Authorization: Bearer
 * <secret>` (Vercel's cron does this automatically). If it's unset, the
 * endpoint is open — it only refreshes public match data, so that's low risk.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncAllCompetitions();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
