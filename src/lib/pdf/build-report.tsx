import { Document, Page, View, Text, Link, renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import type { ClientCatastroParcel } from "@/lib/types";
import type { AnalysisEngineResult, AnalysisMode } from "@/lib/analysis-engine";
import { translate, type Locale } from "@/lib/i18n/translations";
import { formatCatastroParcelDisplayAddress } from "@/lib/utils";
import { colors, typography, layout, toc as tocStyles } from "@/lib/pdf/styles";
import {
  buildCatastroSection,
  buildComparisonSection,
  buildDisclaimerSection,
  buildExecutiveSummarySection,
  buildModeSection,
  type PdfSection,
} from "@/lib/pdf/sections";

function t(locale: Locale, key: string, vars?: Record<string, string | number>) {
  return translate(locale, key, vars);
}

function Header({ locale, parcels }: { locale: Locale; parcels: ClientCatastroParcel[] }) {
  return (
    <View fixed style={layout.headerFixed}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: colors.primary }}>
        {t(locale, "pdf.footerBrand")}
      </Text>
      <Text style={{ fontSize: 8, color: colors.muted }}>
        {t(locale, "pdf.referenceLabel")} {parcels.map((p) => p.referenciaCatastral).join(", ")}
      </Text>
    </View>
  );
}

function Footer({ locale }: { locale: Locale }) {
  return (
    <View fixed style={layout.footerFixed}>
      <Text style={{ fontSize: 7.5, color: colors.muted }}>{t(locale, "pdf.footerBrand")}</Text>
      <Text
        style={{ fontSize: 7.5, color: colors.muted }}
        render={({ pageNumber, totalPages }) => t(locale, "pdf.pageOf", { n: pageNumber, total: totalPages })}
      />
    </View>
  );
}

function Cover({
  locale,
  parcels,
  generatedAt,
}: {
  locale: Locale;
  parcels: ClientCatastroParcel[];
  generatedAt: Date;
}) {
  const dateLabel = generatedAt.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const first = parcels[0];

  return (
    <View style={{ marginTop: 60, marginBottom: 20 }}>
      <View style={{ height: 4, width: 64, backgroundColor: colors.primary, marginBottom: 18 }} />
      <Text style={typography.coverTitle}>{t(locale, "pdf.coverTitle")}</Text>
      <Text style={typography.coverSubtitle}>{t(locale, "pdf.coverSubtitle")}</Text>

      <View style={{ marginTop: 30, marginBottom: 24 }}>
        <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: colors.ink, marginBottom: 3 }}>
          {parcels.length > 1
            ? t(locale, "pdf.multiPlotTitle", { n: parcels.length })
            : formatCatastroParcelDisplayAddress(first) || first.referenciaCatastral}
        </Text>
        <Text style={{ fontSize: 9.5, color: colors.muted }}>
          {t(locale, "pdf.referenceLabel")} {parcels.map((p) => p.referenciaCatastral).join(", ")}
        </Text>
      </View>

      <View
        style={{
          borderWidth: 0.75,
          borderColor: colors.border,
          borderRadius: 2,
          padding: 12,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ fontSize: 8.5, color: colors.muted }}>
          {first.municipality}, {first.province} · {first.autonomousCommunity}
        </Text>
        <Text style={{ fontSize: 8.5, color: colors.muted, marginTop: 3 }}>
          {parcels.map((p) => `${p.plotSize} m²`).join(" + ")} · {first.latitude.toFixed(5)}, {first.longitude.toFixed(5)}
        </Text>
      </View>

      <Text style={{ fontSize: 8.5, color: colors.muted, marginTop: 28 }}>
        {t(locale, "pdf.generatedOn", { date: dateLabel })}
      </Text>
    </View>
  );
}

