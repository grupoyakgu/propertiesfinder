// Pure types and label-key constant maps for the Analysis Engine — no
// server-only dependencies (no Anthropic client, no filesystem access), so
// this module is safe to import at runtime from client components (see
// analysis-engine-panel.tsx) and from the PDF renderer alike. The actual
// analysis implementation (SYSTEM_PROMPT_BASE, runAnalysisStreaming, the
// scripts/cm4.md loader) lives in analysis-engine.ts, which re-exports
// everything here — keeping the two separate is what lets analysis-engine.ts
// use Node's `fs`/`path` without breaking the client bundle that also needs
// these label-key maps.

// INTERNAL (model's trained knowledge only), EXTERNAL (web-search-grounded),
// or HYBRID (both together) — see the mode addendums in analysis-engine.ts.
export type AnalysisMode = "knowledge" | "web" | "hybrid";

// Whether the property is eligible for AT use — Establecimiento de
// Apartamentos Turísticos, a specific Andalusian tourist-accommodation
// category distinct from VUT (Vivienda de Uso Turístico), ordinary
// residential, or hotel use (see SYSTEM_PROMPT_BASE). YES_SUBJECT_TO_CONDITIONS
// is a deliberate middle verdict — the prompt is explicit that UNCERTAIN is
// not the default: if urban planning compatibility is clear but some
// downstream detail (the exact Ordenanza, a tourism-licensing technicality)
// isn't yet confirmed, that's a conditional YES, not an UNCERTAIN.
export type AtVerdict = "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN";

// i18n key for each verdict's display label — shared by the web panel and the
// PDF export so both render the same wording from one place.
export const VERDICT_LABEL_KEYS: Record<AtVerdict, string> = {
  YES: "analysis.verdictYes",
  YES_SUBJECT_TO_CONDITIONS: "analysis.verdictYesConditions",
  NO: "analysis.verdictNo",
  UNCERTAIN: "analysis.verdictUncertain",
};

export interface DevelopmentRightRow {
  parameter: string;
  // A concrete value (which may itself read as a labeled estimate, e.g. "4
  // floors, estimated"), or "NOT YET DETERMINED" for a parameter that isn't
  // nailed down at all — see SYSTEM_PROMPT_BASE.
  potentialRight: string;
  // How this row's value was arrived at — one of "Confirmed" / "Derived" /
  // "Estimated" / "Unknown" (see SYSTEM_PROMPT_BASE's Evidence Ledger). A
  // single evidence-quality dimension, deliberately simpler than the earlier
  // combined "Status / Confidence" label, to keep the default Development
  // Rights table scannable at a glance.
  status: string;
}

/** One plot's own individual verdict, before considering consolidation with
 * whatever else was submitted alongside it — only populated when a run
 * covered more than one plot (see SYSTEM_PROMPT_BASE's "Multiple Properties"
 * section: individual rights are always determined first, separately from
 * the combined-development scenario, which is the PRIMARY conclusion once
 * more than one plot is involved). */
export interface AtPlotVerdict {
  referenciaCatastral: string;
  verdict: AtVerdict;
  explanation: string;
}

// Whether combining multiple submitted plots into a single AT development is
// the stronger investment case than developing them separately — only
// meaningful (non-null) when more than one plot was submitted. See
// AnalysisEngineData.consolidationRecommendation.
export type ConsolidationRecommendation = "RECOMMENDED" | "NOT_RECOMMENDED" | "NOT_YET_DETERMINED";

export const CONSOLIDATION_LABEL_KEYS: Record<ConsolidationRecommendation, string> = {
  RECOMMENDED: "analysis.consolidationRecommended",
  NOT_RECOMMENDED: "analysis.consolidationNotRecommended",
  NOT_YET_DETERMINED: "analysis.consolidationNotYetDetermined",
};

// How badly an unresolved fact (or missing verification) could hurt the deal
// if it turns out unfavorably — see SYSTEM_PROMPT_BASE's "Critical Items to
// Verify" and "Investment Conclusion" sections.
export type AcquisitionRisk = "LOW" | "MEDIUM" | "HIGH";

