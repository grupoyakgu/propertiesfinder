-- AlterTable
ALTER TABLE "users" ALTER COLUMN "permissions" SET DEFAULT ARRAY['analysis_engine']::TEXT[];

-- The delete_preset permission is retired: map presets are now shared (every
-- signed-in user sees everyone's) and deletion is restricted by ownership
-- instead of a grantable permission (see the map-presets API routes). Strip
-- the now-meaningless value from every user's permissions array.
UPDATE "users" SET "permissions" = array_remove("permissions", 'delete_preset');
