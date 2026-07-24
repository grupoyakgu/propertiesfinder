import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const patchSchema = z.object({
  isDefault: z.literal(true),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/map-presets/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.mapPreset.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }

  const preset = await prisma.$transaction(async (tx) => {
    await tx.mapPreset.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
    return tx.mapPreset.update({ where: { id }, data: { isDefault: true } });
  });

  return NextResponse.json({ preset });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/map-presets/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.mapPreset.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }

  await prisma.mapPreset.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
