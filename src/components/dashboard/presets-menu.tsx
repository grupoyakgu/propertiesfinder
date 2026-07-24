"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Trash2, MapPin } from "lucide-react";
import type { ClientMapPreset } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function PresetsMenu({
  presets,
  canSave,
  onApply,
  onSave,
  onDelete,
  onSetDefault,
}: {
  presets: ClientMapPreset[];
  canSave: boolean;
  onApply: (preset: ClientMapPreset) => void;
  onSave: (name: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onSetDefault: (id: string) => void | Promise<void>;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName("");
  };

  const handleDelete = (preset: ClientMapPreset) => {
    if (window.confirm(t("presets.confirmDelete", { name: preset.name }))) {
      onDelete(preset.id);
    }
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground sm:flex"
      >
        <MapPin className="h-3.5 w-3.5" />
        {t("presets.trigger")}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder={t("presets.namePlaceholder")}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || !name.trim()}
              className="h-9 shrink-0 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              {t("presets.save")}
            </button>
          </div>

          <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto">
            {presets.length === 0 && (
              <li className="px-1 py-2 text-xs text-muted-foreground">{t("presets.empty")}</li>
            )}
            {presets.map((preset) => (
              <li
                key={preset.id}
                className="flex items-center gap-1 rounded-md px-1 py-1.5 hover:bg-surface-muted"
              >
                <button
                  type="button"
                  onClick={() => {
                    onApply(preset);
                    setOpen(false);
                  }}
                  className="flex-1 truncate text-left text-sm text-foreground"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  onClick={() => onSetDefault(preset.id)}
                  title={preset.isDefault ? t("presets.default") : t("presets.setDefault")}
                  className={cn(
                    "shrink-0 rounded p-1",
                    preset.isDefault ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Star className="h-3.5 w-3.5" fill={preset.isDefault ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(preset)}
                  title={t("presets.delete")}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
