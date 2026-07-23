-- CreateTable
CREATE TABLE "catastro_parcels" (
    "id" TEXT NOT NULL,
    "referenciaCatastral" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "autonomousCommunity" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "boundary" JSONB NOT NULL,
    "plotSize" DOUBLE PRECISION NOT NULL,
    "builtArea" DOUBLE PRECISION,
    "constructionYear" INTEGER,
    "numberOfFloors" INTEGER,
    "cadastralUse" "CadastralClass" NOT NULL,
    "landUse" "LandUse",
    "sourceDataset" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catastro_parcels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catastro_parcels_referenciaCatastral_key" ON "catastro_parcels"("referenciaCatastral");

-- CreateIndex
CREATE INDEX "catastro_parcels_municipality_province_idx" ON "catastro_parcels"("municipality", "province");
