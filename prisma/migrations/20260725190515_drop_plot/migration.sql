-- Remove any favorites/comments that referenced now-deleted Plot rows (the
-- source+propertyId columns aren't FK-enforced, so these would otherwise be
-- silently orphaned once the plots table is dropped below).
DELETE FROM "favorites" WHERE "source" = 'plots';
DELETE FROM "comments" WHERE "source" = 'plots';

-- DropTable
DROP TABLE "plots";

-- DropEnum
DROP TYPE "BuildingType";

-- DropEnum
DROP TYPE "DevelopmentPotential";

-- DropEnum
DROP TYPE "PlanningStatus";

-- DropEnum
DROP TYPE "PlotShape";

-- DropEnum
DROP TYPE "Topography";
