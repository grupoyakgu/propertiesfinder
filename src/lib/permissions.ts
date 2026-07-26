// The known set of per-user feature permissions an admin can grant/revoke —
// see prisma/schema.prisma's User.permissions field. Add new permission
// strings here as features gain their own toggle; each route that gates on a
// permission should check against a value from this list.
export const KNOWN_PERMISSIONS = ["analysis_engine"] as const;

export type Permission = (typeof KNOWN_PERMISSIONS)[number];

export function isKnownPermission(value: string): value is Permission {
  return (KNOWN_PERMISSIONS as readonly string[]).includes(value);
}
