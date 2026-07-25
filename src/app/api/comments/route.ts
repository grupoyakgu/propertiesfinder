import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientComment } from "@/lib/types";
import { getClientComments } from "@/lib/comments";

const querySchema = z.object({
  source: z.enum(["plots", "catastro"]),
  propertyId: z.string().min(1),
});

const createSchema = z.object({
  source: z.enum(["plots", "catastro"]),
  propertyId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    source: searchParams.get("source"),
    propertyId: searchParams.get("propertyId"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const comments = await getClientComments(parsed.data.source, parsed.data.propertyId);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { source, propertyId } = parsed.data;

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { userId: user.id, ...parsed.data },
      include: { user: { select: { id: true, name: true } } },
    }),
    // Commenting on a property is treated as expressing interest in it — like it
    // too, the same way the property's own Like button would. Upsert (rather than
    // create) since re-commenting on an already-liked property shouldn't error.
    prisma.favorite.upsert({
      where: { userId_source_propertyId: { userId: user.id, source, propertyId } },
      create: { userId: user.id, source, propertyId },
      update: {},
    }),
  ]);

  return NextResponse.json({ comment: toClientComment(comment), propertyLiked: true }, { status: 201 });
}
