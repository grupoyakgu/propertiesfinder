import { DashboardApp } from "@/components/dashboard/dashboard-app";
import { filtersFromSearchParams } from "@/lib/filter-types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }

  const initialFilters = filtersFromSearchParams(params);
  const initialSource = params.get("tab") === "plots" ? "plots" : "catastro";
  const initialMapVisible = params.get("map") === "1";

  return (
    <DashboardApp
      initialFilters={initialFilters}
      initialSource={initialSource}
      initialMapVisible={initialMapVisible}
    />
  );
}
