"use client";

import { Select } from "@/components/ui/input";
import type { ClientMapPreset } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

/** Fast, lightweight navigation between saved presets — a native <select> so it can
 * never be visually covered by the map (unlike a custom absolute-positioned dropdown,
 * which sits below Leaflet's panes/controls in the stacking order). All maintenance
 * (saving, deleting, setting a default) lives in the Settings tab instead. */
export function PresetQuickSwitch({
  presets,
  activePresetId,
  onApply,
}: {
  presets: ClientMapPreset[];
  activePresetId: string | null;
  onApply: (preset: ClientMapPreset) => void;
}) {
  const { t } = useLocale();

  if (presets.length === 0) return null;

  return (
    <Select
      value={activePresetId ?? ""}
      onChange={(e) => {
        const preset = presets.find((p) => p.id === e.target.value);
        if (preset) onApply(preset);
      }}
      className="hidden w-40 shrink-0 sm:block"
    >
      <option value="" disabled>
        {t("presets.trigger")}
      </option>
      {presets.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.isDefault ? `★ ${preset.name}` : preset.name}
        </option>
      ))}
    </Select>
  );
}
