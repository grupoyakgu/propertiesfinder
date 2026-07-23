import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPinned } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toClientCatastroParcel } from "@/lib/types";
import { formatArea, formatCatastroParcelAddress } from "@/lib/utils";
import { cadastralClassLabels, landUseLabels } from "@/lib/labels";
import { DetailSection, DetailRow } from "@/components/property/detail-section";
import { PropertyMapLoader } from "@/components/property/property-map-loader";
import { LogoutButton } from "@/components/auth/logout-button";
import { CopyButton } from "@/components/ui/copy-button";

export default async function CatastroParcelPage({
  params,
}: {
  params: Promise<{ referencia: string }>;
}) {
  const { referencia } = await params;
  const record = await prisma.catastroParcel.findUnique({
    where: { referenciaCatastral: referencia },
  });
  if (!record) notFound();

  const parcel = toClientCatastroParcel(record);

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
              Official Catastro Record
            </span>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {parcel.referenciaCatastral}
              <CopyButton value={parcel.referenciaCatastral} />
            </h1>
            {parcel.streetName && (
              <p className="mt-1 text-sm font-medium text-foreground">
                {parcel.streetName}
                {parcel.streetNumber ? `, ${parcel.streetNumber}` : ""}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {parcel.municipality}, {parcel.province}, {parcel.autonomousCommunity}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-foreground">{formatArea(parcel.plotSize)}</p>
            <p className="text-sm text-muted-foreground">{cadastralClassLabels[parcel.cadastralUse]}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DetailSection title="General Information">
              <DetailRow label="Address" value={formatCatastroParcelAddress(parcel)} />
              <DetailRow label="Municipality" value={parcel.municipality} />
              <DetailRow label="Province" value={parcel.province} />
              <DetailRow label="Autonomous Community" value={parcel.autonomousCommunity} />
              <DetailRow
                label="Coordinates"
                value={`${parcel.latitude.toFixed(5)}, ${parcel.longitude.toFixed(5)}`}
              />
              <DetailRow
                label="Referencia Catastral"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {parcel.referenciaCatastral}
                    <CopyButton value={parcel.referenciaCatastral} />
                  </span>
                }
              />
              <DetailRow label="Source Dataset" value={parcel.sourceDataset} />
              <DetailRow
                label="Imported"
                value={new Date(parcel.importedAt).toLocaleDateString("es-ES")}
              />
            </DetailSection>

            <DetailSection title="Land Data">
              <DetailRow label="Plot Size (Superficie del terreno)" value={formatArea(parcel.plotSize)} />
              <DetailRow label="Superficie construida" value={formatArea(parcel.builtArea)} />
              <DetailRow label="Clase de inmueble" value={cadastralClassLabels[parcel.cadastralUse]} />
              <DetailRow
                label="Current Use (Uso principal)"
                value={parcel.landUse ? landUseLabels[parcel.landUse] : "—"}
              />
              <DetailRow
                label="Building Year (Año de construcción)"
                value={parcel.constructionYear ?? "—"}
              />
              <DetailRow label="Number of Floors" value={parcel.numberOfFloors ?? "—"} />
            </DetailSection>
          </div>

          <div className="space-y-6">
            <div className="h-72 overflow-hidden rounded-xl border border-border">
              <PropertyMapLoader
                latitude={parcel.latitude}
                longitude={parcel.longitude}
                boundary={parcel.boundary}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
