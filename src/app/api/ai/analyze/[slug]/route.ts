import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzePlotInvestment } from "@/lib/ai";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/ai/analyze/[slug]">
) {
  const { slug } = await ctx.params;
  const plot = await prisma.plot.findUnique({ where: { slug } });

  if (!plot) {
    return NextResponse.json({ error: "Plot not found" }, { status: 404 });
  }

  const analysis = await analyzePlotInvestment(plot);

  await prisma.plot.update({
    where: { id: plot.id },
    data: {
      aiScore: analysis.score,
      aiSummary: analysis.summary,
      aiAnalyzedAt: new Date(),
    },
  });

  return NextResponse.json({ analysis });
}
