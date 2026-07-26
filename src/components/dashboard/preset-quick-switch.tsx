"use client";

import { LocateFixed } from "lucide-react";
import { Select } from "@/components/ui/input";
import type { ClientMapPreset } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

/** Fast, lightweight navigation between saved presets — a native <select> so it can
 * never be visually covered by the map (unlike a custom absolute-positioned dropdown,
 * which sits below Leaflet's panes/controls in the stacking order). All maintenance
 * (saving, deleting, setting a default) lives in the Settings tab instead. */
export function PresetQuickSwitch({
  presets,
  currentUserId,
  activePresetId,
  onApply,
  onRefocus,
}: {
  presets: ClientMapPreset[];
  /** Used only to label presets someone else saved (e.g. "City Center — by Maria")
   * so the shared list stays legible — every preset here is applicable to anyone. */
  currentUserId: string;
  activePresetId: string | null;
  onApply: (preset: ClientMapPreset) => void;
  /** Re-center the map on the currently active preset without touching filters —
   * needed because panning away doesn't change the <select>'s value, so re-picking
   * the same option again wouldn't otherwise fire a change event. */
  onRefocus: (preset: ClientMapPreset) => void;
}) {
  const { t } = useLocale();

  if (presets.length === 0) return null;

  const activePreset = presets.find((p) => p.id === activePresetId) ?? null;

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <Select
        value={activePresetId ?? ""}
        onChange={(e) => {
          const preset = presets.find((p) => p.id === e.target.value);
          if (preset) onApply(preset);
        }}
        className="w-40 shrink-0"
      >
        <option value="" disabled>
          {t("presets.trigger")}
        </option>
        {presets.map((preset) => {
          const label = preset.isDefault ? `★ ${preset.name}` : preset.name;
          return (
            <option key={preset.id} value={preset.id}>
              {preset.ownerId === currentUserId ? label : `${label} (${t("presets.byOwner", { name: preset.ownerName })})`}
            </option>
          );
        })}
      </Select>
      {activePreset && (
        <button
          type="button"
          onClick={() => onRefocus(activePreset)}
          title={t("presets.refocus", { name: activePreset.name })}
          className="shrink-0 rounded-md border border-border p-2 text-muted-foreground hover:text-primary"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
