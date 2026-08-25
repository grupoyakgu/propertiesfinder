"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Pencil, Settings, ShieldCheck, Trash2, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { type Permission } from "@/lib/permissions";

/** The App settings section: global (not per-user) configuration — currently
 * just the Analysis Engine's plot-selection cap (see OpportunitiesPanel /
 * AnalysisEnginePanel). Fetches and saves its own state independently of the
 * user table below. */
function AppSettingsSection() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [maxAnalysisPlots, setMaxAnalysisPlots] = useState(2);
  const [draft, setDraft] = useState("2");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The custom prompt is edited and saved independently of maxAnalysisPlots
  // above — its own draft/saving/saved/error state, same PATCH endpoint.
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.maxAnalysisPlots === "number") {
          setMaxAnalysisPlots(data.maxAnalysisPlots);
          setDraft(String(data.maxAnalysisPlots));
        }
        const savedPrompt: string | null = typeof data?.customPrompt === "string" ? data.customPrompt : null;
        setCustomPrompt(savedPrompt);
        setPromptDraft(savedPrompt ?? "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 1) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxAnalysisPlots: value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? t("admin.settingSaveError"));
        return;
      }
      setMaxAnalysisPlots(json.maxAnalysisPlots);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError(t("admin.settingSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const savePrompt = async (value: string | null) => {
    setPromptSaving(true);
    setPromptError(null);
    setPromptSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt: value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setPromptError(json?.error ?? t("admin.settingSaveError"));
        return;
      }
      setCustomPrompt(json.customPrompt);
      setPromptDraft(json.customPrompt ?? "");
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 1500);
    } catch {
      setPromptError(t("admin.settingSaveError"));
    } finally {
      setPromptSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Settings className="h-4 w-4 text-primary" />
          {t("admin.appSettingsTitle")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.appSettingsDescription")}</p>
      </div>

      {!loading && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="max-analysis-plots">
              {t("admin.maxAnalysisPlotsLabel")}
            </label>
            <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{t("admin.maxAnalysisPlotsHint")}</p>
            <input
              id="max-analysis-plots"
              type="number"
              min={1}
              max={10}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-2 h-9 w-24 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || Number(draft) === maxAnalysisPlots || !draft}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {saved ? t("admin.settingSaved") : t("admin.saveSettingAction")}
          </button>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      )}

      {!loading && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="custom-prompt">
            {t("admin.customPromptLabel")}
          </label>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">{t("admin.customPromptHint")}</p>
          <textarea
            id="custom-prompt"
            rows={10}
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            placeholder={t("admin.customPromptPlaceholder")}
            className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => savePrompt(promptDraft)}
              disabled={promptSaving || promptDraft === (customPrompt ?? "")}
              className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {promptSaved ? t("admin.settingSaved") : t("admin.saveSettingAction")}
            </button>
            <button
              type="button"
              onClick={() => savePrompt(null)}
              disabled={promptSaving || !customPrompt}
              className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground disabled:opacity-50"
            >
              {t("admin.clearCustomPromptAction")}
            </button>
            <span className="text-xs text-muted-foreground">
              {t("admin.customPromptCharCount", { n: promptDraft.length })}
            </span>
            {promptError && <span className="text-xs text-danger">{promptError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// One row per togglable permission column, in display order.
const PERMISSION_COLUMNS: { permission: Permission; labelKey: string }[] = [
  { permission: "analysis_engine", labelKey: "admin.colAnalysisEngine" },
  { permission: "export_pdf", labelKey: "admin.colExportPdf" },
  { permission: "export_xls", labelKey: "admin.colExportXls" },
];

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  isActive: boolean;
  permissions: string[];
}

/** The Admin tab: lists every user and lets an admin enable/disable an account
 * or toggle its per-feature permissions (see PERMISSION_COLUMNS above).
 * Fetches its own data on mount — only ever rendered for an admin (the tab
 * itself is hidden from everyone else in dashboard-app.tsx), but every
 * mutation is re-checked admin-only server-side regardless. */
export function AdminPanel({ currentUserId }: { currentUserId: string }) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Tracks which user row has a PATCH in flight, so its toggles disable rather
  // than letting a second click race the first.
  const [pending, setPending] = useState<Set<string>>(new Set());
  // The single row (if any) currently showing a name-edit input, plus its
  // in-progress value — only one row can be edited at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(t("admin.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const patchUser = async (id: string, body: { name?: string; isActive?: boolean; permissions?: string[] }) => {
    setPending((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? t("admin.updateError"));
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? json.user : u)));
    } catch {
      setError(t("admin.updateError"));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleActive = (u: AdminUser) => patchUser(u.id, { isActive: !u.isActive });

  const togglePermission = (u: AdminUser, permission: Permission) => {
    const has = u.permissions.includes(permission);
    const permissions = has ? u.permissions.filter((p) => p !== permission) : [...u.permissions, permission];
    patchUser(u.id, { permissions });
  };

  const startEditName = (u: AdminUser) => {
    setError(null);
    setEditingId(u.id);
    setEditValue(u.name);
  };

  const cancelEditName = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEditName = async (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setError(t("admin.nameRequiredError"));
      return;
    }
    await patchUser(id, { name: trimmed });
    setEditingId(null);
    setEditValue("");
  };

  const deleteUser = async (u: AdminUser) => {
    if (!window.confirm(t("admin.confirmDeleteUser", { name: u.name }))) return;
    setPending((prev) => new Set(prev).add(u.id));
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? t("admin.deleteError"));
        return;
      }
      setUsers((prev) => prev.filter((existing) => existing.id !== u.id));
    } catch {
      setError(t("admin.deleteError"));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(u.id);
        return next;
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <AppSettingsSection />
      <div className="mx-auto mt-8 max-w-5xl space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("admin.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.description")}</p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">{t("dashboard.searching")}</p>}

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">{t("admin.colName")}</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">{t("admin.colEmail")}</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">{t("admin.colStatus")}</th>
                  {PERMISSION_COLUMNS.map(({ permission, labelKey }) => (
                    <th key={permission} className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      {t(labelKey)}
                    </th>
                  ))}
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isPending = pending.has(u.id);
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium text-foreground">
                        {editingId === u.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditName(u.id);
                                if (e.key === "Escape") cancelEditName();
                              }}
                              autoFocus
                              disabled={isPending}
                              className="w-32 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => saveEditName(u.id)}
                              disabled={isPending}
                              title={t("admin.saveAction")}
                              className="rounded p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditName}
                              disabled={isPending}
                              title={t("admin.cancelAction")}
                              className="rounded p-1 text-muted-foreground hover:bg-surface-muted disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {u.name}
                            {u.isAdmin && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {t("admin.adminBadge")}
                              </span>
                            )}
                            {isSelf && <span className="text-[10px] text-muted-foreground">({t("admin.you")})</span>}
                            <button
                              type="button"
                              onClick={() => startEditName(u)}
                              disabled={isPending}
                              title={t("admin.editNameAction")}
                              className="rounded p-0.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            u.isActive ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"
                          )}
                        >
                          {u.isActive ? t("admin.statusEnabled") : t("admin.statusDisabled")}
                        </span>
                      </td>
                      {PERMISSION_COLUMNS.map(({ permission }) => (
                        <td key={permission} className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={u.permissions.includes(permission)}
                            disabled={isPending}
                            onChange={() => togglePermission(u, permission)}
                            className="h-3.5 w-3.5 rounded border-border accent-[var(--primary)]"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleActive(u)}
                            disabled={isPending || (isSelf && u.isActive)}
                            title={isSelf && u.isActive ? t("admin.cannotDisableSelf") : undefined}
                            className={cn(
                              "rounded-full border px-3 py-1 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50",
                              u.isActive
                                ? "border-danger/30 text-danger hover:bg-danger/10"
                                : "border-primary/30 text-primary hover:bg-primary/10"
                            )}
                          >
                            {u.isActive ? t("admin.disableAction") : t("admin.enableAction")}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(u)}
                            disabled={isPending || isSelf}
                            title={isSelf ? t("admin.cannotDeleteSelf") : t("admin.deleteAction")}
                            className="rounded-full border border-danger/30 p-1.5 text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
