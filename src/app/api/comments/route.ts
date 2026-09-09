import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { getClientComments } from "@/lib/comments";

const querySchema = z.object({
  propertyId: z.string().min(1),
});

const createSchema = z.object({
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
    propertyId: searchParams.get("propertyId"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const comments = await getClientComments(parsed.data.propertyId);
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
  const { propertyId, body: commentBody } = parsed.data;

  const commentId = randomBytes(12).toString("hex");

  // Create comment
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({
      id: commentId,
      user_id: user.id,
      source: "catastro",
      property_id: propertyId,
      body: commentBody,
    })
    .select("*, users:user_id(id, name)")
    .single();

  if (commentError || !comment) {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }

  // Upsert favorite (add to opportunities if not already there)
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("source", "catastro")
    .eq("property_id", propertyId)
    .single();

  if (!existing) {
    const favoriteId = randomBytes(12).toString("hex");
    await supabase.from("favorites").insert({
      id: favoriteId,
      assigned_user_id: user.id,
      source: "catastro",
      property_id: propertyId,
    });
  }

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: new Date(comment.created_at).toISOString(),
        updatedAt: new Date(comment.updated_at).toISOString(),
        authorId: comment.users?.id || user.id,
        authorName: comment.users?.name || user.name,
      },
      propertyLiked: true,
    },
    { status: 201 }
  );
}
