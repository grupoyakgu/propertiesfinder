"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, Download, Earth, Search, Trash2 } from "lucide-react";
import type { ClientOpportunity } from "@/lib/types";
import { OpportunityStatus } from "@/generated/prisma/enums";
import {
  cn,
  formatCatastroParcelAddress,
  formatCatastroParcelDisplayAddress,
  googleEarthUrl,
  idealistaUrl,
} from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

interface DirectoryUser {
  id: string;
  name: string;
}

const STATUS_OPTIONS: OpportunityStatus[] = ["IN_REVIEW", "NOT_RELEVANT", "VALIDATED"];

const STATUS_LABEL_KEYS: Record<OpportunityStatus, string> = {
  IN_REVIEW: "opportunities.statusInReview",
  NOT_RELEVANT: "opportunities.statusNotRelevant",
  VALIDATED: "opportunities.statusValidated",
};

/** The Opportunities tab: a shared, team-wide list of properties flagged for
 * further exploration (added via the heart icon anywhere in the app). Every
 * signed-in user sees the same list and can change any row's status or
 * reassign its owner — this isn't personal data, so there's no ownership gate
 * the way there is for e.g. map presets. Fetches its own data on mount. */
export function OpportunitiesPanel({
  currentUserId,
  canExportXls,
  onRemoved,
}: {
  currentUserId: string;
  canExportXls: boolean;
  /** Called after a row is successfully removed here, so the data table's own
   * "liked" state (which this panel doesn't otherwise share with) drops it too —
   * otherwise the property would still show as selected/liked there. */
  onRemoved?: (propertyId: string) => void;
}) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<ClientOpportunity[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Tracks which opportunity row has a PATCH in flight, so its selects disable
  // rather than letting a second change race the first.
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "">("");
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/favorites").then((res) => res.json()),
      fetch("/api/users").then((res) => res.json()),
    ])
      .then(([favoritesData, usersData]) => {
        if (cancelled) return;
        setOpportunities(favoritesData.opportunities ?? []);
        setUsers(usersData.users ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(t("opportunities.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (assignedToMeOnly && o.assignedUserId !== currentUserId) return false;
      if (statusFilter && o.status !== statusFilter) return false;
      if (!query) return true;
      return (
        o.parcel.referenciaCatastral.toLowerCase().includes(query) ||
        (o.parcel.streetName ?? "").toLowerCase().includes(query) ||
        o.assignedUserName.toLowerCase().includes(query)
      );
    });
  }, [opportunities, search, statusFilter, assignedToMeOnly, currentUserId]);

  const patch = async (id: string, body: { status?: OpportunityStatus; assignedUserId?: string }) => {
    setPending((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const res = await fetch(`/api/favorites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? t("opportunities.updateError"));
        return;
      }
      setOpportunities((prev) => prev.map((o) => (o.id === id ? json.opportunity : o)));
    } catch {
      setError(t("opportunities.updateError"));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Same effect as un-liking the property from its card/detail page (the heart
  // icon is a full toggle — see /api/favorites) — POSTing its propertyId again
  // removes the shared opportunity outright, regardless of who owns it.
  const removeOpportunity = async (o: ClientOpportunity) => {
    if (!window.confirm(t("opportunities.confirmRemove", { referencia: o.parcel.referenciaCatastral }))) return;
    setPending((prev) => new Set(prev).add(o.id));
    setError(null);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: o.parcel.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? t("opportunities.updateError"));
        return;
      }
      setOpportunities((prev) => prev.filter((existing) => existing.id !== o.id));
      onRemoved?.(o.parcel.id);
    } catch {
      setError(t("opportunities.updateError"));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(o.id);
        return next;
      });
    }
  };

  const exportXls = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/favorites/export-xls");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? t("opportunities.exportError"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "opportunities.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("opportunities.exportError"));
    } finally {
      setExporting(false);
    }
  };

  const isEmpty = !loading && opportunities.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("dashboard.tabOpportunities")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("opportunities.description")}</p>
          </div>
          {canExportXls && (
            <button
              type="button"
              onClick={exportXls}
              disabled={exporting || opportunities.length === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? t("opportunities.exporting") : t("opportunities.exportXls")}
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && <p className="text-sm text-muted-foreground">{t("dashboard.searching")}</p>}
        {isEmpty && <p className="text-sm text-muted-foreground">{t("opportunities.empty")}</p>}

        {!isEmpty && !loading && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("opportunities.searchPlaceholder")}
                  className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OpportunityStatus | "")}
                className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="">{t("opportunities.statusFilterAll")}</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(STATUS_LABEL_KEYS[status])}
                  </option>
                ))}
              </select>
              <label className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={assignedToMeOnly}
                  onChange={(e) => setAssignedToMeOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-[var(--primary)]"
                />
                {t("opportunities.assignedToMeOnly")}
              </label>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      {t("opportunities.colReferencia")}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      {t("opportunities.colAddress")}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      {t("opportunities.colLinks")}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      {t("opportunities.colStatus")}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      {t("opportunities.colAssignedTo")}
                    </th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const isPending = pending.has(o.id);
                    const assigneeKnown = users.some((u) => u.id === o.assignedUserId);
                    return (
                      <tr key={o.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2">
                          <Link
                            href={`/catastro/${o.parcel.referenciaCatastral}`}
                            className={cn(
                              "font-medium hover:underline",
                              o.status === "NOT_RELEVANT"
                                ? "text-danger"
                                : o.status === "VALIDATED"
                                  ? "text-success"
                                  : "text-primary"
                            )}
                          >
                            {o.parcel.referenciaCatastral}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatCatastroParcelDisplayAddress(o.parcel)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <a
                              href={googleEarthUrl(formatCatastroParcelAddress(o.parcel))}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t("card.openInGoogleEarth")}
                              className="rounded p-1 text-muted-foreground hover:text-primary"
                            >
                              <Earth className="h-4 w-4" />
                            </a>
                            <a
                              href={idealistaUrl(o.parcel)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t("card.openInIdealista")}
                              className="rounded p-1 text-muted-foreground hover:text-primary"
                            >
                              <Building2 className="h-4 w-4" />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={o.status}
                            disabled={isPending}
                            onChange={(e) => patch(o.id, { status: e.target.value as OpportunityStatus })}
                            className="h-8 rounded-md border border-border bg-background px-1.5 text-xs disabled:opacity-50"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {t(STATUS_LABEL_KEYS[status])}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={o.assignedUserId}
                            disabled={isPending}
                            onChange={(e) => patch(o.id, { assignedUserId: e.target.value })}
                            className="h-8 rounded-md border border-border bg-background px-1.5 text-xs disabled:opacity-50"
                          >
                            {!assigneeKnown && (
                              <option value={o.assignedUserId}>{o.assignedUserName}</option>
                            )}
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                                {u.id === currentUserId ? ` (${t("admin.you")})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeOpportunity(o)}
                            disabled={isPending}
                            title={t("opportunities.remove")}
                            className="rounded p-1 text-muted-foreground hover:text-danger disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                        {t("opportunities.noResults")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
