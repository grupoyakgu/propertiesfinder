import { View, Text } from "@react-pdf/renderer";
import type { ClientCatastroParcel } from "@/lib/types";
import type { AnalysisEngineData, AnalysisEngineResult, AnalysisMode, HotelVerdict } from "@/lib/analysis-engine";
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

function verdictLabel(locale: Locale, verdict: HotelVerdict): string {
  return t(locale, `analysis.verdict${verdict.charAt(0)}${verdict.slice(1).toLowerCase()}`);
}

function verdictTone(verdict: HotelVerdict): "info" | "warning" | "danger" {
  return verdict === "YES" ? "info" : verdict === "NO" ? "danger" : "warning";
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
// Catastro property data — one plot, or several when this is a consolidated
// multi-plot run (see analysis-engine.ts's "Multiple Plots" behavior).
// ---------------------------------------------------------------------------

function parcelRows(parcel: ClientCatastroParcel, locale: Locale): { label: string; value: string }[] {
  return [
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
}

export function buildCatastroSection(parcels: ClientCatastroParcel[], locale: Locale): PdfSection {
  return {
    id: "catastro",
    title: t(locale, "pdf.catastroSectionTitle"),
    node: (
      <View>
        <Text style={typography.h1}>{t(locale, "pdf.catastroSectionTitle")}</Text>
        {parcels.map((parcel, i) => (
          <View key={parcel.id} style={{ marginTop: i === 0 ? 0 : 10 }}>
            {parcels.length > 1 && <Text style={typography.h3}>{parcel.referenciaCatastral}</Text>}
            <DataTable rows={parcelRows(parcel, locale)} />
          </View>
        ))}
      </View>
    ),
  };
}

// ---------------------------------------------------------------------------
// One mode's full hotel/hospitality-use answer (Knowledge-based / Web-grounded
// / Hybrid)
// ---------------------------------------------------------------------------

const MODE_TITLE_KEYS: Record<AnalysisMode, string> = {
  knowledge: "pdf.knowledgeSectionTitle",
  web: "pdf.webSectionTitle",
  hybrid: "pdf.hybridSectionTitle",
};

const MODE_LABEL_KEYS: Record<AnalysisMode, string> = {
  knowledge: "analysis.knowledgeModeLabel",
  web: "analysis.webModeLabel",
  hybrid: "analysis.hybridModeLabel",
};

function developmentRightsRows(data: AnalysisEngineData): { label: string; value: string }[] {
  return (data.developmentRights ?? []).map((row) => ({ label: row.parameter, value: row.potentialRight }));
}

export function buildModeSection(mode: AnalysisMode, result: AnalysisEngineResult, locale: Locale): PdfSection {
  const title = t(locale, MODE_TITLE_KEYS[mode]);
  const data = result.data;

  return {
    id: mode,
    title,
    node: (
      <View>
        <Text style={typography.h1}>{title}</Text>

        {data && (
          <View>
            <Callout tone={verdictTone(data.verdict)} title={verdictLabel(locale, data.verdict)}>
              {data.explanation}
            </Callout>

            {data.individualVerdicts && data.individualVerdicts.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={typography.h3}>{t(locale, "analysis.individualVerdictsHeading")}</Text>
                <BulletList
                  items={data.individualVerdicts.map(
                    (v) => `${v.referenciaCatastral}: ${verdictLabel(locale, v.verdict)} — ${v.explanation}`
                  )}
                />
              </View>
            )}

            {data.verdict === "YES" && data.developmentRights && data.developmentRights.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={typography.h2}>{t(locale, "analysis.developmentRightsHeading")}</Text>
                <DataTable rows={developmentRightsRows(data)} />
              </View>
            )}

            {data.verdict === "UNCERTAIN" && data.uncertainRequirements && data.uncertainRequirements.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={typography.h3}>{t(locale, "analysis.uncertainRequirementsHeading")}</Text>
                <BulletList items={data.uncertainRequirements} />
              </View>
            )}
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
// Side-by-side comparison (only when 2+ modes produced a result)
// ---------------------------------------------------------------------------

export function buildComparisonSection(
  results: Partial<Record<AnalysisMode, AnalysisEngineResult>>,
  locale: Locale
): PdfSection | null {
  const available = (Object.keys(results) as AnalysisMode[]).filter((mode) => {
    const r = results[mode];
    return r && !r.error && r.data;
  });
  if (available.length < 2) return null;

  const title = t(locale, "pdf.comparisonSectionTitle");
  const colWidth = `${Math.floor(64 / available.length)}%`;

  return {
    id: "comparison",
    title,
    node: (
      <View>
        <Text style={typography.h1}>{title}</Text>
        <View style={compareTable.table}>
          <View style={compareTable.headerRow}>
            <Text style={[compareTable.headerCell, { width: "36%" }]}>{t(locale, "analysis.comparisonMetric")}</Text>
            {available.map((mode) => (
              <Text key={mode} style={[compareTable.headerCell, { width: colWidth }]}>
                {t(locale, MODE_LABEL_KEYS[mode])}
              </Text>
            ))}
          </View>
          <View style={compareTable.row}>
            <Text style={[compareTable.metricCell, { width: "36%" }]}>{t(locale, "analysis.verdictLabel")}</Text>
            {available.map((mode) => (
              <Text key={mode} style={[compareTable.valueCell, { width: colWidth }]}>
                {verdictLabel(locale, results[mode]!.data!.verdict)}
              </Text>
            ))}
          </View>
          <View style={compareTable.rowLast}>
            <Text style={[compareTable.metricCell, { width: "36%" }]}>{t(locale, "analysis.explanationLabel")}</Text>
            {available.map((mode) => (
              <Text key={mode} style={[compareTable.valueCell, { width: colWidth }]}>
                {results[mode]!.data!.explanation || "—"}
              </Text>
            ))}
          </View>
        </View>
      </View>
    ),
  };
}

// ---------------------------------------------------------------------------
// Executive summary (cover-adjacent, always first section)
// ---------------------------------------------------------------------------

export function buildExecutiveSummarySection(
  parcels: ClientCatastroParcel[],
  results: Partial<Record<AnalysisMode, AnalysisEngineResult>>,
  locale: Locale
): PdfSection {
  const title = t(locale, "pdf.executiveSummaryTitle");
  const available = (Object.keys(results) as AnalysisMode[]).filter((mode) => {
    const r = results[mode];
    return r && !r.error;
  });
  const modesText = available.map((mode) => t(locale, MODE_LABEL_KEYS[mode])).join(" · ");

  return {
    id: "summary",
    title,
    node: (
      <View>
        <Text style={typography.h1}>{title}</Text>
        <Text style={[typography.body, { marginBottom: 8 }]}>
          {parcels.length > 1
            ? t(locale, "pdf.executiveSummaryIntroMulti", { n: parcels.length })
            : t(locale, "pdf.executiveSummaryIntro")}
        </Text>
        {modesText && (
          <Text style={[typography.body, { marginBottom: 10 }]}>
            {t(locale, "pdf.executiveSummaryModesNote", { modes: modesText })}
          </Text>
        )}

        {available.map((mode) => {
          const data = results[mode]?.data;
          if (!data) return null;
          return (
            <Callout key={mode} tone={verdictTone(data.verdict)} title={`${t(locale, MODE_LABEL_KEYS[mode])} — ${verdictLabel(locale, data.verdict)}`}>
              {data.explanation}
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
