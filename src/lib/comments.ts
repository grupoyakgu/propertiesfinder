import { prisma } from "@/lib/prisma";
import { toClientComment, type ClientComment } from "@/lib/types";

/** Fetches a property's comments — shared by both detail pages and the comments
 * list API route so the include shape toClientComment expects lives in one place. */
export async function getClientComments(
  source: "plots" | "catastro",
  propertyId: string
): Promise<ClientComment[]> {
  const comments = await prisma.comment.findMany({
    where: { source, propertyId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return comments.map(toClientComment);
}
