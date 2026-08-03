-- AlterTable
ALTER TABLE "favorites" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "map_presets" ADD COLUMN     "polygon" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mapLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showAllOnMap" BOOLEAN NOT NULL DEFAULT false;

-- RenameForeignKey
ALTER TABLE "favorites" RENAME CONSTRAINT "favorites_userId_fkey" TO "favorites_assignedUserId_fkey";
