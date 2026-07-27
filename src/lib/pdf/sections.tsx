import { View, Text } from "@react-pdf/renderer";
import type { ClientCatastroParcel } from "@/lib/types";
import type { AnalysisEngineData, AnalysisEngineResult, AnalysisMode, ResidualLandValue } from "@/lib/analysis-engine";
import { translate, type Locale } from "@/lib/i18n/translations";
import { cadastralClassLabels, landUseLabels } from "@/lib/labels";
import { formatCatastroParcelDisplayAddress } from "@/lib/utils";
import { typography, layout, dataTable, compareTable, callout } from "@/lib/pdf/styles";
import { MarkdownBlock } from "@/lib/pdf/markdown";

export interface PdfSection {
  id: string;
  title: string;
  node: React.ReactNode;
}

function t(locale: Locale, key: string, vars?: Record<string, string | number>) {
  return translate(locale, key, vars);
}

function DataTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={dataTable.table}>
      {rows.map((r, i) => (
        <View key={i} style={i === rows.length - 1 ? dataTable.rowLast : dataTable.row}>
          <Text style={dataTable.labelCell}>{r.label}</Text>
          <Text style={dataTable.valueCell}>{r.value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      {items.map((item, i) => (
        <View key={i} style={layout.bulletRow}>
          <Text style={layout.bulletDot}>{"•"}</Text>
          <Text style={layout.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "info" | "warning" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  const toneStyle = tone === "warning" ? callout.warning : tone === "danger" ? callout.danger : callout.info;
  const titleTone = tone === "warning" ? callout.titleWarning : tone === "danger" ? callout.titleDanger : callout.titleInfo;
  return (
    <View style={[callout.base, toneStyle]}>
      <Text style={[callout.title, titleTone]}>{title}</Text>
      <Text style={callout.text}>{children}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Catastro property data
// ---------------------------------------------------------------------------

export function buildCatastroSection(parcel: ClientCatastroParcel, locale: Locale): PdfSection {
  const rows = [
    { label: t(locale, "detail.referenciaCatastral"), value: parcel.referenciaCatastral },
    { label: t(locale, "detail.address"), value: formatCatastroParcelDisplayAddress(parcel) || "—" },
    { label: t(locale, "detail.municipality"), value: parcel.municipality },
    { label: t(locale, "detail.province"), value: parcel.province },
    { label: t(locale, "detail.autonomousCommunity"), value: parcel.autonomousCommunity },
    { label: t(locale, "detail.coordinates"), value: `${parcel.latitude.toFixed(6)}, ${parcel.longitude.toFixed(6)}` },
    { label: t(locale, "detail.plotSizeLabel"), value: `${parcel.plotSize} m²` },
    {
      label: t(locale, "detail.superficieConstruida"),
      value: parcel.builtArea != null ? `${parcel.builtArea} m²` : "—",
    },
    { label: t(locale, "detail.buildingYear"), value: parcel.constructionYear != null ? String(parcel.constructionYear) : "—" },
    { label: t(locale, "detail.numberOfFloors"), value: parcel.numberOfFloors != null ? String(parcel.numberOfFloors) : "—" },
    { label: t(locale, "detail.claseDeInmueble"), value: cadastralClassLabels[locale][parcel.cadastralUse] },
    { label: t(locale, "detail.currentUse"), value: parcel.landUse ? landUseLabels[locale][parcel.landUse] : "—" },
  ];

  return {
    id: "catastro",
    title: t(locale, "pdf.catastroSectionTitle"),
    node: (
      <View>
        <Text style={typography.h1}>{t(locale, "pdf.catastroSectionTitle")}</Text>
        <DataTable rows={rows} />
      </View>
    ),
  };
}

// ---------------------------------------------------------------------------
// Residual land value table (shared by mode sections + comparison)
// ---------------------------------------------------------------------------

const RESIDUAL_FIELDS: { key: keyof ResidualLandValue; labelKey: string }[] = [
  { key: "commercial_use_allowed", labelKey: "analysis.commercialUseAllowed" },
  { key: "tourist_use_allowed", labelKey: "analysis.touristUseAllowed" },
  { key: "gross_buildable_area", labelKey: "analysis.grossBuildableArea" },
  { key: "saleable_area", labelKey: "analysis.saleableArea" },
  { key: "estimated_residential_units", labelKey: "analysis.estimatedResidentialUnits" },
  { key: "estimated_hotel_rooms", labelKey: "analysis.estimatedHotelRooms" },
  { key: "estimated_tourist_apartments", labelKey: "analysis.estimatedTouristApartments" },
  { key: "estimated_studio_apartments", labelKey: "analysis.estimatedStudioApartments" },
  { key: "commercial_area", labelKey: "analysis.commercialArea" },
  { key: "parking_spaces", labelKey: "analysis.parkingSpaces" },
  { key: "construction_cost_assumption_eur_m2", labelKey: "analysis.constructionCostAssumption" },
  { key: "total_construction_cost", labelKey: "analysis.totalConstructionCost" },
  { key: "gross_development_value", labelKey: "analysis.grossDevelopmentValue" },
  { key: "developer_margin", labelKey: "analysis.developerMargin" },
  { key: "residual_land_value", labelKey: "analysis.residualLandValue" },
  { key: "highest_and_best_use", labelKey: "analysis.highestAndBestUse" },
];

const COMPARISON_FIELDS: { key: keyof ResidualLandValue; labelKey: string }[] = [
  { key: "gross_buildable_area", labelKey: "analysis.grossBuildableArea" },
  { key: "saleable_area", labelKey: "analysis.saleableArea" },
  { key: "estimated_residential_units", labelKey: "analysis.estimatedResidentialUnits" },
  { key: "estimated_hotel_rooms", labelKey: "analysis.estimatedHotelRooms" },
  { key: "estimated_tourist_apartments", labelKey: "analysis.estimatedTouristApartments" },
  { key: "estimated_studio_apartments", labelKey: "analysis.estimatedStudioApartments" },
  { key: "construction_cost_assumption_eur_m2", labelKey: "analysis.constructionCostAssumption" },
  { key: "gross_development_value", labelKey: "analysis.grossDevelopmentValue" },
  { key: "developer_margin", labelKey: "analysis.developerMargin" },
  { key: "residual_land_value", labelKey: "analysis.residualLandValue" },
  { key: "highest_and_best_use", labelKey: "analysis.highestAndBestUse" },
];

const SUMMARY_FIELDS: { key: keyof AnalysisEngineData; labelKey: string }[] = [
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

// ---------------------------------------------------------------------------
// One mode's full analysis (Knowledge-based or Web-grounded)
// ---------------------------------------------------------------------------

export function buildModeSection(
  mode: AnalysisMode,
  result: AnalysisEngineResult,
  locale: Locale
): PdfSection {
  const titleKey = mode === "knowledge" ? "pdf.knowledgeSectionTitle" : "pdf.webSectionTitle";
  const title = t(locale, titleKey);
  const data = result.data;

  const summaryRows = data
    ? SUMMARY_FIELDS.map(({ key, labelKey }) => ({
        label: t(locale, labelKey),
        value: typeof data[key] === "string" ? (data[key] as string) : "",
      })).filter((r) => r.value)
    : [];

  const listFields: { labelKey: string; items: string[] }[] = data
    ? [
        { labelKey: "analysis.allowedUses", items: data.allowed_uses ?? [] },
        { labelKey: "analysis.heritageConstraints", items: data.heritage_constraints ?? [] },
        { labelKey: "analysis.planningConstraints", items: data.planning_constraints ?? [] },
        { labelKey: "analysis.developmentOptions", items: data.development_options ?? [] },
      ].filter((f) => f.items.length > 0)
    : [];

  const rlv = data?.residual_land_value;
  const rlvRows = rlv
    ? RESIDUAL_FIELDS.map(({ key, labelKey }) => ({ label: t(locale, labelKey), value: rlv[key] ?? "" }))
    : [];

  return {
    id: mode === "knowledge" ? "knowledge" : "web",
    title,
    node: (
      <View>
        <Text style={typography.h1}>{title}</Text>

        {summaryRows.length > 0 && (
          <View>
            <Text style={typography.h2}>{t(locale, "analysis.summaryHeading")}</Text>
            <DataTable rows={summaryRows} />
          </View>
        )}

        {listFields.map((f) => (
          <View key={f.labelKey} style={{ marginTop: 8 }}>
            <Text style={typography.h3}>{t(locale, f.labelKey)}</Text>
            <BulletList items={f.items} />
          </View>
        ))}

        {rlvRows.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text style={typography.h2}>{t(locale, "analysis.residualLandValueHeading")}</Text>
            <DataTable rows={rlvRows} />
          </View>
        )}

        {result.report && (
          <View style={{ marginTop: 10 }} wrap>
            <Text style={typography.h2}>{t(locale, "pdf.fullReportHeading")}</Text>
            <MarkdownBlock text={result.report} keyPrefix={`${mode}-report`} />
          </View>
        )}
      </View>
    ),
  };
}

// ---------------------------------------------------------------------------
// Side-by-side comparison (only when both modes are present)
// ---------------------------------------------------------------------------

export function buildComparisonSection(
  knowledge: AnalysisEngineResult,
  web: AnalysisEngineResult,
  locale: Locale
): PdfSection | null {
  const kRlv = knowledge.data?.residual_land_value;
  const wRlv = web.data?.residual_land_value;
  if (!kRlv || !wRlv) return null;

  const title = t(locale, "pdf.comparisonSectionTitle");

  return {
    id: "comparison",
    title,
    node: (
      <View>
        <Text style={typography.h1}>{title}</Text>
        <View style={compareTable.table}>
          <View style={compareTable.headerRow}>
            <Text style={[compareTable.headerCell, { width: "36%" }]}>{t(locale, "analysis.comparisonMetric")}</Text>
            <Text style={[compareTable.headerCell, { width: "32%" }]}>{t(locale, "analysis.knowledgeModeLabel")}</Text>
            <Text style={[compareTable.headerCell, { width: "32%" }]}>{t(locale, "analysis.webModeLabel")}</Text>
          </View>
          {COMPARISON_FIELDS.map(({ key, labelKey }, i) => (
            <View key={key} style={i === COMPARISON_FIELDS.length - 1 ? compareTable.rowLast : compareTable.row}>
              <Text style={[compareTable.metricCell, { width: "36%" }]}>{t(locale, labelKey)}</Text>
              <Text style={[compareTable.valueCell, { width: "32%" }]}>{kRlv[key] || "—"}</Text>
              <Text style={[compareTable.valueCell, { width: "32%" }]}>{wRlv[key] || "—"}</Text>
            </View>
          ))}
        </View>
      </View>
    ),
  };
}

// ---------------------------------------------------------------------------
// Executive summary (cover-adjacent, always first section)
// ---------------------------------------------------------------------------

export function buildExecutiveSummarySection(
  parcel: ClientCatastroParcel,
  knowledge: AnalysisEngineResult | null,
  web: AnalysisEngineResult | null,
  locale: Locale
): PdfSection {
  const title = t(locale, "pdf.executiveSummaryTitle");
  const hasKnowledge = !!knowledge && !knowledge.error;
  const hasWeb = !!web && !web.error;
  const modesText = hasKnowledge && hasWeb
    ? t(locale, "pdf.modeBoth")
    : hasKnowledge
      ? t(locale, "pdf.modeKnowledgeOnly")
      : t(locale, "pdf.modeWebOnly");

  const highlights: { mode: string; data: AnalysisEngineData }[] = [];
  if (hasKnowledge && knowledge?.data) highlights.push({ mode: t(locale, "analysis.knowledgeModeLabel"), data: knowledge.data });
  if (hasWeb && web?.data) highlights.push({ mode: t(locale, "analysis.webModeLabel"), data: web.data });

  return {
    id: "summary",
    title,
    node: (
      <View>
        <Text style={typography.h1}>{title}</Text>
        <Text style={[typography.body, { marginBottom: 8 }]}>{t(locale, "pdf.executiveSummaryIntro")}</Text>
        <Text style={[typography.body, { marginBottom: 10 }]}>
          {t(locale, "pdf.executiveSummaryModesNote", { modes: modesText })}
        </Text>

        {highlights.map(({ mode, data }) => {
          const rlv = data.residual_land_value;
          if (!rlv && !data.overall_score) return null;
          return (
            <Callout key={mode} tone="info" title={mode}>
              {[
                data.overall_score ? `${t(locale, "pdf.opportunityScoreLabel")}: ${data.overall_score}` : null,
                rlv?.residual_land_value
                  ? `${t(locale, "pdf.residualLandValueLabel")}: ${rlv.residual_land_value}`
                  : null,
                rlv?.highest_and_best_use
                  ? `${t(locale, "pdf.highestAndBestUseLabel")}: ${rlv.highest_and_best_use}`
                  : null,
              ]
                .filter(Boolean)
                .join("   •   ")}
            </Callout>
          );
        })}
      </View>
    ),
  };
}

// ---------------------------------------------------------------------------
// Disclaimer + signature (always last section)
// ---------------------------------------------------------------------------

export function buildDisclaimerSection(locale: Locale): PdfSection {
  const title = t(locale, "pdf.disclaimerSectionTitle");
  return {
    id: "disclaimer",
    title,
    node: (
      <View>
        <Text style={typography.h1}>{title}</Text>
        <Callout tone="warning" title={locale === "es" ? "Aviso" : "Notice"}>
          {locale === "es"
            ? "Este es un estudio preliminar de viabilidad generado por IA y no sustituye el informe de un arquitecto o urbanista colegiado. Cada cifra debe verificarse frente al PGOU oficial, el GeoPortal municipal y los instrumentos de planeamiento aplicables antes de tomar cualquier decision de inversion."
            : "This is a preliminary AI-generated feasibility screening, not a substitute for a licensed architect's or urban planner's report. Every figure must be verified against the official PGOU, municipal GeoPortal, and applicable planning instruments before being relied on for an investment decision."}
        </Callout>
        <View style={{ marginTop: 28, alignItems: "center" }}>
          <View style={{ borderTopWidth: 0.75, borderTopColor: "#dbe4e3", width: 220, marginBottom: 8 }} />
          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#0f3d3e" }}>
            {t(locale, "pdf.signatureLine")}
          </Text>
        </View>
      </View>
    ),
  };
}
