import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientCatastroParcel } from "@/lib/types";
import { runAnalysisStreaming, type AnalysisMode, type AnalysisProgressEvent } from "@/lib/analysis-engine";

// Raise the allowed function duration on platforms that respect it (e.g. Vercel) —
// running two Claude Opus 5 analyses (one of them tool-using) can take a few minutes.
export const maxDuration = 300;

const requestSchema = z.object({
  parcelId: z.string().min(1),
});

const MODES: AnalysisMode[] = ["knowledge", "web"];

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
  const encoder = new TextEncoder();

  // Runs both modes concurrently and multiplexes their progress events into a
  // single server-sent-events stream, each line tagged with which mode it's for —
  // this is what lets the client show live per-mode progress instead of a single
  // blocking request that only resolves once everything is completely done.
  const stream = new ReadableStream({
    async start(controller) {
      const send = (mode: AnalysisMode, event: AnalysisProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ mode, ...event })}\n\n`));
      };

      await Promise.allSettled(
        MODES.map((mode) => runAnalysisStreaming(clientParcel, mode, (event) => send(mode, event)))
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
