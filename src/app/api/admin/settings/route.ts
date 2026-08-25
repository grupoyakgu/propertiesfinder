import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAppSettings, setMaxAnalysisPlots } from "@/lib/app-settings";

// App-wide configuration (as opposed to a per-user preference) — currently
// just the Analysis Engine's plot-selection cap. Admin-only, same gating as
// the rest of the Admin tab's routes.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const settings = await getAppSettings();
  return NextResponse.json({ maxAnalysisPlots: settings.maxAnalysisPlots });
}

const patchSchema = z.object({
  maxAnalysisPlots: z.number().int().min(1).max(10),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const settings = await setMaxAnalysisPlots(parsed.data.maxAnalysisPlots);
  return NextResponse.json({ maxAnalysisPlots: settings.maxAnalysisPlots });
}
