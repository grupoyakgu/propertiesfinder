import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.isDefault !== undefined, {
    message: "Nothing to update",
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

  const { name, isDefault } = parsed.data;

  try {
    const preset = await prisma.$transaction(async (tx) => {
      // Setting a preset as default unsets whichever one held that spot before
      // (only one default at a time). Unsetting is a no-op on other presets.
      if (isDefault === true) {
        await tx.mapPreset.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.mapPreset.update({
        where: { id },
        data: { ...(name !== undefined ? { name } : {}), ...(isDefault !== undefined ? { isDefault } : {}) },
      });
    });
    return NextResponse.json({ preset });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a preset with that name" },
        { status: 409 }
      );
    }
    throw error;
  }
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
