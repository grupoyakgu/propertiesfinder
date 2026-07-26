"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

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
 * or toggle its per-feature permissions (currently just Analysis Engine).
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

  const patchUser = async (id: string, body: { isActive?: boolean; permissions?: string[] }) => {
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

  const toggleAnalysisEngine = (u: AdminUser) => {
    const has = u.permissions.includes("analysis_engine");
    const permissions = has
      ? u.permissions.filter((p) => p !== "analysis_engine")
      : [...u.permissions, "analysis_engine"];
    patchUser(u.id, { permissions });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
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
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    {t("admin.colAnalysisEngine")}
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isPending = pending.has(u.id);
                  const hasAnalysisEngine = u.permissions.includes("analysis_engine");
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          {u.name}
                          {u.isAdmin && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {t("admin.adminBadge")}
                            </span>
                          )}
                          {isSelf && <span className="text-[10px] text-muted-foreground">({t("admin.you")})</span>}
                        </div>
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
                      <td className="px-4 py-2">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={hasAnalysisEngine}
                            disabled={isPending}
                            onChange={() => toggleAnalysisEngine(u)}
                            className="h-3.5 w-3.5 rounded border-border accent-[var(--primary)]"
                          />
                          <span className="text-muted-foreground">{t("admin.colAnalysisEngine")}</span>
                        </label>
                      </td>
                      <td className="px-4 py-2 text-right">
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
