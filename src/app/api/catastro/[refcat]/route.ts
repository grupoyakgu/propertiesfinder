import { NextResponse } from "next/server";
import { lookupByReferenciaCatastral } from "@/lib/catastro";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/catastro/[refcat]">
) {
  const { refcat } = await ctx.params;
  const result = await lookupByReferenciaCatastral(refcat);

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
