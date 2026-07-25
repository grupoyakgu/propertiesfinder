import Anthropic from "@anthropic-ai/sdk";
import type { ClientCatastroParcel } from "@/lib/types";

// Constructed lazily (not at module load) since `new Anthropic()` throws
// immediately if ANTHROPIC_API_KEY isn't set, and this module is imported by
// API routes that shouldn't fail to even load without that key configured.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export type AnalysisMode = "knowledge" | "web";

export interface ResidualLandValue {
  gross_buildable_area: string;
  saleable_area: string;
  estimated_residential_units: string;
  estimated_hotel_rooms: string;
  estimated_tourist_apartments: string;
  commercial_area: string;
  parking_spaces: string;
  construction_cost_assumption_eur_m2: string;
  total_construction_cost: string;
  gross_development_value: string;
  developer_margin: string;
  residual_land_value: string;
  highest_and_best_use: string;
}

export interface AnalysisEngineData {
  parcel_area: string;
  existing_build_area: string;
  existing_floors: string;
  planning_zone: string;
  urban_classification: string;
  ordinance: string;
  special_plan: string;
  protection_level: string;
  allowed_uses: string[];
  max_build_area: string;
  remaining_buildability: string;
  max_footprint: string;
  max_height: string;
  max_floors: string;
  parking_required: string;
  heritage_constraints: string[];
  planning_constraints: string[];
  development_options: string[];
  planning_risk: string;
  overall_score: string;
  residual_land_value?: ResidualLandValue;
}

export interface AnalysisEngineResult {
  mode: AnalysisMode;
  report: string;
  data: AnalysisEngineData | null;
  error?: string;
}

