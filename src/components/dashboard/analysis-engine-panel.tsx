"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, FileDown, Sparkles, X } from "lucide-react";
import type { ClientCatastroParcel, ClientOpportunity } from "@/lib/types";
import type {
  AcquisitionRisk,
  AnalysisEngineData,
  AnalysisEngineResult,
  AnalysisMode,
  AnalysisProgressEvent,
  AtVerdict,
  ConsolidationRecommendation,
  CriticalItem,
  PromptSource,
} from "@/lib/analysis-engine-types";
import { ACQUISITION_RISK_LABEL_KEYS, CONSOLIDATION_LABEL_KEYS, VERDICT_LABEL_KEYS } from "@/lib/analysis-engine-types";
import { useLocale } from "@/lib/i18n/context";
import { cn, formatCatastroParcelDisplayAddress } from "@/lib/utils";
import { InvestmentDashboardTable } from "@/components/dashboard/investment-dashboard-table";

const MODES: { mode: AnalysisMode; labelKey: string; hintKey: string }[] = [
  { mode: "knowledge", labelKey: "analysis.knowledgeModeLabel", hintKey: "analysis.knowledgeModeHint" },
  { mode: "web", labelKey: "analysis.webModeLabel", hintKey: "analysis.webModeHint" },
  { mode: "hybrid", labelKey: "analysis.hybridModeLabel", hintKey: "analysis.hybridModeHint" },
];

// Where the system prompt comes from — see analysis-engine-types.ts's
// PromptSource. "database" is redeploy-free in production (it's a normal DB read).
const PROMPT_SOURCES: { source: PromptSource; labelKey: string; hintKey: string }[] = [
  { source: "default", labelKey: "analysis.promptSourceDefaultLabel", hintKey: "analysis.promptSourceDefaultHint" },
  { source: "database", labelKey: "analysis.promptSourceDatabaseLabel", hintKey: "analysis.promptSourceDatabaseHint" },
];

interface ModeProgress {
  status: string;
  elapsedMs: number;
  outputChars: number;
  toolCalls: number;
  result: AnalysisEngineResult | null;
  // True when this entry exists only because the mode wasn't selected for the
  // most recent run and has no earlier saved result — a placeholder telling the
  // user why the column is empty, not an actual run.
  notice?: boolean;
  // "live" the moment a result finishes streaming in from the run that produced
  // it; flips to "saved" the next time Run analysis fires without this mode
  // selected, so a carried-over result is clearly marked as not from this run.
  source?: "live" | "saved";
}

function initialProgress(): ModeProgress {
  return { status: "", elapsedMs: 0, outputChars: 0, toolCalls: 0, result: null };
}

// Rough expected wall-clock time per mode (web-grounded runs slower — each search/
// fetch is its own model turn). Purely a heuristic for the progress bar's fill
// percentage; it's capped short of 100% until the mode actually finishes so it
// never looks "done" prematurely.
const EXPECTED_MS: Record<AnalysisMode, number> = { knowledge: 90_000, web: 240_000, hybrid: 240_000 };

function ProgressBar({ mode, progress }: { mode: AnalysisMode; progress: ModeProgress }) {
  const { t } = useLocale();
  const pct = Math.min(95, (progress.elapsedMs / EXPECTED_MS[mode]) * 100);
  const seconds = Math.round(progress.elapsedMs / 1000);

  return (
    <div className="space-y-2 p-4">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-foreground">{progress.status || t("analysis.running")}</p>
      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        <span>{t("analysis.elapsedSeconds", { n: seconds })}</span>
        {progress.toolCalls > 0 && (
          <span>{t("analysis.toolCallsCount", { n: progress.toolCalls, plural: progress.toolCalls === 1 ? "" : "s" })}</span>
        )}
        {progress.outputChars > 0 && <span>{t("analysis.charsGenerated", { n: progress.outputChars })}</span>}
      </p>
    </div>
  );
}

