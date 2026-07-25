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

  const comments = await getClientComments(parsed.data.source, parsed.data.propertyId, user.id);
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

  const comment = await prisma.comment.create({
    data: { userId: user.id, ...parsed.data },
    include: { user: { select: { id: true, name: true } }, _count: { select: { likes: true } } },
  });

  // A brand-new comment can't have any likes yet, including from its own author.
  return NextResponse.json({ comment: toClientComment(comment, false) }, { status: 201 });
}
