import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/plots/[slug]">
) {
  const { slug } = await ctx.params;
  const plot = await prisma.plot.findUnique({ where: { slug } });

  if (!plot) {
    return NextResponse.json({ error: "Plot not found" }, { status: 404 });
  }

  return NextResponse.json({ plot });
}
