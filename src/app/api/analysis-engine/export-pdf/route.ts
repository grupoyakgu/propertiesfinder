import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/server";
import { toClientCatastroParcel } from "@/lib/types";
import type { AnalysisEngineData, AnalysisEngineResult, AnalysisMode } from "@/lib/analysis-engine";
import { buildAnalysisReportPdf } from "@/lib/pdf/build-report";

// Loosely validated — this is the user's own already-generated analysis data
// being echoed back into their own PDF (never persisted, never shown to
// anyone else), so the bar here is "won't crash the renderer if a field is
// missing," not full schema enforcement. The section builders already treat
// every field as optional (falling back to "—" / empty lists).
const resultSchema = z.object({
  mode: z.enum(["knowledge", "web", "hybrid"]),
  report: z.string(),
  data: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().optional(),
});

const requestSchema = z.object({
  parcelIds: z.array(z.string().min(1)).min(1),
  results: z
    .object({
      knowledge: resultSchema.optional(),
      web: resultSchema.optional(),
      hybrid: resultSchema.optional(),
    })
    .refine((r) => r.knowledge || r.web || r.hybrid, { message: "Nothing to export" }),
});

// Vercel's default Node runtime is required here (react-pdf renders with
// Node-only APIs) — do not add `export const runtime = "edge"`.
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!user.permissions.includes("export_pdf")) {
    return new Response(JSON.stringify({ error: "PDF export is disabled for your account" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parcels = await prisma.catastroParcel.findMany({ where: { id: { in: parsed.data.parcelIds } } });
  if (parcels.length !== parsed.data.parcelIds.length) {
    return new Response(JSON.stringify({ error: "One or more parcels were not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const asResult = (r: z.infer<typeof resultSchema> | undefined): AnalysisEngineResult | null =>
    r ? { mode: r.mode, report: r.report, data: r.data as AnalysisEngineData | null, error: r.error } : null;

  const locale = await getServerLocale();
  const clientParcels = parsed.data.parcelIds.map((id) => toClientCatastroParcel(parcels.find((p) => p.id === id)!));
  const results: Partial<Record<AnalysisMode, AnalysisEngineResult>> = {};
  for (const mode of ["knowledge", "web", "hybrid"] as AnalysisMode[]) {
    const result = asResult(parsed.data.results[mode]);
    if (result) results[mode] = result;
  }

  try {
    const buffer = await buildAnalysisReportPdf({
      parcels: clientParcels,
      results,
      locale,
    });

    const filename = `${clientParcels.map((p) => p.referenciaCatastral).join("-")}-grupo-yakgu-report.pdf`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Failed to generate PDF report", err);
    return new Response(JSON.stringify({ error: "Failed to generate the PDF report" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
