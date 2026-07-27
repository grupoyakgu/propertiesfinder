import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientCatastroParcel, toClientOpportunity } from "@/lib/types";

const patchSchema = z
  .object({
    status: z.enum(["IN_REVIEW", "NOT_RELEVANT", "VALIDATED"]).optional(),
    assignedUserId: z.string().min(1).optional(),
  })
  .refine((data) => data.status !== undefined || data.assignedUserId !== undefined, {
    message: "Nothing to update",
  });

// Any signed-in user may change an opportunity's status or reassign its owner
// to any other active user — opportunities are a shared, collaborative list,
// not personal data, so there's no ownership check here (unlike map presets).
export async function PATCH(request: Request, ctx: RouteContext<"/api/favorites/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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

  const existing = await prisma.favorite.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const { status, assignedUserId } = parsed.data;

  if (assignedUserId !== undefined) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedUserId } });
    if (!assignee || !assignee.isActive) {
      return NextResponse.json({ error: "That user isn't available to assign" }, { status: 400 });
    }
  }

  const favorite = await prisma.favorite.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(assignedUserId !== undefined ? { assignedUserId } : {}),
    },
    include: { assignedUser: { select: { name: true } } },
  });

  const parcel = await prisma.catastroParcel.findUnique({ where: { id: favorite.propertyId } });
  if (!parcel) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json({ opportunity: toClientOpportunity(favorite, toClientCatastroParcel(parcel)) });
}
