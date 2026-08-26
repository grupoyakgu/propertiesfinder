import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";
import { toClientCatastroParcel } from "@/lib/types";
import {
  runAnalysisStreaming,
  type AnalysisEngineData,
  type AnalysisEngineResult,
  type AnalysisMode,
  type AnalysisProgressEvent,
  type PromptSource,
} from "@/lib/analysis-engine";

// Raise the allowed function duration on platforms that respect it (e.g. Vercel) —
// running up to three Claude Opus 5 analyses (two of them tool-using) can take
// several minutes. 800s is the ceiling Vercel allows via this export on plans
// with Fluid Compute; if the account's actual plan caps lower, Vercel enforces
// its real limit regardless of this value.
export const maxDuration = 800;

// A stable, order-independent key for a set of parcel ids — see AnalysisResult's
// schema comment for why this exists instead of relying on a Postgres array
// unique index.
function parcelKeyFor(parcelIds: string[]): string {
  return [...parcelIds].sort().join(",");
}

const requestSchema = z.object({
  parcelIds: z.array(z.string().min(1)).min(1),
  modes: z.array(z.enum(["knowledge", "web", "hybrid"])).min(1).max(3),
  // See analysis-engine-types.ts's PromptSource. Defaults to "database" to use
  // the admin-configured custom prompt if available.
  promptSource: z.enum(["default", "database"]).optional().default("database"),
});

// Persists a mode's result once it finishes successfully, so it's still there next
// time the user opens this exact plot combination — no need to re-run the
// analysis just to see it again. Only successes are saved: a failed re-run
// shouldn't clobber a previously saved good result for that mode. Best-effort —
// this sits on top of an already-successful in-session result, so a persistence
// hiccup shouldn't surface as a failure to the user.
async function persistResult(
  userId: string,
  parcelIds: string[],
  parcelKey: string,
  mode: AnalysisMode,
  result: AnalysisEngineResult
) {
  if (result.error) return;
  try {
    const data = result.data as Prisma.InputJsonValue | null;
    await prisma.analysisResult.upsert({
      where: { userId_parcelKey_mode: { userId, parcelKey, mode } },
      update: { report: result.report, data: data ?? undefined, parcelIds },
      create: { userId, parcelIds, parcelKey, mode, report: result.report, data: data ?? undefined },
    });
  } catch (err) {
    console.error("Failed to persist analysis result", err);
  }
}

// Returns the current user's saved (most recently successful) result for each
// mode of the given exact set of parcels, so the client can show them without a
// fresh run.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!user.permissions.includes("analysis_engine")) {
    return new Response(JSON.stringify({ error: "Analysis Engine access is disabled for your account" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parcelIdsParam = new URL(request.url).searchParams.get("parcelIds");
  const parcelIds = parcelIdsParam ? parcelIdsParam.split(",").filter(Boolean) : [];
  if (parcelIds.length === 0) {
    return new Response(JSON.stringify({ error: "parcelIds is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = await prisma.analysisResult.findMany({
    where: { userId: user.id, parcelKey: parcelKeyFor(parcelIds) },
  });
  const results: Partial<Record<AnalysisMode, AnalysisEngineResult>> = {};
  for (const row of rows) {
    const mode = row.mode as AnalysisMode;
    results[mode] = { mode, report: row.report, data: row.data as AnalysisEngineData | null };
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!user.permissions.includes("analysis_engine")) {
    return new Response(JSON.stringify({ error: "Analysis Engine access is disabled for your account" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parcelIds = [...new Set(parsed.data.parcelIds)];

  // Enforced server-side regardless of what the selection UI already caps —
  // an admin can lower the limit at any time (see the Admin tab), and a
  // client already holding a larger selection shouldn't be able to slip it
  // through anyway. Also reads maxWebSearches and customPrompt when
  // promptSource is "database" — one read serves all.
  const { maxAnalysisPlots, maxWebSearches, customPrompt } = await getAppSettings();
  if (parcelIds.length > maxAnalysisPlots) {
    return new Response(
      JSON.stringify({ error: `You can analyze at most ${maxAnalysisPlots} plot(s) at a time` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // The Analysis Engine only ever runs against shared Opportunities, and only
  // while they're still worth exploring — enforced here regardless of what the
  // picker UI already filters out, since that's just client-side convenience.
  const opportunities = await prisma.favorite.findMany({
    where: { source: "catastro", propertyId: { in: parcelIds } },
  });
  const activeIds = new Set(
    opportunities.filter((o) => o.status !== "NOT_RELEVANT").map((o) => o.propertyId)
  );
  if (parcelIds.some((id) => !activeIds.has(id))) {
    return new Response(
      JSON.stringify({ error: "Every selected property must be an active Opportunity" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const parcels = await prisma.catastroParcel.findMany({ where: { id: { in: parcelIds } } });
  if (parcels.length !== parcelIds.length) {
    return new Response(JSON.stringify({ error: "One or more parcels were not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Keep the analyzed order stable and predictable (matches the order the
  // caller asked for) rather than whatever order the database happened to
  // return rows in.
  const clientParcels = parcelIds.map((id) => toClientCatastroParcel(parcels.find((p) => p.id === id)!));
  const parcelKey = parcelKeyFor(parcelIds);
  const modes = parsed.data.modes as AnalysisMode[];
  const promptSource: PromptSource = parsed.data.promptSource;
  const encoder = new TextEncoder();

  // Runs the requested mode(s) concurrently and multiplexes their progress events
  // into a single server-sent-events stream, each line tagged with which mode it's
  // for — this is what lets the client show live per-mode progress instead of a
  // single blocking request that only resolves once everything is completely done.
  const stream = new ReadableStream({
    async start(controller) {
      const send = (mode: AnalysisMode, event: AnalysisProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ mode, ...event })}\n\n`));
      };

      await Promise.allSettled(
        modes.map((mode) =>
          runAnalysisStreaming(
            clientParcels,
            mode,
            (event) => {
              if (event.type === "result") {
                persistResult(user.id, parcelIds, parcelKey, mode, event.result);
              }
              send(mode, event);
            },
            promptSource,
            customPrompt,
            maxWebSearches
          )
        )
      );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
