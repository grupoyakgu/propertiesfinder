"use client";

import { Heart, MessageSquare, X } from "lucide-react";
import type { DashboardFilters } from "@/lib/filter-types";
import { countActiveFilters, emptyFilters } from "@/lib/filter-types";
import { FilterSection, RangeField, CheckboxGroup } from "@/components/ui/filter-controls";
import { Input } from "@/components/ui/input";
import { landUseLabels, cadastralClassLabels } from "@/lib/labels";
import { useLocale } from "@/lib/i18n/context";

function toOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

export function FiltersSidebar({
  filters,
  onChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  commentsOnly,
  onCommentsOnlyChange,
  mapControls,
}: {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  /** Narrows the card/table list to properties the current user has liked —
   * a display toggle rather than a search filter, so it's kept separate from
   * DashboardFilters (not saved with presets, not part of "Clear all"). */
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
  /** Same idea, but for properties that have at least one comment. */
  commentsOnly: boolean;
  onCommentsOnlyChange: (value: boolean) => void;
  /** Rendered above the "Filters" heading — see MapControlsPanel. The caller
   * only passes this while the map is visible, which is what makes it "fold
   * away" when the map is hidden. */
  mapControls?: React.ReactNode;
}) {
  const { locale, t } = useLocale();

  function set<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const activeCount = countActiveFilters(filters);

  const landUseOptions = toOptions(landUseLabels[locale]);
  const cadastralUseOptions = toOptions(cadastralClassLabels[locale]);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface">
      {mapControls}

      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("filters.title")} {activeCount > 0 && <span className="text-primary">({activeCount})</span>}
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...emptyFilters, sort: filters.sort })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> {t("filters.clearAll")}
          </button>
        )}
      </div>

      <label className="mx-4 mb-1.5 flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={favoritesOnly}
          onChange={(e) => onFavoritesOnlyChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border accent-[var(--primary)]"
        />
        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
        {t("filters.favoritesOnly")}
      </label>

      <label className="mx-4 mb-3 flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={commentsOnly}
          onChange={(e) => onCommentsOnlyChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border accent-[var(--primary)]"
        />
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        {t("filters.commentsOnly")}
      </label>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <FilterSection title={t("filters.location")} defaultOpen>
          {/* Autonomous Community hidden for now — filters.autonomousCommunity
              and its query-string/API handling are untouched, so this is a
              trivial revert if it needs to come back. */}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              placeholder={t("filters.streetName")}
              value={filters.streetName}
              onChange={(e) => set("streetName", e.target.value)}
            />
            <Input
              placeholder={t("filters.streetNumberShort")}
              className="w-16"
              value={filters.streetNumber}
              onChange={(e) => set("streetNumber", e.target.value)}
            />
          </div>
        </FilterSection>

        <FilterSection title={t("filters.landCharacteristics")}>
          <RangeField
            label={t("filters.plotSize")}
            minValue={filters.plotSizeMin}
            maxValue={filters.plotSizeMax}
            onMinChange={(v) => set("plotSizeMin", v)}
            onMaxChange={(v) => set("plotSizeMax", v)}
          />
          <RangeField
            label={t("filters.builtArea")}
            minValue={filters.builtAreaMin}
            maxValue={filters.builtAreaMax}
            onMinChange={(v) => set("builtAreaMin", v)}
            onMaxChange={(v) => set("builtAreaMax", v)}
          />
          <RangeField
            label={t("filters.constructionYear")}
            minValue={filters.constructionYearMin}
            maxValue={filters.constructionYearMax}
            onMinChange={(v) => set("constructionYearMin", v)}
            onMaxChange={(v) => set("constructionYearMax", v)}
          />
          <RangeField
            label={t("filters.numberOfFloors")}
            minValue={filters.floorsMin}
            maxValue={filters.floorsMax}
            onMinChange={(v) => set("floorsMin", v)}
            onMaxChange={(v) => set("floorsMax", v)}
          />
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.landUse")}</p>
            <CheckboxGroup options={landUseOptions} values={filters.landUse} onChange={(v) => set("landUse", v)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.cadastralUse")}</p>
            <CheckboxGroup
              options={cadastralUseOptions}
              values={filters.cadastralUse}
              onChange={(v) => set("cadastralUse", v)}
            />
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}
