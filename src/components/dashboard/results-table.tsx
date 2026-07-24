"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import type { ClientCatastroParcel, ClientPlot } from "@/lib/types";
import { formatArea, formatCurrency, formatPercent, formatCatastroParcelAddress, cn, withBackHref } from "@/lib/utils";
import { cadastralClassLabels, landUseLabels, planningStatusLabels } from "@/lib/labels";
import { useLocale } from "@/lib/i18n/context";

const PAGE_SIZE = 25;

type SortDirection = "asc" | "desc";

interface Column<T> {
  key: string;
  label: string;
  accessor: (row: T) => string | number | null;
  render: (row: T) => React.ReactNode;
  align?: "right";
}

function useSortedRows<T>(rows: T[], columns: Column<T>[], defaultKey: string) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({
    key: defaultKey,
    direction: "asc",
  });

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = column.accessor(a);
      const bv = column.accessor(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  function toggleSort(key: string) {
    setSort((s) =>
      s.key === key ? { key, direction: s.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }
    );
  }

  return { sorted, sort, toggleSort };
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
  return direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

function DataTable<T extends { id: string }>({
  rows,
  columns,
  href,
  defaultSortKey,
  backHref,
  selectable,
  selectedIds,
  onToggleSelect,
  onShowOnMap,
}: {
  rows: T[];
  columns: Column<T>[];
  href: (row: T) => string;
  defaultSortKey: string;
  backHref?: string;
  /** When true (the "show all on map" setting is off), adds a checkbox column and a
   * "show on map" action column so the user can manually curate what appears on the
   * map instead of relying on the automatic full result set. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onShowOnMap?: (id: string) => void;
}) {
  const { t } = useLocale();
  const { sorted, sort, toggleSort } = useSortedRows(rows, columns, defaultSortKey);
  const [page, setPage] = useState(0);

  // Reset to page 1 whenever the underlying rows or sort change, following
  // React's documented pattern for adjusting state during render (not in an
  // effect) — https://react.dev/learn/you-might-not-need-an-effect
  const [resetTracker, setResetTracker] = useState({ rows, sort });
  if (resetTracker.rows !== rows || resetTracker.sort !== sort) {
    setResetTracker({ rows, sort });
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((currentPage + 1) * PAGE_SIZE, sorted.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-border">
              {selectable && <th className="w-8 px-3 py-2.5" />}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={cn(
                    "cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:text-foreground",
                    col.align === "right" && "text-right"
                  )}
                >
                  <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                    {col.label}
                    <SortIcon active={sort.key === col.key} direction={sort.direction} />
                  </span>
                </th>
              ))}
              {selectable && <th className="w-8 px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                {selectable && (
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(row.id) ?? false}
                      onChange={() => onToggleSelect?.(row.id)}
                      className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                    />
                  </td>
                )}
                {columns.map((col, i) => (
                  <td key={col.key} className={cn("whitespace-nowrap px-3 py-2.5", col.align === "right" && "text-right")}>
                    {i === 0 ? (
                      <Link href={withBackHref(href(row), backHref)} className="font-medium text-primary hover:underline">
                        {col.render(row)}
                      </Link>
                    ) : (
                      col.render(row)
                    )}
                  </td>
                ))}
                {selectable && (
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onShowOnMap?.(row.id)}
                      title={t("dashboard.showOnMap")}
                      className="rounded p-1 text-muted-foreground hover:text-primary"
                    >
                      <MapPinned className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("table.showing", { start: rangeStart, end: rangeEnd, total: sorted.length })}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {t("table.prev")}
            </button>
            <span>{t("table.pageOf", { page: currentPage + 1, total: totalPages })}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("table.next")} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CatastroResultsTable({
  parcels,
  backHref,
  selectable,
  selectedIds,
  onToggleSelect,
  onShowOnMap,
}: {
  parcels: ClientCatastroParcel[];
  backHref?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onShowOnMap?: (id: string) => void;
}) {
  const { locale, t } = useLocale();

  if (parcels.length === 0) {
    return <p className="pt-10 text-center text-sm text-muted-foreground">{t("dashboard.noCatastro")}</p>;
  }

  const columns: Column<ClientCatastroParcel>[] = [
    {
      key: "referenciaCatastral",
      label: t("table.referenciaCatastral"),
      accessor: (p) => p.referenciaCatastral,
      render: (p) => p.referenciaCatastral,
    },
    {
      key: "address",
      label: t("table.address"),
      accessor: (p) => formatCatastroParcelAddress(p),
      render: (p) => formatCatastroParcelAddress(p),
    },
    {
      key: "municipality",
      label: t("table.municipality"),
      accessor: (p) => p.municipality,
      render: (p) => p.municipality,
    },
    { key: "province", label: t("table.province"), accessor: (p) => p.province, render: (p) => p.province },
    {
      key: "plotSize",
      label: t("table.plotSize"),
      accessor: (p) => p.plotSize,
      render: (p) => formatArea(p.plotSize),
      align: "right",
    },
    {
      key: "builtArea",
      label: t("table.builtArea"),
      accessor: (p) => p.builtArea,
      render: (p) => formatArea(p.builtArea),
      align: "right",
    },
    {
      key: "constructionYear",
      label: t("table.year"),
      accessor: (p) => p.constructionYear,
      render: (p) => p.constructionYear ?? "—",
      align: "right",
    },
    {
      key: "numberOfFloors",
      label: t("table.floors"),
      accessor: (p) => p.numberOfFloors,
      render: (p) => p.numberOfFloors ?? "—",
      align: "right",
    },
    {
      key: "cadastralUse",
      label: t("table.cadastralUse"),
      accessor: (p) => cadastralClassLabels[locale][p.cadastralUse],
      render: (p) => cadastralClassLabels[locale][p.cadastralUse],
    },
    {
      key: "landUse",
      label: t("table.landUse"),
      accessor: (p) => (p.landUse ? landUseLabels[locale][p.landUse] : null),
      render: (p) => (p.landUse ? landUseLabels[locale][p.landUse] : "—"),
    },
  ];

  return (
    <DataTable
      rows={parcels}
      columns={columns}
      href={(p) => `/catastro/${p.referenciaCatastral}`}
      defaultSortKey="referenciaCatastral"
      backHref={backHref}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onShowOnMap={onShowOnMap}
    />
  );
}

export function PlotResultsTable({
  plots,
  backHref,
  selectable,
  selectedIds,
  onToggleSelect,
  onShowOnMap,
}: {
  plots: ClientPlot[];
  backHref?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onShowOnMap?: (id: string) => void;
}) {
  const { locale, t } = useLocale();

  if (plots.length === 0) {
    return <p className="pt-10 text-center text-sm text-muted-foreground">{t("dashboard.noPlots")}</p>;
  }

  const columns: Column<ClientPlot>[] = [
    { key: "title", label: t("table.title"), accessor: (p) => p.title, render: (p) => p.title },
    {
      key: "municipality",
      label: t("table.municipality"),
      accessor: (p) => p.municipality,
      render: (p) => p.municipality,
    },
    { key: "province", label: t("table.province"), accessor: (p) => p.province, render: (p) => p.province },
    {
      key: "plotSize",
      label: t("table.plotSize"),
      accessor: (p) => p.plotSize,
      render: (p) => formatArea(p.plotSize),
      align: "right",
    },
    {
      key: "builtArea",
      label: t("table.builtArea"),
      accessor: (p) => p.builtArea,
      render: (p) => formatArea(p.builtArea),
      align: "right",
    },
    {
      key: "planningStatus",
      label: t("table.planning"),
      accessor: (p) => planningStatusLabels[locale][p.planningStatus],
      render: (p) => planningStatusLabels[locale][p.planningStatus],
    },
    {
      key: "purchasePrice",
      label: t("table.price"),
      accessor: (p) => p.purchasePrice,
      render: (p) => formatCurrency(p.purchasePrice),
      align: "right",
    },
    {
      key: "pricePerSqm",
      label: t("table.pricePerSqm"),
      accessor: (p) => p.pricePerSqm,
      render: (p) => formatCurrency(p.pricePerSqm),
      align: "right",
    },
    {
      key: "expectedROI",
      label: t("table.roi"),
      accessor: (p) => p.expectedROI,
      render: (p) => formatPercent(p.expectedROI),
      align: "right",
    },
  ];

  return (
    <DataTable
      rows={plots}
      columns={columns}
      href={(p) => `/property/${p.slug}`}
      defaultSortKey="title"
      backHref={backHref}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onShowOnMap={onShowOnMap}
    />
  );
}
