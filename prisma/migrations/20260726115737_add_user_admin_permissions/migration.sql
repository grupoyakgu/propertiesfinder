-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permissions" TEXT[] NOT NULL DEFAULT ARRAY['analysis_engine']::TEXT[];

-- Bootstrap: koby.ram1@gmail.com is the first admin user. One-time data fix —
-- a no-op if that account hasn't signed up yet in this environment (the signup
-- route also grants admin automatically for this exact email as a fallback).
-- There is no UI to grant admin; future admins are promoted the same way, via
-- a direct database update.
UPDATE "users" SET "isAdmin" = true WHERE "email" = 'koby.ram1@gmail.com';