function verdictBadgeClass(verdict: AtVerdict): string {
  if (verdict === "YES") return "bg-success/10 text-success";
  if (verdict === "YES_SUBJECT_TO_CONDITIONS") return "bg-sky-500/10 text-sky-600";
  if (verdict === "NO") return "bg-danger/10 text-danger";
  return "bg-amber-500/10 text-amber-600";
}

function VerdictBadge({ verdict }: { verdict: AtVerdict }) {
  const { t } = useLocale();
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", verdictBadgeClass(verdict))}>
      {t(VERDICT_LABEL_KEYS[verdict])}
    </span>
  );
}

function consolidationBadgeClass(recommendation: ConsolidationRecommendation): string {
  if (recommendation === "RECOMMENDED") return "bg-success/10 text-success";
  if (recommendation === "NOT_RECOMMENDED") return "bg-danger/10 text-danger";
  return "bg-amber-500/10 text-amber-600";
}

function ConsolidationBadge({ recommendation }: { recommendation: ConsolidationRecommendation }) {
  const { t } = useLocale();
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", consolidationBadgeClass(recommendation))}>
      {t(CONSOLIDATION_LABEL_KEYS[recommendation])}
    </span>
  );
}

function acquisitionRiskBadgeClass(risk: AcquisitionRisk): string {
  if (risk === "LOW") return "bg-success/10 text-success";
  if (risk === "HIGH") return "bg-danger/10 text-danger";
  return "bg-amber-500/10 text-amber-600";
}

function AcquisitionRiskBadge({ risk }: { risk: AcquisitionRisk }) {
  const { t } = useLocale();
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", acquisitionRiskBadgeClass(risk))}>
      {t(ACQUISITION_RISK_LABEL_KEYS[risk])}
    </span>
  );
}

/** Plain-text rendition of one mode's result, for the copy-to-clipboard button —
 * mirrors what's on screen. */
function buildCopyText(result: AnalysisEngineResult, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const lines: string[] = [];
  const data = result.data;
  if (data) {
    lines.push(`${t("analysis.verdictLabel")}: ${t(VERDICT_LABEL_KEYS[data.verdict])}`);
    lines.push(data.explanation);
    if (data.verifiedLegalStudioCapacity)
      lines.push(`${t("analysis.verifiedLegalStudioCapacityLabel")}: ${data.verifiedLegalStudioCapacity}`);
    if (data.scenarioStudioCapacity)
      lines.push(`${t("analysis.scenarioStudioCapacityLabel")}: ${data.scenarioStudioCapacity}`);
    if (data.realisticArchitecturalStudioCapacity)
      lines.push(`${t("analysis.realisticArchitecturalStudioCapacityLabel")}: ${data.realisticArchitecturalStudioCapacity}`);
    if (data.maximumBeds) lines.push(`${t("analysis.maximumBedsLabel")}: ${data.maximumBeds}`);
    if (data.keyInvestmentLimiters && data.keyInvestmentLimiters.length > 0) {
      lines.push("", t("analysis.keyInvestmentLimitersHeading"));
      for (const limiter of data.keyInvestmentLimiters) lines.push(`- ${limiter}`);
    }
    if (data.acquisitionRisk)
      lines.push(`${t("analysis.acquisitionRiskLabel")}: ${t(ACQUISITION_RISK_LABEL_KEYS[data.acquisitionRisk])}`);
    if (data.individualVerdicts && data.individualVerdicts.length > 0) {
      lines.push("", t("analysis.individualVerdictsHeading"));
      for (const v of data.individualVerdicts) {
        lines.push(`${v.referenciaCatastral}: ${t(VERDICT_LABEL_KEYS[v.verdict])} — ${v.explanation}`);
      }
    }
    if (
      (data.verdict === "YES" || data.verdict === "YES_SUBJECT_TO_CONDITIONS") &&
      data.developmentRights &&
      data.developmentRights.length > 0
    ) {
      lines.push("", t("analysis.developmentRightsHeading"));
      for (const row of data.developmentRights) {
        lines.push(`${row.parameter}: ${row.potentialRight}${row.status ? ` (${row.status})` : ""}`);
      }
      if (data.currentVerifiedRightsSummary) lines.push("", data.currentVerifiedRightsSummary);
    }
    if (data.verdict === "NO") {
      lines.push("", t("analysis.developmentRightsNotApplicable"));
    }
    if (data.verdict === "UNCERTAIN" && data.uncertainRequirements && data.uncertainRequirements.length > 0) {
      lines.push("", t("analysis.uncertainRequirementsHeading"));
      for (const req of data.uncertainRequirements) lines.push(`- ${req}`);
    }
    if (data.consolidationRecommendation) {
      lines.push(
        "",
        `${t("analysis.consolidationHeading")}: ${t(CONSOLIDATION_LABEL_KEYS[data.consolidationRecommendation])}`
      );
      if (data.consolidationExplanation) lines.push(data.consolidationExplanation);
    }
    if (data.criticalItemsToVerify && data.criticalItemsToVerify.length > 0) {
      lines.push("", t("analysis.criticalItemsHeading"));
      for (const c of data.criticalItemsToVerify) {
        lines.push(`- ${c.item} → ${c.whyItMatters} → ${c.sourceRequired}`);
      }
    }
    if (data.investmentBottomLine) lines.push("", t("analysis.investmentBottomLineHeading"), data.investmentBottomLine);
  }
  if (result.report) lines.push("", t("analysis.fullReportHeading"), result.report);
  return lines.join("\n");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser — silently ignore, the
      // button just won't show the "copied" confirmation.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-muted"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("analysis.copied") : null}
    </button>
  );
}

