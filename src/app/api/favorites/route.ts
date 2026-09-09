import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { toClientCatastroParcel, toClientOpportunity, type ClientOpportunity } from "@/lib/types";

const toggleSchema = z.object({
  propertyId: z.string().min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: favorites, error: favError } = await supabase
    .from("favorites")
    .select("*, users:assigned_user_id(name)")
    .eq("source", "catastro")
    .order("created_at", { ascending: false });

  if (favError || !favorites) {
    return NextResponse.json({ opportunities: [] });
  }

  const parcelIds = favorites.map((f: any) => f.property_id);

  if (parcelIds.length === 0) {
    return NextResponse.json({ opportunities: [] });
  }

  const { data: parcels } = await supabase
    .from("catastro_parcels")
    .select("*")
    .in("id", parcelIds);

  const parcelById = new Map((parcels || []).map((p: any) => [p.id, toClientCatastroParcel(p)]));

  const opportunities = favorites
    .map((favorite: any) => {
      const parcel = parcelById.get(favorite.property_id);
      if (!parcel) return null;
      return toClientOpportunity(
        {
          id: favorite.id,
          status: favorite.status,
          assignedUserId: favorite.assigned_user_id,
          assignedUser: { name: favorite.users?.name || "Unknown" },
          createdAt: new Date(favorite.created_at),
        },
        parcel
      );
    })
    .filter((o): o is ClientOpportunity => o !== null);

  return NextResponse.json({ opportunities });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { propertyId } = parsed.data;

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("source", "catastro")
    .eq("property_id", propertyId)
    .single();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  }

  const { randomBytes } = await import("crypto");
  const favoriteId = randomBytes(12).toString("hex");

  await supabase.from("favorites").insert({
    id: favoriteId,
    assigned_user_id: user.id,
    source: "catastro",
    property_id: propertyId,
  });

  return NextResponse.json({ liked: true });
}
