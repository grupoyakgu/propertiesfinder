import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Plot } from "@/generated/prisma/client";
import {
  developmentPotentialLabels,
  planningStatusLabels,
  landUseLabels,
  topographyLabels,
} from "@/lib/labels";
import { formatCurrency, formatArea, formatPercent } from "@/lib/utils";

const analysisSchema = z.object({
  score: z.number().describe("Overall investment attractiveness, 0-100"),
  recommendedUse: z.string().describe("The single best development use for this plot"),
  summary: z.string().describe("2-3 sentence investment thesis"),
  strengths: z.array(z.string()).describe("3-5 concrete strengths"),
  risks: z.array(z.string()).describe("3-5 concrete risks or red flags"),
  nextSteps: z.array(z.string()).describe("3-4 concrete due-diligence next steps"),
});

export type PlotAnalysis = z.infer<typeof analysisSchema> & {
  source: "claude" | "rule-based";
};

function buildPrompt(plot: Plot): string {
  return `Analyze this Spanish land/development plot as an acquisition expert would for a real estate investor.

Location: ${plot.address}, ${plot.municipality}, ${plot.province}, ${plot.autonomousCommunity}
Referencia Catastral: ${plot.referenciaCatastral}

Land: ${formatArea(plot.plotSize)} plot, ${formatArea(plot.builtArea)} built, land use ${landUseLabels.en[plot.landUse]}, topography ${topographyLabels.en[plot.topography]}
Buildability: max buildable area ${formatArea(plot.maxBuildableArea)}, ratio ${plot.buildabilityRatio}, occupancy ${formatPercent(plot.occupancyRatio)}
Planning: status ${planningStatusLabels.en[plot.planningStatus]}, zoning "${plot.zoning ?? "n/a"}", development potential: ${plot.developmentPotential.map((p) => developmentPotentialLabels.en[p]).join(", ")}
Restrictions: ${plot.restrictions.join("; ") || "none listed"}
Physical: corner=${plot.cornerPlot}, doubleFrontage=${plot.doubleFrontage}, existingBuilding=${plot.existingBuilding}, demolitionRequired=${plot.demolitionRequired}, vacantLand=${plot.vacantLand}

Investment: purchase price ${formatCurrency(plot.purchasePrice)} (${formatCurrency(plot.pricePerSqm)}/m2), estimated construction cost ${formatCurrency(plot.estimatedConstructionCost)}, expected ROI ${formatPercent(plot.expectedROI)}, expected yield ${formatPercent(plot.expectedYield)}, development margin ${formatPercent(plot.developmentMargin)}
Valor catastral: ${formatCurrency(plot.valorCatastral)}

Give a grounded, specific investment analysis. Do not restate the raw numbers back verbatim — synthesize them into judgment.`;
}

function ruleBasedAnalysis(plot: Plot): PlotAnalysis {
  const strengths: string[] = [];
  const risks: string[] = [];

  if ((plot.expectedROI ?? 0) >= 20) strengths.push("Projected ROI is well above typical Spanish development benchmarks");
  if ((plot.expectedYield ?? 0) >= 7) strengths.push("Strong expected rental/operational yield");
  if (plot.planningStatus === "URBAN") strengths.push("Urban planning status removes rezoning risk");
  if (plot.cornerPlot) strengths.push("Corner plot improves frontage and unit exposure");
  if (plot.vacantLand) strengths.push("Vacant land simplifies the development timeline");

  if (plot.planningStatus === "RURAL" || plot.planningStatus === "PROTECTED") {
    risks.push("Planning status limits or complicates buildability");
  }
  if (plot.planningStatus === "HISTORIC") risks.push("Heritage protection will constrain design and timeline");
  if (plot.demolitionRequired) risks.push("Demolition of the existing structure adds cost and time");
  if (plot.restrictions.length > 0) risks.push(`Documented restrictions: ${plot.restrictions[0]}`);
  if ((plot.expectedROI ?? 0) < 15) risks.push("Projected ROI is modest relative to development risk");

  const score = Math.max(
    0,
    Math.min(
      100,
      50 +
        (plot.expectedROI ?? 0) * 1.2 +
        (plot.planningStatus === "URBAN" ? 10 : plot.planningStatus === "DEVELOPABLE" ? 0 : -15) +
        (plot.demolitionRequired ? -5 : 0)
    )
  );

  return {
    score: Math.round(score),
    recommendedUse: developmentPotentialLabels.en[plot.developmentPotential[0] ?? "RESIDENTIAL"],
    summary: `${plot.title} in ${plot.municipality} shows a projected ROI of ${formatPercent(
      plot.expectedROI
    )} on a ${formatArea(plot.plotSize)} plot with ${planningStatusLabels.en[plot.planningStatus].toLowerCase()} planning status. This is a rule-based estimate — connect an ANTHROPIC_API_KEY for full AI analysis.`,
    strengths: strengths.length ? strengths : ["No standout strengths identified from structured data alone"],
    risks: risks.length ? risks : ["No major structured-data red flags identified"],
    nextSteps: [
      "Verify current planning classification directly with the municipal Ayuntamiento",
      "Commission an independent topographical and boundary survey",
      "Confirm construction cost estimate with a local quantity surveyor",
    ],
    source: "rule-based",
  };
}

export async function analyzePlotInvestment(plot: Plot): Promise<PlotAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return ruleBasedAnalysis(plot);
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system:
        "You are a senior real estate acquisition analyst specializing in Spanish land and development opportunities. Be concrete, cite specific figures given, and never hedge with generic disclaimers.",
      messages: [{ role: "user", content: buildPrompt(plot) }],
      output_config: {
        format: zodOutputFormat(analysisSchema),
        effort: "medium",
      },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return ruleBasedAnalysis(plot);
    }

    return { ...response.parsed_output, source: "claude" };
  } catch {
    return ruleBasedAnalysis(plot);
  }
}