export const ACQUISITION_RISK_LABEL_KEYS: Record<AcquisitionRisk, string> = {
  LOW: "analysis.acquisitionRiskLow",
  MEDIUM: "analysis.acquisitionRiskMedium",
  HIGH: "analysis.acquisitionRiskHigh",
};

// One item on the "Critical Items to Verify" due-diligence checklist — see
// SYSTEM_PROMPT_BASE's "Critical Items to Verify". Distinct from
// uncertainRequirements: this can appear alongside ANY verdict (including a
// clean YES) whenever some material fact is still unverified, whereas
// uncertainRequirements only ever accompanies an UNCERTAIN verdict itself.
// Deliberately terse (max 5 items) — item / why it matters / exact source —
// so the default response stays a dashboard rather than a research report.
export interface CriticalItem {
  item: string;
  whyItMatters: string;
  sourceRequired: string;
}

export interface AnalysisEngineData {
  // The verdict for the submission as a whole: the single plot's own verdict,
  // or — when multiple plots were submitted together — the verdict for the
  // CONSOLIDATED development scenario, which is the primary conclusion (see
  // individualVerdicts for each plot's own standalone verdict).
  verdict: AtVerdict;
  explanation: string;
  // Present when verdict is YES or YES_SUBJECT_TO_CONDITIONS, describing the
  // consolidated scenario when multiple plots were submitted. Individual rows
  // may still read "NOT YET DETERMINED" for a parameter that isn't nailed down.
  developmentRights: DevelopmentRightRow[] | null;
  // 1-2 plain-language sentences summarizing what's actually confirmed vs.
  // outstanding across developmentRights — present alongside it. See
  // SYSTEM_PROMPT_BASE's "Current Verified Development Rights".
  currentVerifiedRightsSummary: string | null;
  // Present only when verdict is UNCERTAIN — what's needed to resolve it.
  // Should be rare: see SYSTEM_PROMPT_BASE's "Decision Rule for Uncertainty".
  uncertainRequirements: string[] | null;
  // Present only when more than one plot was submitted together.
  individualVerdicts: AtPlotVerdict[] | null;
  // Present only when more than one plot was submitted together — whether
  // developing them as one consolidated AT establishment beats developing
  // each separately.
  consolidationRecommendation: ConsolidationRecommendation | null;
  // 2-3 sentences on why — present only alongside consolidationRecommendation.
  consolidationExplanation: string | null;
  // The three distinct studio-capacity figures from SYSTEM_PROMPT_BASE's
  // "Three Different Capacity Numbers" — never to be merged into one another.
  // Present when verdict is YES or YES_SUBJECT_TO_CONDITIONS. Free-text
  // strings (not numbers) since a figure may carry a label like "12 units
  // (Estimated)" or read "NOT YET DETERMINED".
  verifiedLegalStudioCapacity: string | null;
  scenarioStudioCapacity: string | null;
  realisticArchitecturalStudioCapacity: string | null;
  maximumBeds: string | null;
  // Up to 3 items — see SYSTEM_PROMPT_BASE's "Key Investment Limiters".
  keyInvestmentLimiters: string[] | null;
  // Overall risk that an unresolved fact could move the investment
  // conclusion — present alongside the capacity figures above.
  acquisitionRisk: AcquisitionRisk | null;
  // The due-diligence checklist — present whenever a material fact remains
  // unverified, independent of the verdict (see CriticalItem's own comment).
  // Capped at 5 items.
  criticalItemsToVerify: CriticalItem[] | null;
  // 2-4 sentences: is the project currently viable, should the properties be
  // consolidated, what's the main unresolved issue, and what's the most
  // important next verification before acquisition. Always present — see
  // SYSTEM_PROMPT_BASE's "Investment Bottom Line".
  investmentBottomLine: string;
}

export interface AnalysisEngineResult {
  mode: AnalysisMode;
  report: string;
  data: AnalysisEngineData | null;
  error?: string;
}

export type AnalysisProgressEvent =
  | { type: "status"; status: string }
  | { type: "stats"; elapsedMs: number; outputChars: number; toolCalls: number }
  | { type: "result"; result: AnalysisEngineResult };
