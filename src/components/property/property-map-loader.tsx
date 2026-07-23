"use client";

import dynamic from "next/dynamic";
import type { PropertyMapLocation } from "@/components/property/property-map";

const PropertyMap = dynamic(() => import("@/components/property/property-map").then((m) => m.PropertyMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function PropertyMapLoader(location: PropertyMapLocation) {
  return <PropertyMap {...location} />;
}
