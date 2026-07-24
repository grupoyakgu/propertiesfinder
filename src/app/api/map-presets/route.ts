import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const presetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  south: z.number(),
  west: z.number(),
  north: z.number(),
  east: z.number(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const presets = await prisma.mapPreset.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ presets });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = presetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, south, west, north, east, isDefault } = parsed.data;

  const preset = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.mapPreset.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.mapPreset.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: { south, west, north, east, ...(isDefault ? { isDefault: true } : {}) },
      create: { userId: user.id, name, south, west, north, east, isDefault: isDefault ?? false },
    });
  });

  return NextResponse.json({ preset }, { status: 201 });
}
