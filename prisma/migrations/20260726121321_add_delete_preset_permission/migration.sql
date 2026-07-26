-- AlterTable
ALTER TABLE "users" ALTER COLUMN "permissions" SET DEFAULT ARRAY['analysis_engine', 'delete_preset']::TEXT[];

-- Backfill: grant delete_preset to every existing user so today's behavior
-- (anyone can delete their own presets) is unchanged the moment this
-- permission starts being enforced. Only appends where missing, so it's a
-- no-op on rerun and doesn't touch anyone an admin later revokes it from.
UPDATE "users" SET "permissions" = array_append("permissions", 'delete_preset')
WHERE NOT ('delete_preset' = ANY("permissions"));
