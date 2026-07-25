"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { ClientCatastroParcel } from "@/lib/types";
import type { AnalysisEngineData, AnalysisEngineResult, AnalysisMode } from "@/lib/analysis-engine";
import { useLocale } from "@/lib/i18n/context";
import { formatCatastroParcelAddress } from "@/lib/utils";

interface Field {
  key: keyof AnalysisEngineData;
  labelKey: string;
}

const SUMMARY_FIELDS: Field[] = [
  { key: "planning_zone", labelKey: "analysis.planningZone" },
  { key: "urban_classification", labelKey: "analysis.urbanClassification" },
  { key: "ordinance", labelKey: "analysis.ordinance" },
  { key: "special_plan", labelKey: "analysis.specialPlan" },
  { key: "protection_level", labelKey: "analysis.protectionLevel" },
  { key: "max_build_area", labelKey: "analysis.maxBuildArea" },
  { key: "remaining_buildability", labelKey: "analysis.remainingBuildability" },
  { key: "max_footprint", labelKey: "analysis.maxFootprint" },
  { key: "max_height", labelKey: "analysis.maxHeight" },
  { key: "max_floors", labelKey: "analysis.maxFloors" },
  { key: "parking_required", labelKey: "analysis.parkingRequired" },
  { key: "planning_risk", labelKey: "analysis.planningRisk" },
  { key: "overall_score", labelKey: "analysis.overallScore" },
];

const LIST_FIELDS: Field[] = [
  { key: "allowed_uses", labelKey: "analysis.allowedUses" },
  { key: "heritage_constraints", labelKey: "analysis.heritageConstraints" },
  { key: "planning_constraints", labelKey: "analysis.planningConstraints" },
  { key: "development_options", labelKey: "analysis.developmentOptions" },
];

interface ResidualField {
  key: keyof NonNullable<AnalysisEngineData["residual_land_value"]>;
  labelKey: string;
}

const RESIDUAL_FIELDS: ResidualField[] = [
  { key: "gross_buildable_area", labelKey: "analysis.grossBuildableArea" },
  { key: "saleable_area", labelKey: "analysis.saleableArea" },
  { key: "estimated_residential_units", labelKey: "analysis.estimatedResidentialUnits" },
  { key: "estimated_hotel_rooms", labelKey: "analysis.estimatedHotelRooms" },
  { key: "estimated_tourist_apartments", labelKey: "analysis.estimatedTouristApartments" },
  { key: "commercial_area", labelKey: "analysis.commercialArea" },
  { key: "parking_spaces", labelKey: "analysis.parkingSpaces" },
  { key: "construction_cost_assumption_eur_m2", labelKey: "analysis.constructionCostAssumption" },
  { key: "total_construction_cost", labelKey: "analysis.totalConstructionCost" },
  { key: "gross_development_value", labelKey: "analysis.grossDevelopmentValue" },
  { key: "developer_margin", labelKey: "analysis.developerMargin" },
  { key: "residual_land_value", labelKey: "analysis.residualLandValue" },
  { key: "highest_and_best_use", labelKey: "analysis.highestAndBestUse" },
];

function ResultColumn({
  modeLabelKey,
  modeHintKey,
  result,
}: {
  modeLabelKey: string;
  modeHintKey: string;
  result: AnalysisEngineResult | null;
}) {
  const { t } = useLocale();

  return (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{t(modeLabelKey)}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t(modeHintKey)}</p>
      </div>

      {!result && <div className="p-4 text-xs text-muted-foreground">{t("analysis.running")}</div>}

      {result?.error && (
        <div className="flex items-start gap-2 p-4 text-xs text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t("analysis.errorLabel")}: {result.error}
          </span>
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-6 p-4">
          {result.data && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analysis.summaryHeading")}
              </h4>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {SUMMARY_FIELDS.map(({ key, labelKey }) => {
                  const value = result.data?.[key];
                  if (typeof value !== "string" || !value) return null;
                  return (
                    <div key={key} className="col-span-2 sm:col-span-1">
                      <dt className="text-muted-foreground">{t(labelKey)}</dt>
                      <dd className="font-medium text-foreground">{value}</dd>
                    </div>
                  );
                })}
              </dl>
              {LIST_FIELDS.map(({ key, labelKey }) => {
                const value = result.data?.[key];
                if (!Array.isArray(value) || value.length === 0) return null;
                return (
                  <div key={key} className="mt-3">
                    <dt className="text-xs text-muted-foreground">{t(labelKey)}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {value.map((item, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </dd>
                  </div>
                );
              })}
            </div>
          )}

          {result.data?.residual_land_value && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analysis.residualLandValueHeading")}
              </h4>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {RESIDUAL_FIELDS.map(({ key, labelKey }) => {
                  const value = result.data?.residual_land_value?.[key];
                  if (!value) return null;
                  return (
                    <div key={key} className="col-span-2 sm:col-span-1">
                      <dt className="text-muted-foreground">{t(labelKey)}</dt>
                      <dd className="font-medium text-foreground">{value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {result.report && (
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

export function AnalysisEnginePanel() {
  const { t } = useLocale();
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [parcels, setParcels] = useState<ClientCatastroParcel[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<AnalysisMode, AnalysisEngineResult | null> | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const fetched: ClientCatastroParcel[] = data.parcels ?? [];
        setParcels(fetched);
        if (fetched.length > 0) setSelectedId(fetched[0].id);
      })
      .finally(() => {
        if (!cancelled) setLoadingFavorites(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runAnalysis = async () => {
    if (!selectedId) return;
    setRunning(true);
    setRunError(null);
    setResults(null);
    try {
      const res = await fetch("/api/analysis-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelId: selectedId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRunError(data?.error ?? "Analysis failed");
        return;
      }
      setResults({ knowledge: data.knowledge ?? null, web: data.web ?? null });
    } catch {
      setRunError("Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const isEmpty = !loadingFavorites && parcels.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("analysis.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("analysis.description")}</p>
        </div>

        {loadingFavorites && <p className="text-sm text-muted-foreground">{t("dashboard.searching")}</p>}
        {isEmpty && <p className="text-sm text-muted-foreground">{t("analysis.noFavorites")}</p>}

        {!isEmpty && !loadingFavorites && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="analysis-parcel-picker">
                {t("analysis.pickerLabel")}
              </label>
              <select
                id="analysis-parcel-picker"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {parcels.map((parcel) => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.referenciaCatastral} — {formatCatastroParcelAddress(parcel)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={running || !selectedId}
              className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {running ? t("analysis.running") : t("analysis.runButton")}
            </button>
          </div>
        )}

        {running && <p className="text-xs text-muted-foreground">{t("analysis.runningHint")}</p>}
        {runError && (
          <div className="flex items-start gap-2 rounded-md bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{runError}</span>
          </div>
        )}

        {(running || results) && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("analysis.disclaimer")}</span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row">
              <ResultColumn
                modeLabelKey="analysis.knowledgeModeLabel"
                modeHintKey="analysis.knowledgeModeHint"
                result={results?.knowledge ?? null}
              />
              <ResultColumn
                modeLabelKey="analysis.webModeLabel"
                modeHintKey="analysis.webModeHint"
                result={results?.web ?? null}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
