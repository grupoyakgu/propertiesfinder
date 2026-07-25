import { prisma } from "@/lib/prisma";
import { toClientComment, type ClientComment } from "@/lib/types";

/** Fetches a property's comments — shared by the detail page and the comments
 * list API route so the include shape toClientComment expects lives in one place. */
export async function getClientComments(propertyId: string): Promise<ClientComment[]> {
  const comments = await prisma.comment.findMany({
    where: { source: "catastro", propertyId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return comments.map(toClientComment);
}
