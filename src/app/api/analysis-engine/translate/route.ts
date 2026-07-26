import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { translateAnalysisResult, type AnalysisEngineData, type AnalysisEngineResult } from "@/lib/analysis-engine";

export const maxDuration = 60;

const residualSchema = z.object({
  commercial_use_allowed: z.string(),
  tourist_use_allowed: z.string(),
  gross_buildable_area: z.string(),
  saleable_area: z.string(),
  estimated_residential_units: z.string(),
  estimated_hotel_rooms: z.string(),
  estimated_tourist_apartments: z.string(),
  commercial_area: z.string(),
  parking_spaces: z.string(),
  construction_cost_assumption_eur_m2: z.string(),
  total_construction_cost: z.string(),
  gross_development_value: z.string(),
  developer_margin: z.string(),
  residual_land_value: z.string(),
  highest_and_best_use: z.string(),
});

const dataSchema = z
  .object({
    parcel_area: z.string(),
    existing_build_area: z.string(),
    existing_floors: z.string(),
    planning_zone: z.string(),
    urban_classification: z.string(),
    ordinance: z.string(),
    special_plan: z.string(),
    protection_level: z.string(),
    allowed_uses: z.array(z.string()),
    max_build_area: z.string(),
    remaining_buildability: z.string(),
    max_footprint: z.string(),
    max_height: z.string(),
    max_floors: z.string(),
    parking_required: z.string(),
    heritage_constraints: z.array(z.string()),
    planning_constraints: z.array(z.string()),
    development_options: z.array(z.string()),
    planning_risk: z.string(),
    overall_score: z.string(),
    residual_land_value: residualSchema.optional(),
  })
  .nullable();

const requestSchema = z.object({
  mode: z.enum(["knowledge", "web"]),
  report: z.string(),
  data: dataSchema,
  targetLanguage: z.enum(["en", "es", "he"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { mode, report, data, targetLanguage } = parsed.data;
  const result: AnalysisEngineResult = { mode, report, data: data as AnalysisEngineData | null };
  const translated = await translateAnalysisResult(result, targetLanguage);
  return NextResponse.json({ result: translated });
}
