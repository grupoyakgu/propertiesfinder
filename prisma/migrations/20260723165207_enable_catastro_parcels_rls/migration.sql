-- Enable Row Level Security on catastro_parcels for consistency with the
-- existing users/plots/favorites tables (deny-by-default for Supabase's
-- public PostgREST Data API; unaffected for the app's own direct Postgres
-- connection via Prisma, which runs as table owner and bypasses RLS).
ALTER TABLE "catastro_parcels" ENABLE ROW LEVEL SECURITY;
