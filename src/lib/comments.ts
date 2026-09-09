import { supabase } from "@/lib/supabase";
import { type ClientComment } from "@/lib/types";

export async function getClientComments(propertyId: string): Promise<ClientComment[]> {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("*, users:user_id(id, name)")
    .eq("source", "catastro")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error || !comments) return [];

  return comments.map((comment: any) => ({
    id: comment.id,
    body: comment.body,
    createdAt: new Date(comment.created_at).toISOString(),
    updatedAt: new Date(comment.updated_at).toISOString(),
    authorId: comment.users?.id || comment.user_id,
    authorName: comment.users?.name || "Unknown",
  }));
}
