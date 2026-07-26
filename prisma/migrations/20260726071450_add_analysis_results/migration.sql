-- CreateTable
CREATE TABLE "analysis_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_results_userId_parcelId_mode_key" ON "analysis_results"("userId", "parcelId", "mode");

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "catastro_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