function DevelopmentRightsTable({ data }: { data: AnalysisEngineData }) {
  const { t } = useLocale();
  if (data.verdict === "NO") {
    return <p className="mt-2 text-xs text-muted-foreground">{t("analysis.developmentRightsNotApplicable")}</p>;
  }
  if (data.verdict === "UNCERTAIN") {
    if (!data.uncertainRequirements || data.uncertainRequirements.length === 0) return null;
    return (
      <div className="mt-2">
        <h5 className="text-xs font-semibold text-muted-foreground">{t("analysis.uncertainRequirementsHeading")}</h5>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-foreground">
          {data.uncertainRequirements.map((req, i) => (
            <li key={i}>{req}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (!data.developmentRights || data.developmentRights.length === 0) return null;
  return (
    <div className="mt-2 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">
              {t("analysis.developmentRightsParameter")}
            </th>
            <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">
              {t("analysis.developmentRightsPotential")}
            </th>
            <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">
              {t("analysis.developmentRightsStatus")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.developmentRights.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-1.5 text-muted-foreground">{row.parameter}</td>
              <td className="px-3 py-1.5 font-medium text-foreground">{row.potentialRight}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{row.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 1-2 plain-language sentences summarizing what's confirmed vs. outstanding
 * in the Development Rights table above it — see SYSTEM_PROMPT_BASE's
 * "Current Verified Development Rights". */
function CurrentVerifiedRightsSummary({ text }: { text: string }) {
  const { t } = useLocale();
  return (
    <div className="mt-2">
      <h5 className="text-xs font-semibold text-muted-foreground">{t("analysis.currentVerifiedRightsHeading")}</h5>
      <p className="mt-1 text-xs leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

/** The primary output investment figures — see SYSTEM_PROMPT_BASE's
 * "Investment Conclusion": the three distinct studio-capacity numbers (never
 * to be merged into one another), maximum beds, the key limiter, and the
 * overall acquisition risk. Only rendered when at least one is present
 * (they're all gated together server-side, but each field checked
 * independently here to stay resilient to a partial result). */
function InvestmentConclusionStats({ data }: { data: AnalysisEngineData }) {
  const { t } = useLocale();
  const stats: { labelKey: string; value: string }[] = [
    data.verifiedLegalStudioCapacity
      ? { labelKey: "analysis.verifiedLegalStudioCapacityLabel", value: data.verifiedLegalStudioCapacity }
      : null,
    data.scenarioStudioCapacity
      ? { labelKey: "analysis.scenarioStudioCapacityLabel", value: data.scenarioStudioCapacity }
      : null,
    data.realisticArchitecturalStudioCapacity
      ? { labelKey: "analysis.realisticArchitecturalStudioCapacityLabel", value: data.realisticArchitecturalStudioCapacity }
      : null,
    data.maximumBeds ? { labelKey: "analysis.maximumBedsLabel", value: data.maximumBeds } : null,
  ].filter((s): s is { labelKey: string; value: string } => s !== null);

  if (stats.length === 0 && (!data.keyInvestmentLimiters || data.keyInvestmentLimiters.length === 0) && !data.acquisitionRisk)
    return null;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("analysis.investmentConclusionHeading")}
      </h4>
      {stats.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {stats.map(({ labelKey, value }) => (
            <div key={labelKey} className="rounded-md bg-surface-muted p-2">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(labelKey)}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </div>
      )}
      {data.acquisitionRisk && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">{t("analysis.acquisitionRiskLabel")}:</span>
          <AcquisitionRiskBadge risk={data.acquisitionRisk} />
        </div>
      )}
      {data.keyInvestmentLimiters && data.keyInvestmentLimiters.length > 0 && (
        <div className="mt-2">
          <h5 className="text-xs font-semibold text-muted-foreground">{t("analysis.keyInvestmentLimitersHeading")}</h5>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-foreground">
            {data.keyInvestmentLimiters.map((limiter, i) => (
              <li key={i}>{limiter}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** At most 5 items — see SYSTEM_PROMPT_BASE's "Critical Items to Verify":
 * deliberately terse (item → why it matters → exact source), not a full
 * due-diligence narrative. */
function CriticalItemsList({ items }: { items: CriticalItem[] }) {
  const { t } = useLocale();
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("analysis.criticalItemsHeading")}
      </h4>
      <ul className="mt-2 space-y-2">
        {items.map((c, i) => (
          <li key={i} className="rounded-md bg-surface-muted p-2 text-xs">
            <p className="font-medium text-foreground">{c.item}</p>
            <p className="mt-1 text-muted-foreground">{c.whyItMatters}</p>
            <p className="mt-1.5 text-muted-foreground">
              <span className="font-medium text-foreground">{t("analysis.criticalItemSourceRequiredLabel")}:</span>{" "}
              {c.sourceRequired}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Closing 2-4 sentence summary — see SYSTEM_PROMPT_BASE's "Investment Bottom
 * Line": viability, consolidation, main unresolved issue, next verification. */
function InvestmentBottomLine({ text }: { text: string }) {
  const { t } = useLocale();
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("analysis.investmentBottomLineHeading")}
      </h4>
      <p className="mt-2 text-xs leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

function ResultColumn({
  mode,
  modeLabelKey,
  modeHintKey,
  progress,
  parcels,
}: {
  mode: AnalysisMode;
  modeLabelKey: string;
  modeHintKey: string;
  progress: ModeProgress | null;
  parcels: ClientCatastroParcel[];
}) {
  const { t } = useLocale();
  const result = progress?.result ?? null;
  const data = result?.data ?? null;

  return (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t(modeLabelKey)}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t(modeHintKey)}</p>
          </div>
          {result && !result.error && (
            <div className="flex shrink-0 items-center gap-2">
              <CopyButton text={buildCopyText(result, t)} label={t("analysis.copyResult")} />
            </div>
          )}
        </div>
      </div>

      {progress?.notice && !result && (
        <div className="flex items-start gap-2 p-4 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("analysis.notSelectedNotice")}</span>
        </div>
      )}

      {progress && !progress.notice && !result && <ProgressBar mode={mode} progress={progress} />}

      {result?.error && (
        <div className="flex items-start gap-2 p-4 text-xs text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t("analysis.errorLabel")}: {result.error}
          </span>
        </div>
      )}

      {data && (
        <div className="space-y-4 p-4">
          {/* Investment Dashboard Table */}
          {parcels && parcels.length > 0 && <InvestmentDashboardTable parcels={parcels} data={data} />}

          <div>
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={data.verdict} />
              {progress?.source === "saved" && (
                <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t("analysis.savedResultBadge")}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground">{data.explanation}</p>
          </div>

          <InvestmentConclusionStats data={data} />

          {data.individualVerdicts && data.individualVerdicts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analysis.individualVerdictsHeading")}
              </h4>
              <ul className="mt-2 space-y-2">
                {data.individualVerdicts.map((v) => (
                  <li key={v.referenciaCatastral} className="rounded-md bg-surface-muted p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{v.referenciaCatastral}</span>
                      <VerdictBadge verdict={v.verdict} />
                    </div>
                    <p className="mt-1 text-muted-foreground">{v.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analysis.developmentRightsHeading")}
            </h4>
            <DevelopmentRightsTable data={data} />
            {data.currentVerifiedRightsSummary && (
              <CurrentVerifiedRightsSummary text={data.currentVerifiedRightsSummary} />
            )}
          </div>

          {data.consolidationRecommendation && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analysis.consolidationHeading")}
              </h4>
              <div className="mt-2">
                <ConsolidationBadge recommendation={data.consolidationRecommendation} />
                {data.consolidationExplanation && (
                  <p className="mt-2 text-xs leading-relaxed text-foreground">{data.consolidationExplanation}</p>
                )}
              </div>
            </div>
          )}

          {data.criticalItemsToVerify && <CriticalItemsList items={data.criticalItemsToVerify} />}

          {data.investmentBottomLine && <InvestmentBottomLine text={data.investmentBottomLine} />}

          {result?.report && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analysis.fullReportHeading")}
              </h4>
              <div className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-muted p-3 text-xs leading-relaxed text-foreground">
                {result.report}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** End-of-analysis comparison: the verdict and explanation side by side for
 * whichever modes have a completed, non-error result. */
function ComparisonTable({ progress }: { progress: Partial<Record<AnalysisMode, ModeProgress>> }) {
  const { t } = useLocale();
  const available = MODES.filter(({ mode }) => {
    const result = progress[mode]?.result;
    return result && !result.error && result.data;
  });
  if (available.length < 2) return null;

  const copyText = [
    t("analysis.comparisonHeading"),
    "",
    [t("analysis.comparisonMetric"), ...available.map(({ labelKey }) => t(labelKey))].join("\t"),
    [
      t("analysis.verdictLabel"),
      ...available.map(({ mode }) => {
        const verdict = progress[mode]?.result?.data?.verdict;
        return verdict ? t(VERDICT_LABEL_KEYS[verdict]) : "—";
      }),
    ].join("\t"),
    [t("analysis.explanationLabel"), ...available.map(({ mode }) => progress[mode]?.result?.data?.explanation ?? "—")].join(
      "\t"
    ),
    ...(available.some(({ mode }) => progress[mode]?.result?.data?.consolidationRecommendation)
      ? [
          [
            t("analysis.consolidationHeading"),
            ...available.map(({ mode }) => {
              const rec = progress[mode]?.result?.data?.consolidationRecommendation;
              return rec ? t(CONSOLIDATION_LABEL_KEYS[rec]) : "—";
            }),
          ].join("\t"),
        ]
      : []),
  ].join("\n");

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{t("analysis.comparisonHeading")}</h3>
        <CopyButton text={copyText} label={t("analysis.copyResult")} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                {t("analysis.comparisonMetric")}
              </th>
              {available.map(({ mode, labelKey }) => (
                <th key={mode} className="px-4 py-2 text-left font-semibold text-muted-foreground">
                  {t(labelKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-2 text-muted-foreground">{t("analysis.verdictLabel")}</td>
              {available.map(({ mode }) => {
                const verdict = progress[mode]?.result?.data?.verdict;
                return (
                  <td key={mode} className="px-4 py-2">
                    {verdict ? <VerdictBadge verdict={verdict} /> : "—"}
                  </td>
                );
              })}
            </tr>
            <tr className={available.some(({ mode }) => progress[mode]?.result?.data?.consolidationRecommendation) ? "border-b border-border" : "last:border-0"}>
              <td className="px-4 py-2 text-muted-foreground">{t("analysis.explanationLabel")}</td>
              {available.map(({ mode }) => (
                <td key={mode} className="px-4 py-2 font-medium text-foreground">
                  {progress[mode]?.result?.data?.explanation || "—"}
                </td>
              ))}
            </tr>
            {available.some(({ mode }) => progress[mode]?.result?.data?.consolidationRecommendation) && (
              <tr className="last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{t("analysis.consolidationHeading")}</td>
                {available.map(({ mode }) => {
                  const rec = progress[mode]?.result?.data?.consolidationRecommendation;
                  return (
                    <td key={mode} className="px-4 py-2">
                      {rec ? <ConsolidationBadge recommendation={rec} /> : "—"}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Downloads the current on-screen results as a PDF via the export-pdf route.
 * Only rendered once `progress` has at least one non-error result (checked by
 * the caller) — this component just handles the fetch/blob-download plumbing. */
function ExportPdfButton({
  parcelIds,
  progress,
}: {
  parcelIds: string[];
  progress: Partial<Record<AnalysisMode, ModeProgress>>;
}) {
  const { t } = useLocale();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const results: Partial<Record<AnalysisMode, AnalysisEngineResult>> = {};
      for (const { mode } of MODES) {
        const result = progress[mode]?.result;
        if (result) results[mode] = result;
      }
      const res = await fetch("/api/analysis-engine/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelIds, results }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t("pdf.exportError"));
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameMatch?.[1] ?? "grupo-yakgu-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("pdf.exportError"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-medium text-primary",
          "hover:bg-primary/10 disabled:opacity-50"
        )}
      >
        <FileDown className="h-3.5 w-3.5" />
        {exporting ? t("pdf.exporting") : t("pdf.exportButton")}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

export function AnalysisEnginePanel({
  selectedParcelIds,
  maxAnalysisPlots,
  onDeselect,
  onGoToOpportunities,
  canExportPdf = false,
}: {
  /** Chosen via the Opportunities tab's own selection checkboxes (see
   * OpportunitiesPanel) — this panel doesn't manage the selection itself, only
   * consumes it, so switching tabs back and forth keeps it intact. */
  selectedParcelIds: string[];
  maxAnalysisPlots: number;
  onDeselect: (parcelId: string) => void;
  onGoToOpportunities: () => void;
  canExportPdf?: boolean;
}) {
  const { t } = useLocale();
  const [loadingParcels, setLoadingParcels] = useState(true);
  const [parcels, setParcels] = useState<ClientCatastroParcel[]>([]);
  const [selectedModes, setSelectedModes] = useState<Set<AnalysisMode>>(new Set(["knowledge"]));
  // Where the system prompt comes from — see analysis-engine-types.ts's
  // PromptSource. Defaults to "file" (unchanged from this option's original
  // Use the database custom prompt (if set) rather than the built-in default.
  const [promptSource, setPromptSource] = useState<PromptSource>("database");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Partial<Record<AnalysisMode, ModeProgress>> | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Stable regardless of selection order — matches the server's own key (see
  // /api/analysis-engine's parcelKeyFor) so a saved result loads whether the
  // plots were selected in one order or the other.
  const selectionKey = [...selectedParcelIds].sort().join(",");

  // Any results already on screen are for whatever the selection was before —
  // reset them the moment the selection itself changes, using React's
  // "adjust state during render" pattern (see the docs on adjusting state
  // when a prop changes) rather than an Effect, so this doesn't cause an
  // extra post-paint render on top of the one below that fetches the new
  // selection's data.
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);
  if (selectionKey !== prevSelectionKey) {
    setPrevSelectionKey(selectionKey);
    setProgress(null);
    setRunError(null);
    if (selectedParcelIds.length === 0) {
      setParcels([]);
      setLoadingParcels(false);
    } else {
      setLoadingParcels(true);
    }
  }

  const loadSavedResults = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch(`/api/analysis-engine?parcelIds=${encodeURIComponent(ids.join(","))}`);
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      const results = json?.results as Partial<Record<AnalysisMode, AnalysisEngineResult>> | undefined;
      if (!results || Object.keys(results).length === 0) return;
      setProgress((prev) => {
        const next = { ...(prev ?? {}) };
        for (const { mode } of MODES) {
          const saved = results[mode];
          if (saved) next[mode] = { ...initialProgress(), result: saved, source: "saved" };
        }
        return next;
      });
    } catch {
      // No saved results, or the fetch failed — fine, just start from a clean slate.
    }
  };

  // Resolves the selected ids into full parcel objects (for the address chips
  // and the request body) via the same shared Opportunities list everyone
  // sees — and starts fresh whenever the selection itself changes, since any
  // results on screen are for a different plot combination otherwise.
  useEffect(() => {
    let cancelled = false;
    if (selectedParcelIds.length === 0) return;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const opportunities: ClientOpportunity[] = data.opportunities ?? [];
        const byId = new Map(opportunities.map((o) => [o.parcel.id, o.parcel]));
        const resolved = selectedParcelIds.map((id) => byId.get(id)).filter((p): p is ClientCatastroParcel => !!p);
        setParcels(resolved);
        loadSavedResults(selectedParcelIds);
      })
      .finally(() => {
        if (!cancelled) setLoadingParcels(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const toggleMode = (mode: AnalysisMode) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  };

  const applyEvent = (mode: AnalysisMode, event: AnalysisProgressEvent) => {
    setProgress((prev) => {
      const next = { ...(prev ?? {}) };
      const current = next[mode] ?? initialProgress();
      if (event.type === "status") {
        next[mode] = { ...current, status: event.status };
      } else if (event.type === "stats") {
        next[mode] = { ...current, elapsedMs: event.elapsedMs, outputChars: event.outputChars, toolCalls: event.toolCalls };
      } else {
        next[mode] = { ...current, result: event.result, source: "live" };
      }
      return next;
    });
  };

  const runAnalysis = async () => {
    const modes = [...selectedModes];
    if (selectedParcelIds.length === 0 || modes.length === 0) return;
    setRunning(true);
    setRunError(null);
    // Only reset the mode(s) actually being (re)run — a previously-completed
    // result for a mode not included in this run is left exactly as it was.
    setProgress((prev) => {
      const next = { ...(prev ?? {}) };
      for (const mode of modes) next[mode] = initialProgress();
      for (const { mode } of MODES) {
        if (modes.includes(mode)) continue;
        if (next[mode]?.result) {
          next[mode] = { ...next[mode]!, source: "saved" };
        } else {
          next[mode] = { ...initialProgress(), notice: true };
        }
      }
      return next;
    });

    try {
      const res = await fetch("/api/analysis-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelIds: selectedParcelIds, modes, promptSource }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setRunError(data?.error ?? "Analysis failed");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const chunk of events) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as AnalysisProgressEvent & { mode: AnalysisMode };
          applyEvent(payload.mode, payload);
        }
      }
    } catch {
      setRunError("Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const isEmpty = selectedParcelIds.length === 0;
  const visibleModes = MODES.filter(({ mode }) => progress?.[mode]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("analysis.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("analysis.description", { max: maxAnalysisPlots })}
          </p>
        </div>

        {isEmpty && (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("analysis.noSelection")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("analysis.noSelectionHint", { max: maxAnalysisPlots })}
            </p>
            <button
              type="button"
              onClick={onGoToOpportunities}
              className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              {t("analysis.goToOpportunities")}
            </button>
          </div>
        )}

        {!isEmpty && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <span className="text-xs font-medium text-muted-foreground">{t("analysis.selectedHeading")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {loadingParcels && <p className="text-xs text-muted-foreground">{t("dashboard.searching")}</p>}
              {!loadingParcels &&
                parcels.map((parcel) => (
                  <span
                    key={parcel.id}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs text-foreground"
                  >
                    <span className="font-medium">{parcel.referenciaCatastral}</span>
                    <span className="text-muted-foreground">{formatCatastroParcelDisplayAddress(parcel)}</span>
                    <button
                      type="button"
                      onClick={() => onDeselect(parcel.id)}
                      title={t("analysis.removeSelection")}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-surface hover:text-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <span className="text-xs font-medium text-muted-foreground">{t("analysis.modeSelectionLabel")}</span>
                <div className="mt-1 flex flex-wrap gap-3">
                  {MODES.map(({ mode, labelKey }) => (
                    <label key={mode} className="flex items-center gap-1.5 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={selectedModes.has(mode)}
                        onChange={() => toggleMode(mode)}
                        className="h-3.5 w-3.5 rounded border-border accent-[var(--primary)]"
                      />
                      {t(labelKey)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground">{t("analysis.promptSourceLabel")}</span>
                <div className="mt-1 flex flex-wrap gap-3">
                  {PROMPT_SOURCES.map(({ source, labelKey }) => (
                    <label key={source} className="flex items-center gap-1.5 text-xs text-foreground">
                      <input
                        type="radio"
                        name="prompt-source"
                        checked={promptSource === source}
                        onChange={() => setPromptSource(source)}
                        className="h-3.5 w-3.5 border-border accent-[var(--primary)]"
                      />
                      {t(labelKey)}
                    </label>
                  ))}
                </div>
                <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
                  {t(PROMPT_SOURCES.find((p) => p.source === promptSource)!.hintKey)}
                </p>
              </div>

              <button
                type="button"
                onClick={runAnalysis}
                disabled={running || parcels.length === 0 || selectedModes.size === 0}
                className={cn(
                  "rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground",
                  "disabled:opacity-50"
                )}
              >
                {running ? t("analysis.running") : t("analysis.runButton")}
              </button>
            </div>
          </div>
        )}

        {running && <p className="text-xs text-muted-foreground">{t("analysis.runningHint")}</p>}
        {runError && (
          <div className="flex items-start gap-2 rounded-md bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{runError}</span>
          </div>
        )}

        {progress && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{t("analysis.disclaimer")}</span>
              </div>
              {canExportPdf && visibleModes.some(({ mode }) => progress[mode]?.result && !progress[mode]?.result?.error) && (
                <ExportPdfButton parcelIds={selectedParcelIds} progress={progress} />
              )}
            </div>

            <div className="flex flex-col gap-4 lg:flex-row">
              {visibleModes.map(({ mode, labelKey, hintKey }) => (
                <ResultColumn
                  key={mode}
                  mode={mode}
                  modeLabelKey={labelKey}
                  modeHintKey={hintKey}
                  progress={progress[mode] ?? null}
                  parcels={parcels}
                />
              ))}
            </div>

            <ComparisonTable progress={progress} />
          </>
        )}
      </div>
    </div>
  );
}