function TableOfContents({
  locale,
  entries,
}: {
  locale: Locale;
  entries: { id: string; title: string; page: number }[];
}) {
  return (
    <View>
      <Text style={typography.h1}>{t(locale, "pdf.tocTitle")}</Text>
      <View style={{ marginTop: 10 }}>
        {entries.map((entry) => (
          <Link key={entry.id} src={`#${entry.id}`} style={{ textDecoration: "none" }}>
            <View style={tocStyles.entry}>
              <Text style={[tocStyles.entryTitle, { color: colors.ink }]}>{entry.title}</Text>
              <View style={tocStyles.dots} />
              <Text style={tocStyles.entryPage}>{entry.page}</Text>
            </View>
          </Link>
        ))}
      </View>
    </View>
  );
}

/** Renders a single section in isolation (fresh page, same page geometry as
 * the real document) purely to measure how many physical pages it occupies.
 * Since every section is placed with `break` in the final document (always
 * starts at the top of a fresh page), a section's page count in isolation is
 * exactly its page count in the combined document — this is what makes a
 * two-pass "measure, then compose with real page numbers" TOC possible
 * without react-pdf exposing per-element page positions directly. */
async function measurePageCount(node: React.ReactNode): Promise<number> {
  const buffer = await renderToBuffer(
    <Document>
      <Page size="A4" style={layout.page} wrap>
        {node}
      </Page>
    </Document>
  );
  const doc = await PDFDocument.load(buffer);
  return doc.getPageCount();
}

// The cover is designed to comfortably fit on one page (brand mark, title,
// subtitle, a short property snapshot, generated date — nothing that grows
// unboundedly), so its page count is a fixed assumption rather than
// measured. Same for the TOC: at most ~6 entries (Executive Summary,
// Catastro Data, up to two mode analyses, comparison, disclaimer) always
// fits on a single page.
const COVER_PAGE_COUNT = 1;
const TOC_PAGE_COUNT = 1;
const TOC_THRESHOLD_PAGES = 5;

export interface BuildAnalysisReportPdfInput {
  parcels: ClientCatastroParcel[];
  results: Partial<Record<AnalysisMode, AnalysisEngineResult>>;
  locale: Locale;
  generatedAt?: Date;
}

export async function buildAnalysisReportPdf({
  parcels,
  results,
  locale,
  generatedAt = new Date(),
}: BuildAnalysisReportPdfInput): Promise<Buffer> {
  const sections: PdfSection[] = [
    buildExecutiveSummarySection(parcels, results, locale),
    buildCatastroSection(parcels, locale),
  ];
  for (const mode of ["knowledge", "web", "hybrid"] as AnalysisMode[]) {
    const result = results[mode];
    if (result && !result.error) sections.push(buildModeSection(mode, result, locale));
  }
  const comparison = buildComparisonSection(results, locale);
  if (comparison) sections.push(comparison);
  sections.push(buildDisclaimerSection(locale));

  // Pass 1: measure each section's page span in isolation.
  const pageCounts = await Promise.all(sections.map((s) => measurePageCount(s.node)));
  const totalWithoutToc = COVER_PAGE_COUNT + pageCounts.reduce((a, b) => a + b, 0);
  const includeToc = totalWithoutToc > TOC_THRESHOLD_PAGES;
  const tocPageCount = includeToc ? TOC_PAGE_COUNT : 0;

  let runningPage = COVER_PAGE_COUNT + tocPageCount;
  const tocEntries = sections.map((section, i) => {
    const startPage = runningPage + 1;
    runningPage += pageCounts[i];
    return { id: section.id, title: section.title, page: startPage };
  });

  // Pass 2: compose the real document, now that page numbers are known.
  const document = (
    <Document title={t(locale, "pdf.coverTitle")} author="Grupo Yakgu">
      <Page size="A4" style={layout.page} wrap>
        <Header locale={locale} parcels={parcels} />
        <Footer locale={locale} />
        <Cover locale={locale} parcels={parcels} generatedAt={generatedAt} />
        {includeToc && (
          <View break>
            <TableOfContents locale={locale} entries={tocEntries} />
          </View>
        )}
        {sections.map((section) => (
          <View key={section.id} id={section.id} break wrap>
            {section.node}
          </View>
        ))}
      </Page>
    </Document>
  );

  return renderToBuffer(document);
}
