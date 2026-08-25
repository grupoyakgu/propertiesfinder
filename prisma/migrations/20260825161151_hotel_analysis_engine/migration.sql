-- The Analysis Engine's prompt and output shape are being replaced entirely
-- (general Sevilla feasibility/residual-land-value study -> hotel/hospitality
-- use-rights study), so any existing rows are for a report shape that no
-- longer exists on either table — clear them before reshaping analysis_results
-- rather than trying to backfill parcelKey from data that won't be read again.
DELETE FROM "analysis_results";

-- DropForeignKey
ALTER TABLE "analysis_results" DROP CONSTRAINT "analysis_results_parcelId_fkey";

-- DropForeignKey
ALTER TABLE "analysis_summaries" DROP CONSTRAINT "analysis_summaries_parcelId_fkey";

-- DropForeignKey
ALTER TABLE "analysis_summaries" DROP CONSTRAINT "analysis_summaries_userId_fkey";

-- DropIndex
DROP INDEX "analysis_results_userId_parcelId_mode_key";

-- AlterTable
ALTER TABLE "analysis_results" DROP COLUMN "parcelId",
ADD COLUMN     "parcelIds" TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN     "parcelKey" TEXT NOT NULL DEFAULT '';

ALTER TABLE "analysis_results" ALTER COLUMN "parcelIds" DROP DEFAULT;
ALTER TABLE "analysis_results" ALTER COLUMN "parcelKey" DROP DEFAULT;

-- DropTable
DROP TABLE "analysis_summaries";

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "maxAnalysisPlots" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_results_userId_parcelKey_mode_key" ON "analysis_results"("userId", "parcelKey", "mode");

