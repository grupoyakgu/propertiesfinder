import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPlotWhere, parseSort } from "@/lib/plot-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildPlotWhere(searchParams);
  const orderBy = parseSort(searchParams.get("sort"));

  const take = Math.min(Number(searchParams.get("limit")) || 2000, 5000);

  const [plots, total] = await Promise.all([
    prisma.plot.findMany({ where, orderBy, take }),
    prisma.plot.count({ where }),
  ]);

  return NextResponse.json({ plots, count: plots.length, total });
}
