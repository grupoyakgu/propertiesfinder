-- Data-only migration: no schema.prisma change accompanies this, since
-- export_pdf is NOT added to the permissions column's default. Unlike
-- delete_preset (a pre-existing capability being retrofitted with a
-- permission), export_pdf is a brand-new capability that ships gated from
-- day one — every user other than the bootstrap admin must be explicitly
-- granted it via the Admin tab.
--
-- Grants export_pdf to the current admin(s) only, so they can use/test the
-- new PDF export feature immediately after this deploys.
UPDATE "users" SET "permissions" = array_append("permissions", 'export_pdf')
WHERE "isAdmin" = true AND NOT ('export_pdf' = ANY("permissions"));
