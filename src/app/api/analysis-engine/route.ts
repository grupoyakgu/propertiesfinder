import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientCatastroParcel } from "@/lib/types";
import {
  runAnalysisStreaming,
  type AnalysisEngineData,
  type AnalysisEngineResult,
  type AnalysisMode,
  type AnalysisProgressEvent,
} from "@/lib/analysis-engine";

// Raise the allowed function duration on platforms that respect it (e.g. Vercel) —
// running two Claude Opus 5 analyses (one of them tool-using) can take a few minutes.
export const maxDuration = 300;

const requestSchema = z.object({
  parcelId: z.string().min(1),
  modes: z.array(z.enum(["knowledge", "web"])).min(1).max(2),
});

// Persists a mode's result once it finishes successfully, so it's still there next
// time the user opens this parcel — no need to re-run the analysis just to see it
// again. Only successes are saved: a failed re-run shouldn't clobber a previously
// saved good result for that mode. Best-effort — this sits on top of an
// already-successful in-session result, so a persistence hiccup shouldn't surface
// as a failure to the user.
async function persistResult(
  userId: string,
  parcelId: string,
  mode: AnalysisMode,
  result: AnalysisEngineResult
) {
  if (result.error) return;
  try {
    const data = result.data as Prisma.InputJsonValue | null;
    await prisma.analysisResult.upsert({
      where: { userId_parcelId_mode: { userId, parcelId, mode } },
      update: { report: result.report, data: data ?? undefined },
      create: { userId, parcelId, mode, report: result.report, data: data ?? undefined },
    });
  } catch (err) {
    console.error("Failed to persist analysis result", err);
  }
}

// Returns the current user's saved (most recently successful) result for each
// mode of the given parcel, so the client can show them without a fresh run.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parcelId = new URL(request.url).searchParams.get("parcelId");
  if (!parcelId) {
    return new Response(JSON.stringify({ error: "parcelId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = await prisma.analysisResult.findMany({ where: { userId: user.id, parcelId } });
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

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parcel = await prisma.catastroParcel.findUnique({ where: { id: parsed.data.parcelId } });
  if (!parcel) {
    return new Response(JSON.stringify({ error: "Parcel not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientParcel = toClientCatastroParcel(parcel);
  const modes = parsed.data.modes as AnalysisMode[];
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
          runAnalysisStreaming(clientParcel, mode, (event) => {
            if (event.type === "result") persistResult(user.id, parcel.id, mode, event.result);
            send(mode, event);
          })
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
