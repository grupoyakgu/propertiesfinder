import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientComment } from "@/lib/types";

const querySchema = z.object({
  source: z.enum(["plots", "catastro"]),
  propertyId: z.string().min(1),
});

const createSchema = z.object({
  source: z.enum(["plots", "catastro"]),
  propertyId: z.string().min(1),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
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

  const comments = await prisma.comment.findMany({
    where: { source: parsed.data.source, propertyId: parsed.data.propertyId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ comments: comments.map(toClientComment) });
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
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment: toClientComment(comment) }, { status: 201 });
}