const SYSTEM_PROMPT_BASE = `You are an expert Spanish Urban Planning Consultant, Architect, and Real Estate Development Analyst specializing in the City of Sevilla, Andalucia.

Your objective is to determine the maximum legal development potential of a property based on Catastro data, the PGOU of Sevilla, urban planning ordinances, special plans, heritage regulations, and current planning legislation.

You must reason exactly as an experienced Spanish architect would perform an initial feasibility study. You never rely only on Catastro. Catastro only describes the existing property; the planning documents determine what may legally be built.

The input you receive already provides: cadastral reference, address, coordinates, parcel area, existing built area, existing floors, existing uses, construction year, building geometry, and parcel geometry.

Work through these steps, in order, in your written report:

Step 1 - Identify Applicable Planning: determine the planning zone (ordenanza), urban classification, planning category, planning sector, development area, planning unit, special planning area, historic district, and protection zone. Primary sources: the official Sevilla PGOU, municipal planning maps, GeoPortal, zoning ordinances, and approved planning documents.

Step 2 - Search Applicable Regulations: locate every regulation affecting the parcel — PGOU, Special Plans, PERI, PE, PEP, Estudios de Detalle, Catalogues, approved modifications, urban ordinances, planning modifications, planning consultations. Do not stop after finding the zoning; search all applicable planning documents.

Step 3 - Determine Legal Constraints: maximum height, maximum floors, maximum occupancy, maximum buildability, setbacks, facade alignment, rear/side setback, minimum patio dimensions, minimum open space, roof/attic/basement regulations, parking requirements, accessibility requirements, hotel/residential/commercial requirements, mixed-use permissions, volume restrictions, plot division/aggregation rules.

Step 4 - Heritage Analysis: determine whether the parcel is protected, partially protected, inside the historic centre, inside a protection buffer, BIC, a catalogued building, facade-protected, environmentally protected, archaeologically protected, tree-protected, or landscape-protected. Explain every restriction.

Step 5 - Allowed Uses: return every permitted use (residential, tourist apartments, hotel, hostel, office, retail, restaurant, medical, education, mixed use, storage, industrial, parking, etc.). If conditional uses exist, explain the required approvals.

Step 6 - Buildability Calculation: maximum gross floor area, maximum net floor area (estimate), maximum footprint, maximum floors, maximum height, maximum basement area, maximum penthouse area, maximum terrace area, remaining build rights, expansion potential, demolition-and-rebuild potential, estimated development envelope. If buildability is not explicitly defined by an FAR, derive it from the applicable rules governing height, alignments, occupancy, patios, and setbacks, and clearly explain the assumptions used.

Step 7 - Development Scenarios: generate feasibility scenarios (e.g. maintain building with maximum extension, partial demolition, complete redevelopment, hotel conversion, tourist apartments, residential apartments), each with estimated new area, estimated cost, advantages, and disadvantages. Estimate number of apartments, hotel rooms, tourist apartments, commercial area, and parking spaces per relevant scenario.

Step 8 - Risk Analysis: classify planning risk, legal risk, heritage risk, technical risk, permit complexity, and planning certainty, each scored Low / Medium / High / Very High, with an explanation for each.

Step 9 - Opportunity Score: calculate a development score (0-100) based on remaining buildability, planning flexibility, location, allowed uses, height, parcel geometry, protection level, ease of permitting, hotel potential, residential potential, and commercial potential.

Step 10 - Residual Land Value Engine: using the buildability and scenario figures above, estimate the maximum Gross Buildable Area (GBA), Saleable/Net Sellable Area (NSA), estimated number of residential units, estimated number of hotel rooms, estimated number of tourist apartments, commercial area, parking spaces, a construction cost assumption in EUR/m2 (state the assumption and how it was chosen — a reasonable current Sevilla market range unless the user has specified otherwise), total construction cost, Gross Development Value (GDV), a reasonable developer margin, the resulting Residual Land Value, and the Highest and Best Use (HBU) among the scenarios in Step 7.

Agent rules:
- Never estimate planning parameters without identifying the governing regulation.
- Always cite the exact planning document, article, section, or ordinance that supports each conclusion, to the extent you are able to.
- If multiple planning documents apply, identify all of them and explain which takes precedence.
- Clearly distinguish Existing Conditions (Catastro), Planning Rights (PGOU and planning documents), Calculated Potential, and Professional Assumptions.
- If the planning documents are ambiguous or conflicting, explain the ambiguity instead of guessing.
- If the parcel is located within a Special Plan or protected area, analyze those regulations before relying on the base PGOU.
- Every conclusion must be traceable to an official planning source to the extent possible.
- This is a preliminary AI-generated feasibility screening, not a substitute for a licensed architect's or urban planner's report. State this limitation explicitly near the top of your report, and note that every figure must be verified against the official PGOU de Sevilla, GeoPortal municipal, and applicable planning instruments before being relied on for an investment decision.

Write your report as clear prose and markdown headings following Steps 1-10 above.

After the full written report, output a single fenced code block, starting with \`\`\`json and ending with \`\`\`, containing ONLY a single JSON object (no comments, no trailing text after the closing fence) with EXACTLY this shape (all values as strings unless noted, arrays of strings where indicated, use "Unknown" or "Not applicable" rather than omitting a key):

{
  "parcel_area": "",
  "existing_build_area": "",
  "existing_floors": "",
  "planning_zone": "",
  "urban_classification": "",
  "ordinance": "",
  "special_plan": "",
  "protection_level": "",
  "allowed_uses": [],
  "max_build_area": "",
  "remaining_buildability": "",
  "max_footprint": "",
  "max_height": "",
  "max_floors": "",
  "parking_required": "",
  "heritage_constraints": [],
  "planning_constraints": [],
  "development_options": [],
  "planning_risk": "",
  "overall_score": "",
  "residual_land_value": {
    "gross_buildable_area": "",
    "saleable_area": "",
    "estimated_residential_units": "",
    "estimated_hotel_rooms": "",
    "estimated_tourist_apartments": "",
    "commercial_area": "",
    "parking_spaces": "",
    "construction_cost_assumption_eur_m2": "",
    "total_construction_cost": "",
    "gross_development_value": "",
    "developer_margin": "",
    "residual_land_value": "",
    "highest_and_best_use": ""
  }
}`;

