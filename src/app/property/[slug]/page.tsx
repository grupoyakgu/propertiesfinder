import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPinned } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toClientPlot } from "@/lib/types";
import { formatArea, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import {
  buildingTypeLabels,
  cadastralClassLabels,
  developmentPotentialLabels,
  landUseLabels,
  planningStatusLabels,
  plotShapeLabels,
  topographyLabels,
} from "@/lib/labels";
import { DetailSection, DetailRow } from "@/components/property/detail-section";
import { PropertyMapLoader } from "@/components/property/property-map-loader";
import { AIAnalysisPanel } from "@/components/property/ai-analysis-panel";
import { LogoutButton } from "@/components/auth/logout-button";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await prisma.plot.findUnique({ where: { slug } });
  if (!record) notFound();

  const plot = toClientPlot(record);
  const { locale, t } = await getServerTranslator();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("backToSearch")}
        </Link>
        <Link href="/" className="flex items-center gap-2 text-primary">
          <MapPinned className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <LogoutButton />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {planningStatusLabels[locale][plot.planningStatus]}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {plot.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {plot.address}, {plot.municipality}, {plot.province}, {plot.autonomousCommunity}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(plot.purchasePrice)}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(plot.pricePerSqm)}/m²</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DetailSection title={t("detail.generalInformation")}>
              <DetailRow label={t("detail.address")} value={plot.address} />
              <DetailRow label={t("detail.municipality")} value={plot.municipality} />
              <DetailRow label={t("detail.province")} value={plot.province} />
              <DetailRow label={t("detail.autonomousCommunity")} value={plot.autonomousCommunity} />
              <DetailRow
                label={t("detail.coordinates")}
                value={`${plot.latitude.toFixed(5)}, ${plot.longitude.toFixed(5)}`}
              />
              <DetailRow label={t("detail.referenceNumber")} value={plot.referenciaCatastral} />
            </DetailSection>

            <DetailSection title={t("detail.landData")}>
              <DetailRow label={t("detail.plotSizeLabel")} value={formatArea(plot.plotSize)} />
              <DetailRow label={t("detail.superficieGrafica")} value={formatArea(plot.superficieGrafica)} />
              <DetailRow label={t("detail.superficieConstruida")} value={formatArea(plot.builtArea)} />
              <DetailRow label={t("detail.buildableArea")} value={formatArea(plot.maxBuildableArea)} />
              <DetailRow label={t("detail.buildabilityRatio")} value={formatNumber(plot.buildabilityRatio, 2)} />
              <DetailRow label={t("detail.occupancy")} value={formatPercent(plot.occupancyRatio)} />
              <DetailRow label={t("detail.currentUse")} value={landUseLabels[locale][plot.landUse]} />
              <DetailRow label={t("detail.claseDeInmueble")} value={cadastralClassLabels[locale][plot.cadastralUse]} />
              <DetailRow label={t("detail.buildingType")} value={buildingTypeLabels[locale][plot.buildingType]} />
              <DetailRow
                label={t("detail.buildingYear")}
                value={plot.constructionYear ?? "—"}
              />
              <DetailRow label={t("detail.numberOfFloors")} value={plot.numberOfFloors} />
              <DetailRow label={t("detail.plotShape")} value={plotShapeLabels[locale][plot.plotShape]} />
              <DetailRow label={t("detail.cornerPlot")} value={plot.cornerPlot ? t("detail.yes") : t("detail.no")} />
              <DetailRow label={t("detail.frontageWidth")} value={`${formatNumber(plot.frontageWidth, 1)} m`} />
              <DetailRow label={t("detail.depth")} value={`${formatNumber(plot.depth, 1)} m`} />
              <DetailRow label={t("detail.topography")} value={topographyLabels[locale][plot.topography]} />
              <DetailRow label={t("detail.valorCatastral")} value={formatCurrency(plot.valorCatastral)} />
            </DetailSection>

            <DetailSection title={t("detail.planningInformation")}>
              <DetailRow label={t("detail.zoning")} value={plot.zoning} />
              <DetailRow label={t("detail.planningStatus")} value={planningStatusLabels[locale][plot.planningStatus]} />
              <DetailRow
                label={t("detail.developmentPotential")}
                value={plot.developmentPotential.map((p) => developmentPotentialLabels[locale][p]).join(", ")}
              />
              <DetailRow label={t("detail.allowedUses")} value={plot.allowedUses.join(", ") || "—"} />
              <DetailRow label={t("detail.maximumHeight")} value={plot.maxHeight ? `${plot.maxHeight} m` : "—"} />
              <div className="col-span-full">
                <dt className="mb-1 text-xs text-muted-foreground">{t("detail.restrictions")}</dt>
                <dd className="text-sm text-foreground">
                  {plot.restrictions.length ? (
                    <ul className="list-inside list-disc space-y-1">
                      {plot.restrictions.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    t("detail.noneDocumented")
                  )}
                </dd>
              </div>
            </DetailSection>

            <DetailSection title={t("detail.investment")}>
              <DetailRow label={t("detail.purchasePrice")} value={formatCurrency(plot.purchasePrice)} />
              <DetailRow label={t("detail.pricePerSqm")} value={formatCurrency(plot.pricePerSqm)} />
              <DetailRow
                label={t("detail.estimatedConstructionCost")}
                value={formatCurrency(plot.estimatedConstructionCost)}
              />
              <DetailRow label={t("detail.expectedRoi")} value={formatPercent(plot.expectedROI)} />
              <DetailRow label={t("detail.expectedYield")} value={formatPercent(plot.expectedYield)} />
              <DetailRow label={t("detail.developmentMargin")} value={formatPercent(plot.developmentMargin)} />
            </DetailSection>

            {plot.description && (
              <DetailSection title={t("detail.description")}>
                <p className="col-span-full text-sm leading-relaxed text-foreground">{plot.description}</p>
              </DetailSection>
            )}
          </div>

          <div className="space-y-6">
            <div className="h-72 overflow-hidden rounded-xl border border-border">
              <PropertyMapLoader
                latitude={plot.latitude}
                longitude={plot.longitude}
                boundary={plot.boundary}
              />
            </div>

            {plot.nearbyAmenities.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t("detail.nearbyAmenities")}</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plot.nearbyAmenities.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <AIAnalysisPanel slug={plot.slug} />
          </div>
        </div>
      </main>
    </div>
  );
}
