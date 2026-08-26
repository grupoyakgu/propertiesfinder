import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAppSettings, setCustomPrompt, setMaxAnalysisPlots, setMaxWebSearches } from "@/lib/app-settings";

// App-wide configuration (as opposed to a per-user preference) — the
// Analysis Engine's plot-selection cap, web search limit, and its optional custom prompt.
// Admin-only, same gating as the rest of the Admin tab's routes.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const settings = await getAppSettings();
  return NextResponse.json({
    maxAnalysisPlots: settings.maxAnalysisPlots,
    maxWebSearches: settings.maxWebSearches,
    customPrompt: settings.customPrompt,
  });
}

// At least one field must be present — the settings are edited from
// separate controls in the Admin tab, each saved independently.
const patchSchema = z
  .object({
    maxAnalysisPlots: z.number().int().min(1).max(10).optional(),
    maxWebSearches: z.number().int().min(1).max(50).optional(),
    // Empty string is normalized to null below (clears the override) rather
    // than being stored as a meaningless empty override.
    customPrompt: z.string().max(100_000).nullable().optional(),
  })
  .refine((v) => v.maxAnalysisPlots !== undefined || v.maxWebSearches !== undefined || v.customPrompt !== undefined, {
    message: "No settings provided",
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

  let settings = await getAppSettings();
  if (parsed.data.maxAnalysisPlots !== undefined) {
    settings = await setMaxAnalysisPlots(parsed.data.maxAnalysisPlots);
  }
  if (parsed.data.maxWebSearches !== undefined) {
    settings = await setMaxWebSearches(parsed.data.maxWebSearches);
  }
  if (parsed.data.customPrompt !== undefined) {
    const trimmed = parsed.data.customPrompt?.trim() || null;
    settings = await setCustomPrompt(trimmed);
  }

  return NextResponse.json({
    maxAnalysisPlots: settings.maxAnalysisPlots,
    maxWebSearches: settings.maxWebSearches,
    customPrompt: settings.customPrompt,
  });
}
