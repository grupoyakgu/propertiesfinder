"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Sparkles } from "lucide-react";
import type { ClientCatastroParcel } from "@/lib/types";
import type {
  AnalysisEngineData,
  AnalysisEngineResult,
  AnalysisMode,
  AnalysisProgressEvent,
  OutputLanguage,
} from "@/lib/analysis-engine";
import { useLocale } from "@/lib/i18n/context";
import { cn, formatCatastroParcelAddress } from "@/lib/utils";

const OUTPUT_LANGUAGES: { value: OutputLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "he", label: "עברית" },
];

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

// Full set shown in each mode's own results column.
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

// The exact metric set requested for the end-of-analysis comparison table —
// narrower than RESIDUAL_FIELDS (drops commercial area/parking/total construction
// cost) so the table stays focused on the headline investment numbers.
const COMPARISON_FIELDS: ResidualField[] = [
  { key: "gross_buildable_area", labelKey: "analysis.grossBuildableArea" },
  { key: "saleable_area", labelKey: "analysis.saleableArea" },
  { key: "estimated_residential_units", labelKey: "analysis.estimatedResidentialUnits" },
  { key: "estimated_hotel_rooms", labelKey: "analysis.estimatedHotelRooms" },
  { key: "estimated_tourist_apartments", labelKey: "analysis.estimatedTouristApartments" },
  { key: "construction_cost_assumption_eur_m2", labelKey: "analysis.constructionCostAssumption" },
  { key: "gross_development_value", labelKey: "analysis.grossDevelopmentValue" },
  { key: "developer_margin", labelKey: "analysis.developerMargin" },
  { key: "residual_land_value", labelKey: "analysis.residualLandValue" },
  { key: "highest_and_best_use", labelKey: "analysis.highestAndBestUse" },
];

// Rendered as an actual <table>, right below each mode's own full report text —
// a compact numeric summary of that report (permitted-use flags plus the same
// headline residual-land-value figures used in the comparison table), so the
// reader doesn't have to scan the prose above to find these numbers.
const SUMMARY_TABLE_FIELDS: ResidualField[] = [
  { key: "commercial_use_allowed", labelKey: "analysis.commercialUseAllowed" },
  { key: "tourist_use_allowed", labelKey: "analysis.touristUseAllowed" },
  { key: "gross_buildable_area", labelKey: "analysis.grossBuildableArea" },
  { key: "saleable_area", labelKey: "analysis.saleableArea" },
  { key: "estimated_residential_units", labelKey: "analysis.estimatedResidentialUnits" },
  { key: "estimated_hotel_rooms", labelKey: "analysis.estimatedHotelRooms" },
  { key: "estimated_tourist_apartments", labelKey: "analysis.estimatedTouristApartments" },
  { key: "construction_cost_assumption_eur_m2", labelKey: "analysis.constructionCostAssumption" },
  { key: "gross_development_value", labelKey: "analysis.grossDevelopmentValue" },
  { key: "developer_margin", labelKey: "analysis.developerMargin" },
  { key: "residual_land_value", labelKey: "analysis.residualLandValue" },
  { key: "highest_and_best_use", labelKey: "analysis.highestAndBestUse" },
];

