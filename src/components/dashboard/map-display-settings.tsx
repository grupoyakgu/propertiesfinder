"use client";

import { CheckboxOption } from "@/components/ui/filter-controls";
import { useLocale } from "@/lib/i18n/context";

export function MapDisplaySettings({
  showAllOnMap,
  onChange,
  mapLocked,
  onMapLockedChange,
}: {
  showAllOnMap: boolean;
  onChange: (value: boolean) => void;
  mapLocked: boolean;
  onMapLockedChange: (value: boolean) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="border-b border-border p-6">
      <div className="mx-auto max-w-xl">
        <h2 className="text-sm font-semibold text-foreground">{t("dashboard.mapDisplayTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.mapDisplayDescription")}</p>
        <div className="mt-4 space-y-2">
          <CheckboxOption label={t("dashboard.showOnMapToggle")} checked={showAllOnMap} onChange={onChange} />
          <CheckboxOption
            label={t("dashboard.mapLockToggle")}
            checked={mapLocked}
            onChange={onMapLockedChange}
          />
        </div>
      </div>
    </div>
  );
}
