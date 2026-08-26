"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { AnalysisEngineData } from "@/lib/analysis-engine-types";
import type { ClientCatastroParcel } from "@/lib/types";
import { ACQUISITION_RISK_LABEL_KEYS, CONSOLIDATION_LABEL_KEYS, VERDICT_LABEL_KEYS } from "@/lib/analysis-engine-types";
import { useLocale } from "@/lib/i18n/context";
import { formatArea, cn } from "@/lib/utils";

interface InvestmentMetric {
  key: string;
  labelKey: string;
  value: string | null;
  badge?: boolean;
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
      // Clipboard access can be denied by the browser
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

function AcquisitionRiskBadge({ risk }: { risk: string }) {
  const riskClass =
    risk === "LOW" ? "bg-success/10 text-success" : risk === "HIGH" ? "bg-danger/10 text-danger" : "bg-amber-500/10 text-amber-600";

  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", riskClass)}>{risk}</span>;
}

function ConsolidationBadge({ recommendation }: { recommendation: string }) {
  const recClass =
    recommendation === "RECOMMENDED" ? "bg-success/10 text-success" : recommendation === "NOT_RECOMMENDED" ? "bg-danger/10 text-danger" : "bg-amber-500/10 text-amber-600";

  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", recClass)}>{recommendation}</span>;
}

export function InvestmentDashboardTable({
  parcels,
  data,
}: {
  parcels: ClientCatastroParcel[];
  data: AnalysisEngineData;
}) {
  const { t } = useLocale();

  if (!data) return null;

  // Extract development rights data
  const developmentRights = new Map<string, string>();
  if (data.developmentRights) {
    for (const row of data.developmentRights) {
      developmentRights.set(row.parameter.toLowerCase(), row.potentialRight);
    }
  }

  // Build metrics table
  const metrics: InvestmentMetric[] = [
    {
      key: "combined_plot_area",
      labelKey: "detail.plotSizeLabel",
      value: parcels.length > 0 ? formatArea(parcels.reduce((sum, p) => sum + p.plotSize, 0)) : null,
    },
    {
      key: "edificabilidad",
      labelKey: "investment.edificabilidad",
      value: developmentRights.get("edificabilidad") || developmentRights.get("buildability") || null,
    },
    {
      key: "maximum_buildable_area",
      labelKey: "investment.maximumBuildableArea",
      value: developmentRights.get("maximum buildable area") || developmentRights.get("superficie máxima construible") || null,
    },
    {
      key: "maximum_floors",
      labelKey: "investment.maximumFloors",
      value: developmentRights.get("maximum floors") || developmentRights.get("plantas máximas") || null,
    },
    {
      key: "maximum_height",
      labelKey: "investment.maximumHeight",
      value: developmentRights.get("maximum height") || developmentRights.get("altura máxima") || null,
    },
    {
      key: "occupancy",
      labelKey: "investment.occupancy",
      value: developmentRights.get("occupancy") || developmentRights.get("ocupación") || null,
    },
    {
      key: "at_use",
      labelKey: "analysis.verdictLabel",
      value: t(VERDICT_LABEL_KEYS[data.verdict]),
    },
    {
      key: "maximum_legal_studios",
      labelKey: "analysis.verifiedLegalStudioCapacityLabel",
      value: data.verifiedLegalStudioCapacity,
    },
    {
      key: "realistic_studios",
      labelKey: "analysis.realisticArchitecturalStudioCapacityLabel",
      value: data.realisticArchitecturalStudioCapacity,
    },
    {
      key: "consolidation",
      labelKey: "analysis.consolidationHeading",
      value: data.consolidationRecommendation ? t(CONSOLIDATION_LABEL_KEYS[data.consolidationRecommendation]) : null,
      badge: true,
    },
    {
      key: "acquisition_risk",
      labelKey: "analysis.acquisitionRiskLabel",
      value: data.acquisitionRisk ? t(ACQUISITION_RISK_LABEL_KEYS[data.acquisitionRisk]) : null,
      badge: true,
    },
  ];

  // Filter out empty metrics
  const displayMetrics = metrics.filter((m) => m.value !== null);

  // Build copy text
  const copyText = [
    t("investment.dashboardTitle"),
    "",
    ...displayMetrics.map((m) => `${t(m.labelKey)}: ${m.value}`),
  ].join("\n");

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{t("investment.dashboardTitle")}</h3>
        <CopyButton text={copyText} label={t("analysis.copyResult")} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground">{t("analysis.comparisonMetric")}</th>
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground">{t("table.value")}</th>
            </tr>
          </thead>
          <tbody>
            {displayMetrics.map((metric, i) => (
              <tr key={metric.key} className={i === displayMetrics.length - 1 ? "" : "border-b border-border"}>
                <td className="px-4 py-2 text-muted-foreground">{t(metric.labelKey)}</td>
                <td className="px-4 py-2">
                  {metric.badge && metric.key === "consolidation" && metric.value ? (
                    <ConsolidationBadge recommendation={metric.value} />
                  ) : metric.badge && metric.key === "acquisition_risk" && metric.value ? (
                    <AcquisitionRiskBadge risk={metric.value} />
                  ) : (
                    <span className="font-medium text-foreground">{metric.value || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
