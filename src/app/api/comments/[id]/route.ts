import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientComment } from "@/lib/types";

const patchSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(1).max(50).optional(),
    body: z.string().trim().min(1).max(4000).optional(),
  })
  .refine((data) => data.fullName !== undefined || data.phone !== undefined || data.body !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(request: Request, ctx: RouteContext<"/api/comments/[id]">) {
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

  // Only the comment's own author may edit it — checked against the signed-in
  // user, not the fullName/phone contact fields (which are freeform text the
  // author supplies and aren't an identity check).
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: parsed.data,
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment: toClientComment(comment) });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/comments/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  await prisma.comment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
