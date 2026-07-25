import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_request: Request, ctx: RouteContext<"/api/comments/[id]/like">) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: user.id, commentId: id } },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentLike.create({ data: { userId: user.id, commentId: id } });
  }

  const likeCount = await prisma.commentLike.count({ where: { commentId: id } });

  return NextResponse.json({ liked: !existing, likeCount });
}
