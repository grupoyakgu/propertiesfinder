import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const presetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  south: z.number(),
  west: z.number(),
  north: z.number(),
  east: z.number(),
  isDefault: z.boolean().optional(),
  // The dashboard's full search filter state at save time — an opaque object as far
  // as this route is concerned; only ever read back by the same client that wrote it.
  filters: z.record(z.string(), z.unknown()).optional(),
  // A hand-drawn area — a GeoJSON [lng, lat] ring — for restricting this preset's
  // results to points inside it, not just within south/west/north/east.
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3).optional(),
});

// Presets are shared: every signed-in user sees everyone's saved viewports (not
// just their own), so the list is a common set of jumping-off points for the
// whole team rather than a personal bookmark list. Mutation (rename/delete/set
// default) stays restricted to each preset's own creator — see the [id] route.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const presets = await prisma.mapPreset.findMany({
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
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

  const { name, south, west, north, east, isDefault, filters, polygon } = parsed.data;
  const filtersJson = filters as Prisma.InputJsonValue | undefined;
  const polygonJson = polygon as Prisma.InputJsonValue | undefined;

  const preset = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.mapPreset.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.mapPreset.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {
        south,
        west,
        north,
        east,
        filters: filtersJson,
        polygon: polygonJson,
        ...(isDefault ? { isDefault: true } : {}),
      },
      create: {
        userId: user.id,
        name,
        south,
        west,
        north,
        east,
        filters: filtersJson,
        polygon: polygonJson,
        isDefault: isDefault ?? false,
      },
      include: { user: { select: { name: true } } },
    });
  });

  return NextResponse.json({ preset }, { status: 201 });
}
