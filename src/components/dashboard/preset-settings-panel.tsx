"use client";

import { useState } from "react";
import { Check, Pencil, Star, Trash2, X } from "lucide-react";
import type { ClientMapPreset } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function PresetSettingsPanel({
  presets,
  canSave,
  canDelete,
  onSave,
  onDelete,
  onSetDefault,
  onRename,
}: {
  presets: ClientMapPreset[];
  canSave: boolean;
  canDelete: boolean;
  onSave: (name: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onSetDefault: (id: string, isDefault: boolean) => void | Promise<void>;
  onRename: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

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

  const startRename = (preset: ClientMapPreset) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
    setRenameError(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
    setRenameError(null);
  };

  const commitRename = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const result = await onRename(editingId, trimmed);
    if (result.ok) cancelRename();
    else setRenameError(result.error ?? t("presets.renameFailed"));
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("presets.settingsTitle")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("presets.settingsDescription")}</p>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder={t("presets.namePlaceholder")}
              className="h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || !name.trim()}
              className="h-10 shrink-0 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              {t("presets.save")}
            </button>
          </div>
          {!canSave && <p className="mt-1.5 text-xs text-muted-foreground">{t("presets.needViewToSave")}</p>}
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {presets.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">{t("presets.empty")}</li>
          )}
          {presets.map((preset) => {
            const isEditing = editingId === preset.id;
            return (
              <li key={preset.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={commitRename}
                        disabled={!editingName.trim()}
                        title={t("presets.save")}
                        className="shrink-0 rounded p-1.5 text-primary disabled:opacity-40"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-sm text-foreground">{preset.name}</span>
                      <button
                        type="button"
                        onClick={() => startRename(preset)}
                        title={t("presets.rename")}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetDefault(preset.id, !preset.isDefault)}
                        title={preset.isDefault ? t("presets.unsetDefault") : t("presets.setDefault")}
                        className={cn(
                          "shrink-0 rounded p-1.5",
                          preset.isDefault ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Star className="h-4 w-4" fill={preset.isDefault ? "currentColor" : "none"} />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(preset)}
                          title={t("presets.delete")}
                          className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {isEditing && renameError && <p className="mt-1.5 text-xs text-danger">{renameError}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
