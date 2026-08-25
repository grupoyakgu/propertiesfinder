"use client";

import { Lock, LassoSelect, X } from "lucide-react";
import type { ClientMapPreset } from "@/lib/types";
import { PresetQuickSwitch } from "@/components/dashboard/preset-quick-switch";
import { PresetSaveControl } from "@/components/dashboard/preset-save-control";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

/** Every control that only makes sense while the map is showing — drawing an
 * area, the active-area-filter badge, jumping between presets, saving the
 * current view — grouped in the sidebar above Filters, in the same document
 * flow as the rest of the browsing controls (rather than fighting for space
 * in the header, where most of them were previously hidden below the `sm`
 * breakpoint). The caller only renders this while `mapVisible` is true, which
 * is what makes it "fold away" when the map is hidden. */
export function MapControlsPanel({
  mapLocked,
  drawMode,
  onToggleDrawMode,
  activePolygon,
  onClearActivePolygon,
  presets,
  activePresetId,
  onApplyPreset,
  onRefocusPreset,
  canSavePreset,
  onSavePreset,
}: {
  mapLocked: boolean;
  drawMode: boolean;
  onToggleDrawMode: () => void;
  activePolygon: number[][] | null;
  onClearActivePolygon: () => void;
  presets: ClientMapPreset[];
  activePresetId: string | null;
  onApplyPreset: (preset: ClientMapPreset) => void;
  onRefocusPreset: (preset: ClientMapPreset) => void;
  canSavePreset: boolean;
  onSavePreset: (name: string) => void | Promise<void>;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-2 border-b border-border p-4">
      <h2 className="text-sm font-semibold text-foreground">{t("dashboard.mapControlsTitle")}</h2>

      {mapLocked && (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {t("dashboard.mapLockedHint")}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleDrawMode}
        title={t("dashboard.drawAreaHint")}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium",
          drawMode ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"
        )}
      >
        <LassoSelect className="h-3.5 w-3.5" />
        {t("dashboard.drawArea")}
      </button>

      {activePolygon && !drawMode && (
        <button
          type="button"
          onClick={onClearActivePolygon}
          title={t("dashboard.clearAreaFilter")}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-accent bg-accent/10 px-3 py-2 text-xs font-medium text-accent-foreground"
        >
          {t("dashboard.areaFilterActive")}
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <PresetSaveControl canSave={canSavePreset} onSave={onSavePreset} layout="sidebar" />

      {presets.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">{t("presets.sectionTitle")}</p>
          <PresetQuickSwitch
            presets={presets}
            activePresetId={activePresetId}
            onApply={onApplyPreset}
            onRefocus={onRefocusPreset}
            layout="sidebar"
          />
        </div>
      )}
    </div>
  );
}