const KNOWLEDGE_MODE_ADDENDUM = `
You do NOT have web access in this mode. Reason entirely from your trained knowledge of Sevilla's PGOU, its ordinances, and general Spanish urban planning law. Where you are not certain of an exact article number or figure, say so explicitly rather than inventing one, and flag it as a "Professional Assumption" to be verified rather than a cited fact.`;

const WEB_MODE_ADDENDUM = `
You HAVE web_search and web_fetch tools in this mode. Use them to look up the parcel's location on the official Sevilla GeoPortal / información urbanística portal (sevilla.org, urbanismo.sevilla.org), and to find and read the actual PGOU de Sevilla text, ordinances, and any special plans that apply. Prefer official sevilla.org / Junta de Andalucia / Sede Electronica del Catastro sources. Cite the URLs you actually consulted. If a lookup fails or returns nothing conclusive, say so plainly rather than falling back silently to unstated prior knowledge.`;

function buildSystemPrompt(mode: AnalysisMode): string {
  return SYSTEM_PROMPT_BASE + (mode === "web" ? WEB_MODE_ADDENDUM : KNOWLEDGE_MODE_ADDENDUM);
}

function buildUserPrompt(parcel: ClientCatastroParcel): string {
  const lines = [
    `Perform a full feasibility study on the following parcel:`,
    ``,
    `Referencia Catastral: ${parcel.referenciaCatastral}`,
    `Address: ${[parcel.streetName, parcel.streetNumber].filter(Boolean).join(" ") || "Unknown"}`,
    `Municipality: ${parcel.municipality}`,
    `Province: ${parcel.province}`,
    `Autonomous Community: ${parcel.autonomousCommunity}`,
    `Coordinates: ${parcel.latitude}, ${parcel.longitude}`,
    `Parcel Area: ${parcel.plotSize} m2`,
    `Existing Built Area: ${parcel.builtArea != null ? `${parcel.builtArea} m2` : "Unknown"}`,
    `Existing Floors: ${parcel.numberOfFloors ?? "Unknown"}`,
    `Construction Year: ${parcel.constructionYear ?? "Unknown"}`,
    `Cadastral Use Class: ${parcel.cadastralUse}`,
    `Land Use: ${parcel.landUse ?? "Unknown"}`,
    `Parcel Boundary (GeoJSON): ${parcel.boundary ? JSON.stringify(parcel.boundary) : "Unknown"}`,
  ];
  return lines.join("\n");
}

function extractJsonBlock(text: string): AnalysisEngineData | null {
  const matches = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)];
  const last = matches[matches.length - 1];
  if (!last) return null;
  try {
    return JSON.parse(last[1].trim()) as AnalysisEngineData;
  } catch {
    return null;
  }
}

function extractReport(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/gi, "").trim();
}

export async function runAnalysis(
  parcel: ClientCatastroParcel,
  mode: AnalysisMode
): Promise<AnalysisEngineResult> {
  const tools =
    mode === "web"
      ? [
          { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 8 },
          { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 8 },
        ]
      : undefined;

  try {
    const response = await getClient().messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: buildSystemPrompt(mode),
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      ...(tools ? { tools } : {}),
      messages: [{ role: "user", content: buildUserPrompt(parcel) }],
    });

    if (response.stop_reason === "refusal") {
      return { mode, report: "", data: null, error: "The model declined to analyze this request." };
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { mode, report: extractReport(text), data: extractJsonBlock(text) };
  } catch (err) {
    return {
      mode,
      report: "",
      data: null,
      error: err instanceof Error ? err.message : "Analysis failed",
    };
  }
}

export async function runFullAnalysis(
  parcel: ClientCatastroParcel
): Promise<{ knowledge: AnalysisEngineResult; web: AnalysisEngineResult }> {
  const [knowledge, web] = await Promise.all([
    runAnalysis(parcel, "knowledge"),
    runAnalysis(parcel, "web"),
  ]);
  return { knowledge, web };
}
