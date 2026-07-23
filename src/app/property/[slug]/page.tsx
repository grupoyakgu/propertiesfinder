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

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await prisma.plot.findUnique({ where: { slug } });
  if (!record) notFound();

  const plot = toClientPlot(record);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to search
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
              {planningStatusLabels[plot.planningStatus]}
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
            <DetailSection title="General Information">
              <DetailRow label="Address" value={plot.address} />
              <DetailRow label="Municipality" value={plot.municipality} />
              <DetailRow label="Province" value={plot.province} />
              <DetailRow label="Autonomous Community" value={plot.autonomousCommunity} />
              <DetailRow
                label="Coordinates"
                value={`${plot.latitude.toFixed(5)}, ${plot.longitude.toFixed(5)}`}
              />
              <DetailRow label="Reference Number" value={plot.referenciaCatastral} />
            </DetailSection>

            <DetailSection title="Land Data">
              <DetailRow label="Plot Size (Superficie del terreno)" value={formatArea(plot.plotSize)} />
              <DetailRow label="Superficie gráfica" value={formatArea(plot.superficieGrafica)} />
              <DetailRow label="Superficie construida" value={formatArea(plot.builtArea)} />
              <DetailRow label="Buildable Area" value={formatArea(plot.maxBuildableArea)} />
              <DetailRow label="Buildability ratio (edificabilidad)" value={formatNumber(plot.buildabilityRatio, 2)} />
              <DetailRow label="Occupancy" value={formatPercent(plot.occupancyRatio)} />
              <DetailRow label="Current Use (Uso principal)" value={landUseLabels[plot.landUse]} />
              <DetailRow label="Clase de inmueble" value={cadastralClassLabels[plot.cadastralUse]} />
              <DetailRow label="Building Type" value={buildingTypeLabels[plot.buildingType]} />
              <DetailRow
                label="Building Year (Año de construcción)"
                value={plot.constructionYear ?? "—"}
              />
              <DetailRow label="Number of Floors" value={plot.numberOfFloors} />
              <DetailRow label="Plot Shape" value={plotShapeLabels[plot.plotShape]} />
              <DetailRow label="Corner Plot" value={plot.cornerPlot ? "Yes" : "No"} />
              <DetailRow label="Frontage Width" value={`${formatNumber(plot.frontageWidth, 1)} m`} />
              <DetailRow label="Depth" value={`${formatNumber(plot.depth, 1)} m`} />
              <DetailRow label="Topography" value={topographyLabels[plot.topography]} />
              <DetailRow label="Valor catastral" value={formatCurrency(plot.valorCatastral)} />
            </DetailSection>

            <DetailSection title="Planning Information">
              <DetailRow label="Zoning" value={plot.zoning} />
              <DetailRow label="Planning Status" value={planningStatusLabels[plot.planningStatus]} />
              <DetailRow
                label="Development Potential"
                value={plot.developmentPotential.map((p) => developmentPotentialLabels[p]).join(", ")}
              />
              <DetailRow label="Allowed Uses" value={plot.allowedUses.join(", ") || "—"} />
              <DetailRow label="Maximum Height" value={plot.maxHeight ? `${plot.maxHeight} m` : "—"} />
              <div className="col-span-full">
                <dt className="mb-1 text-xs text-muted-foreground">Restrictions</dt>
                <dd className="text-sm text-foreground">
                  {plot.restrictions.length ? (
                    <ul className="list-inside list-disc space-y-1">
                      {plot.restrictions.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    "None documented"
                  )}
                </dd>
              </div>
            </DetailSection>

            <DetailSection title="Investment">
              <DetailRow label="Purchase Price" value={formatCurrency(plot.purchasePrice)} />
              <DetailRow label="Price per m²" value={formatCurrency(plot.pricePerSqm)} />
              <DetailRow
                label="Estimated Construction Cost"
                value={formatCurrency(plot.estimatedConstructionCost)}
              />
              <DetailRow label="Expected ROI" value={formatPercent(plot.expectedROI)} />
              <DetailRow label="Expected Yield" value={formatPercent(plot.expectedYield)} />
              <DetailRow label="Development Margin" value={formatPercent(plot.developmentMargin)} />
            </DetailSection>

            {plot.description && (
              <DetailSection title="Description">
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
                <h3 className="mb-2 text-sm font-semibold text-foreground">Nearby Amenities</h3>
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
