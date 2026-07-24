"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

/** Lets the user save the current map view as a new preset right from the header,
 * while looking at the map — no need to leave for the Settings tab. Renders inline
 * in the header's normal document flow (never an absolute overlay), so — unlike the
 * old floating presets popover — it can never end up visually covered by the map. */
export function PresetSaveControl({
  canSave,
  onSave,
}: {
  canSave: boolean;
  onSave: (name: string) => void | Promise<void>;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const cancel = () => {
    setEditing(false);
    setName("");
  };

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    cancel();
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={!canSave}
        title={canSave ? t("presets.save") : t("presets.needViewToSave")}
        className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-40 sm:flex"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("presets.save")}
      </button>
    );
  }

  return (
    <div className="hidden shrink-0 items-center gap-1 sm:flex">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        placeholder={t("presets.namePlaceholder")}
        className="h-9 w-36 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <button
        type="button"
        onClick={commit}
        disabled={!name.trim()}
        title={t("presets.save")}
        className="shrink-0 rounded-md p-1.5 text-primary disabled:opacity-40"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={cancel}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
