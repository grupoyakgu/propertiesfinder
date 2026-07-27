-- Favorites become shared "Opportunities": one row per property (not per
-- user), with a reassignable owner and a review status. See the Favorite
-- model comment in schema.prisma.

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('IN_REVIEW', 'NOT_RELEVANT', 'VALIDATED');

-- Dedupe: under the old per-user model, several different users could each
-- favorite the same property, producing multiple rows for the same
-- (source, propertyId). Keep only the earliest one (its favoriter becomes
-- the opportunity's owner) so the new one-row-per-property unique
-- constraint below doesn't fail on existing data.
DELETE FROM "favorites" a USING "favorites" b
WHERE a."source" = b."source"
  AND a."propertyId" = b."propertyId"
  AND (a."createdAt" > b."createdAt" OR (a."createdAt" = b."createdAt" AND a."id" > b."id"));

-- DropIndex (old per-user unique constraint)
DROP INDEX IF EXISTS "favorites_userId_source_propertyId_key";

-- RenameColumn: the sole favoriter becomes the opportunity's initial owner
ALTER TABLE "favorites" RENAME COLUMN "userId" TO "assignedUserId";

-- AlterTable
ALTER TABLE "favorites"
  ADD COLUMN "status" "OpportunityStatus" NOT NULL DEFAULT 'IN_REVIEW',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex (new shared-opportunity unique constraint)
CREATE UNIQUE INDEX "favorites_source_propertyId_key" ON "favorites"("source", "propertyId");
