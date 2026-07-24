
-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_plotId_fkey";

-- DropIndex
DROP INDEX "favorites_userId_plotId_key";

-- AlterTable
ALTER TABLE "favorites" DROP COLUMN "plotId",
ADD COLUMN     "propertyId" TEXT NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_source_propertyId_key" ON "favorites"("userId", "source", "propertyId");

