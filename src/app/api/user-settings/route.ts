import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const patchSchema = z
  .object({
    mapLocked: z.boolean().optional(),
    showAllOnMap: z.boolean().optional(),
  })
  .refine((data) => data.mapLocked !== undefined || data.showAllOnMap !== undefined, {
    message: "Nothing to update",
  });

// Persists the current user's own dashboard preferences (Map Lock, "show all
// on map") so they carry over to their next visit — no permission beyond
// being signed in, since this only ever touches the caller's own row.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
