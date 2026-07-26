import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isKnownPermission } from "@/lib/permissions";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    isActive: z.boolean().optional(),
    permissions: z.array(z.string()).optional(),
  })
  .refine((data) => data.name !== undefined || data.isActive !== undefined || data.permissions !== undefined, {
    message: "Nothing to update",
  })
  .refine((data) => !data.permissions || data.permissions.every(isKnownPermission), {
    message: "Unknown permission",
  });

// Admin-only. Toggles a target user's enabled/disabled state and/or their
// permission list (e.g. Analysis Engine access). There is no way to grant or
// revoke admin status here — that's a direct database change, not a UI action.
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, isActive, permissions } = parsed.data;

  // An admin disabling their own account would lock them out with no other
  // admin necessarily able to re-enable them — block it outright rather than
  // relying on the admin to notice.
  if (id === user.id && isActive === false) {
    return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(permissions !== undefined ? { permissions } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      isAdmin: true,
      isActive: true,
      permissions: true,
    },
  });

  return NextResponse.json({ user: updated });
}