const MODES: { mode: AnalysisMode; labelKey: string; hintKey: string }[] = [
  { mode: "knowledge", labelKey: "analysis.knowledgeModeLabel", hintKey: "analysis.knowledgeModeHint" },
  { mode: "web", labelKey: "analysis.webModeLabel", hintKey: "analysis.webModeHint" },
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
const EXPECTED_MS: Record<AnalysisMode, number> = { knowledge: 45_000, web: 120_000 };

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

/** Plain-text rendition of one mode's result, for the copy-to-clipboard button —
 * mirrors what's on screen (summary fields, residual land value, full report). */
function buildCopyText(result: AnalysisEngineResult, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const lines: string[] = [];
  if (result.data) {
    for (const { key, labelKey } of SUMMARY_FIELDS) {
      const value = result.data[key];
      if (typeof value === "string" && value) lines.push(`${t(labelKey)}: ${value}`);
    }
    for (const { key, labelKey } of LIST_FIELDS) {
      const value = result.data[key];
      if (Array.isArray(value) && value.length > 0) lines.push(`${t(labelKey)}: ${value.join(", ")}`);
    }
    if (result.data.residual_land_value) {
      lines.push("", t("analysis.residualLandValueHeading"));
      for (const { key, labelKey } of RESIDUAL_FIELDS) {
        const value = result.data.residual_land_value[key];
        if (value) lines.push(`${t(labelKey)}: ${value}`);
      }
    }
  }
  if (result.report) lines.push("", t("analysis.fullReportHeading"), result.report);
  if (result.data?.residual_land_value) {
    lines.push("", t("analysis.summaryTableHeading"));
    for (const { key, labelKey } of SUMMARY_TABLE_FIELDS) {
      const value = result.data.residual_land_value[key];
      if (value) lines.push(`${t(labelKey)}: ${value}`);
    }
  }
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

function ResultColumn({
  mode,
  modeLabelKey,
  modeHintKey,
  progress,
  outputLanguage,
  onLanguageChange,
  translating,
}: {
  mode: AnalysisMode;
  modeLabelKey: string;
  modeHintKey: string;
  progress: ModeProgress | null;
  outputLanguage: OutputLanguage;
  onLanguageChange: (mode: AnalysisMode, language: OutputLanguage) => void;
  translating: boolean;
}) {
  const { t } = useLocale();
  const result = progress?.result ?? null;

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
              <label className="sr-only" htmlFor={`analysis-output-language-${mode}`}>
                {t("analysis.outputLanguageLabel")}
              </label>
              <select
                id={`analysis-output-language-${mode}`}
                value={outputLanguage}
                onChange={(e) => onLanguageChange(mode, e.target.value as OutputLanguage)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {OUTPUT_LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <CopyButton text={buildCopyText(result, t)} label={t("analysis.copyResult")} />
            </div>
          )}
        </div>
        {translating && <p className="mt-1 text-xs text-muted-foreground">{t("analysis.translating")}</p>}
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

      {result && !result.error && (
        <div className="space-y-6 p-4" dir={outputLanguage === "he" ? "rtl" : undefined}>
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

          {result.data?.residual_land_value && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analysis.summaryTableHeading")}
              </h4>
              <div className="mt-2 overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <tbody>
                    {SUMMARY_TABLE_FIELDS.map(({ key, labelKey }) => {
                      const value = result.data?.residual_land_value?.[key];
                      return (
                        <tr key={key} className="border-b border-border last:border-0">
                          <td className="w-1/2 bg-surface-muted px-3 py-2 text-muted-foreground">{t(labelKey)}</td>
                          <td className="px-3 py-2 font-medium text-foreground">{value || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** End-of-analysis summary table: the headline residual land value numbers,
 * side by side for whichever modes have a completed, non-error result — added
 * alongside (not replacing) each column's own full Residual Land Value Engine
 * section, so the two modes can be compared directly without cross-referencing. */
function ComparisonTable({ progress }: { progress: Partial<Record<AnalysisMode, ModeProgress>> }) {
  const { t } = useLocale();
  const available = MODES.filter(({ mode }) => {
    const result = progress[mode]?.result;
    return result && !result.error && result.data?.residual_land_value;
  });
  if (available.length === 0) return null;

  const sourceLabel = (mode: AnalysisMode) =>
    progress[mode]?.source === "saved" ? t("analysis.savedResultBadge") : t("analysis.liveResultBadge");

  const copyText = [
    t("analysis.comparisonHeading"),
    "",
    [
      t("analysis.comparisonMetric"),
      ...available.map(({ mode, labelKey }) => `${t(labelKey)} (${sourceLabel(mode)})`),
    ].join("\t"),
    ...COMPARISON_FIELDS.map(({ key, labelKey }) =>
      [t(labelKey), ...available.map(({ mode }) => progress[mode]?.result?.data?.residual_land_value?.[key] || "—")].join(
        "\t"
      )
    ),
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
                  <div className="flex items-center gap-1.5">
                    {t(labelKey)}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium normal-case",
                        progress[mode]?.source === "saved"
                          ? "bg-surface-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {sourceLabel(mode)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_FIELDS.map(({ key, labelKey }) => (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{t(labelKey)}</td>
                {available.map(({ mode }) => (
                  <td key={mode} className="px-4 py-2 font-medium text-foreground">
                    {progress[mode]?.result?.data?.residual_land_value?.[key] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AnalysisEnginePanel() {
  const { t } = useLocale();
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [parcels, setParcels] = useState<ClientCatastroParcel[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedModes, setSelectedModes] = useState<Set<AnalysisMode>>(new Set(["knowledge"]));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Partial<Record<AnalysisMode, ModeProgress>> | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<Record<AnalysisMode, OutputLanguage>>({
    knowledge: "en",
    web: "en",
  });
  // Translated copies of each mode's original result, cached per language so
  // switching back and forth doesn't re-request a translation already fetched.
  const [translations, setTranslations] = useState<Partial<Record<AnalysisMode, Partial<Record<OutputLanguage, AnalysisEngineResult>>>>>({});
  const [translating, setTranslating] = useState<Partial<Record<AnalysisMode, boolean>>>({});

  // Loads whichever modes already have a saved (previously successful) result for
  // this parcel, so the report and comparison table are there immediately — no
  // need to click "Run analysis" again just to see a result that already exists.
  const loadSavedResults = async (parcelId: string) => {
    try {
      const res = await fetch(`/api/analysis-engine?parcelId=${encodeURIComponent(parcelId)}`);
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const fetched: ClientCatastroParcel[] = data.parcels ?? [];
        setParcels(fetched);
        if (fetched.length > 0) {
          setSelectedId(fetched[0].id);
          loadSavedResults(fetched[0].id);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFavorites(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMode = (mode: AnalysisMode) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  };

  // Switching properties makes any results on screen stale (they're for a
  // different parcel), so start fresh rather than leaving the old parcel's numbers
  // up next to a newly-selected one — then load whatever's already saved for the
  // newly-selected parcel.
  const selectParcel = (id: string) => {
    setSelectedId(id);
    setProgress(null);
    setRunError(null);
    setOutputLanguage({ knowledge: "en", web: "en" });
    setTranslations({});
    loadSavedResults(id);
  };

  const changeLanguage = async (mode: AnalysisMode, language: OutputLanguage) => {
    setOutputLanguage((prev) => ({ ...prev, [mode]: language }));
    // "en" is always the original, untranslated result — nothing to fetch.
    if (language === "en" || translations[mode]?.[language]) return;

    const original = progress?.[mode]?.result;
    if (!original || original.error) return;

    setTranslating((prev) => ({ ...prev, [mode]: true }));
    try {
      const res = await fetch("/api/analysis-engine/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, report: original.report, data: original.data, targetLanguage: language }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.result) {
        setTranslations((prev) => ({ ...prev, [mode]: { ...(prev[mode] ?? {}), [language]: json.result } }));
      }
    } finally {
      setTranslating((prev) => ({ ...prev, [mode]: false }));
    }
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
    if (!selectedId || modes.length === 0) return;
    setRunning(true);
    setRunError(null);
    // Only reset the mode(s) actually being (re)run — a previously-completed
    // result for a mode not included in this run is left exactly as it was, so
    // e.g. re-running just "web" after "knowledge" already finished doesn't wipe
    // out the knowledge-based result or the comparison table built from it. A
    // mode that's neither selected now nor has an earlier saved result gets a
    // notice explaining why it's empty, instead of just silently not appearing.
    setProgress((prev) => {
      const next = { ...(prev ?? {}) };
      for (const mode of modes) next[mode] = initialProgress();
      for (const { mode } of MODES) {
        if (modes.includes(mode)) continue;
        if (next[mode]?.result) {
          // Carried over from an earlier run — no longer "live" now that a new
          // run has started without it, so mark it as a saved result instead.
          next[mode] = { ...next[mode]!, source: "saved" };
        } else {
          next[mode] = { ...initialProgress(), notice: true };
        }
      }
      return next;
    });
    // A fresh run invalidates any cached translations of the old result for that
    // mode, and resets its language selector back to the original.
    setOutputLanguage((prev) => {
      const next = { ...prev };
      for (const mode of modes) next[mode] = "en";
      return next;
    });
    setTranslations((prev) => {
      const next = { ...prev };
      for (const mode of modes) delete next[mode];
      return next;
    });

    try {
      const res = await fetch("/api/analysis-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelId: selectedId, modes }),
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

  const isEmpty = !loadingFavorites && parcels.length === 0;
  const visibleModes = MODES.filter(({ mode }) => progress?.[mode]);

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
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="analysis-parcel-picker">
                {t("analysis.pickerLabel")}
              </label>
              <select
                id="analysis-parcel-picker"
                value={selectedId}
                onChange={(e) => selectParcel(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {parcels.map((parcel) => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.referenciaCatastral} — {formatCatastroParcelAddress(parcel)}
                  </option>
                ))}
              </select>
            </div>

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

            <button
              type="button"
              onClick={runAnalysis}
              disabled={running || !selectedId || selectedModes.size === 0}
              className={cn(
                "rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground",
                "disabled:opacity-50"
              )}
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

        {progress && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("analysis.disclaimer")}</span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row">
              {visibleModes.map(({ mode, labelKey, hintKey }) => {
                const modeProgress = progress[mode] ?? null;
                const lang = outputLanguage[mode];
                const displayedResult =
                  lang === "en" ? modeProgress?.result : translations[mode]?.[lang] ?? modeProgress?.result;
                const displayProgress: ModeProgress | null = modeProgress
                  ? { ...modeProgress, result: displayedResult ?? null }
                  : null;
                return (
                  <ResultColumn
                    key={mode}
                    mode={mode}
                    modeLabelKey={labelKey}
                    modeHintKey={hintKey}
                    progress={displayProgress}
                    outputLanguage={lang}
                    onLanguageChange={changeLanguage}
                    translating={translating[mode] ?? false}
                  />
                );
              })}
            </div>

            <ComparisonTable progress={progress} />
          </>
        )}
      </div>
    </div>
  );
}
