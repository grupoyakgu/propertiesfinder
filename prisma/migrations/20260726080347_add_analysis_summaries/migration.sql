-- CreateTable
CREATE TABLE "analysis_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "commercialUseAllowed" TEXT NOT NULL,
    "touristUseAllowed" TEXT NOT NULL,
    "grossBuildableArea" TEXT NOT NULL,
    "saleableArea" TEXT NOT NULL,
    "estimatedResidentialUnits" TEXT NOT NULL,
    "estimatedHotelRooms" TEXT NOT NULL,
    "estimatedTouristApartments" TEXT NOT NULL,
    "constructionCostPerSqm" TEXT NOT NULL,
    "grossDevelopmentValue" TEXT NOT NULL,
    "developerMargin" TEXT NOT NULL,
    "residualLandValue" TEXT NOT NULL,
    "highestAndBestUse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_summaries_userId_parcelId_mode_key" ON "analysis_summaries"("userId", "parcelId", "mode");

-- AddForeignKey
ALTER TABLE "analysis_summaries" ADD CONSTRAINT "analysis_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_summaries" ADD CONSTRAINT "analysis_summaries_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "catastro_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
