import { prisma } from "@/lib/prisma";
import { toClientComment, type ClientComment } from "@/lib/types";

/** Fetches a property's comments plus, when signed in, which of them the current
 * user has liked — shared by both detail pages so the like-lookup logic (and the
 * include shape toClientComment expects) lives in one place. */
export async function getClientComments(
  source: "plots" | "catastro",
  propertyId: string,
  userId: string | null
): Promise<ClientComment[]> {
  const comments = await prisma.comment.findMany({
    where: { source, propertyId },
    include: { user: { select: { id: true, name: true } }, _count: { select: { likes: true } } },
    orderBy: { createdAt: "desc" },
  });

  const likedIds = userId
    ? new Set(
        (
          await prisma.commentLike.findMany({
            where: { userId, commentId: { in: comments.map((c) => c.id) } },
            select: { commentId: true },
          })
        ).map((l) => l.commentId)
      )
    : new Set<string>();

  return comments.map((c) => toClientComment(c, likedIds.has(c.id)));
}
