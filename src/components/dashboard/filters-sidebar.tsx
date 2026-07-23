"use client";

import { X } from "lucide-react";
import type { DashboardFilters } from "@/lib/filter-types";
import { countActiveFilters, emptyFilters } from "@/lib/filter-types";
import { FilterSection, RangeField, CheckboxGroup, CheckboxOption } from "@/components/ui/filter-controls";
import { Input, Select } from "@/components/ui/input";
import {
  spanishAutonomousCommunities,
  developmentPotentialLabels,
  planningStatusLabels,
  landUseLabels,
  cadastralClassLabels,
  buildingTypeLabels,
  plotShapeLabels,
  topographyLabels,
} from "@/lib/labels";
import { useLocale } from "@/lib/i18n/context";

function toOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

export function FiltersSidebar({
  filters,
  onChange,
  mode = "plots",
}: {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  mode?: "plots" | "catastro";
}) {
  const { locale, t } = useLocale();

  function set<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const activeCount = countActiveFilters(filters);

  const developmentPotentialOptions = toOptions(developmentPotentialLabels[locale]);
  const planningStatusOptions = toOptions(planningStatusLabels[locale]);
  const landUseOptions = toOptions(landUseLabels[locale]);
  const cadastralUseOptions = toOptions(cadastralClassLabels[locale]);
  const buildingTypeOptions = toOptions(buildingTypeLabels[locale]);
  const plotShapeOptions = toOptions(plotShapeLabels[locale]);
  const topographyOptions = toOptions(topographyLabels[locale]);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface">
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

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <FilterSection title={t("filters.location")} defaultOpen>
          <Input
            placeholder={t("filters.cityMunicipality")}
            value={filters.municipality}
            onChange={(e) => set("municipality", e.target.value)}
          />
          <Input
            placeholder={t("filters.province")}
            value={filters.province}
            onChange={(e) => set("province", e.target.value)}
          />
          <Select
            value={filters.autonomousCommunity}
            onChange={(e) => set("autonomousCommunity", e.target.value)}
          >
            <option value="">{t("filters.autonomousCommunityAny")}</option>
            {spanishAutonomousCommunities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {mode === "catastro" && (
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
          )}
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
          {mode === "plots" && (
            <>
              <RangeField
                label={t("filters.maxBuildableArea")}
                minValue={filters.buildableAreaMin}
                maxValue={filters.buildableAreaMax}
                onMinChange={(v) => set("buildableAreaMin", v)}
                onMaxChange={(v) => set("buildableAreaMax", v)}
              />
              <RangeField
                label={t("filters.occupancyRatio")}
                minValue={filters.occupancyMin}
                maxValue={filters.occupancyMax}
                onMinChange={(v) => set("occupancyMin", v)}
                onMaxChange={(v) => set("occupancyMax", v)}
              />
              <RangeField
                label={t("filters.frontageWidth")}
                minValue={filters.frontageMin}
                maxValue={filters.frontageMax}
                onMinChange={(v) => set("frontageMin", v)}
                onMaxChange={(v) => set("frontageMax", v)}
              />
              <RangeField
                label={t("filters.depth")}
                minValue={filters.depthMin}
                maxValue={filters.depthMax}
                onMinChange={(v) => set("depthMin", v)}
                onMaxChange={(v) => set("depthMax", v)}
              />
            </>
          )}
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
          {mode === "plots" && (
            <>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.buildingType")}</p>
                <CheckboxGroup
                  options={buildingTypeOptions}
                  values={filters.buildingType}
                  onChange={(v) => set("buildingType", v)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.plotShape")}</p>
                <CheckboxGroup
                  options={plotShapeOptions}
                  values={filters.plotShape}
                  onChange={(v) => set("plotShape", v)}
                />
              </div>
              <CheckboxOption
                label={t("filters.cornerPlotOnly")}
                checked={filters.cornerPlot}
                onChange={(v) => set("cornerPlot", v)}
              />
            </>
          )}
        </FilterSection>

        {mode === "plots" && (
          <>
            <FilterSection title={t("filters.developmentPotential")}>
              <CheckboxGroup
                options={developmentPotentialOptions}
                values={filters.potential}
                onChange={(v) => set("potential", v)}
              />
            </FilterSection>

            <FilterSection title={t("filters.planningStatus")}>
              <CheckboxGroup
                options={planningStatusOptions}
                values={filters.planningStatus}
                onChange={(v) => set("planningStatus", v)}
              />
            </FilterSection>

            <FilterSection title={t("filters.investment")}>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.maxPurchasePrice")}</p>
                <Input
                  type="number"
                  value={filters.priceMax}
                  onChange={(e) => set("priceMax", e.target.value)}
                  placeholder="e.g. 5000000"
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.maxPricePerSqm")}</p>
                <Input
                  type="number"
                  value={filters.pricePerSqmMax}
                  onChange={(e) => set("pricePerSqmMax", e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.maxConstructionCost")}</p>
                <Input
                  type="number"
                  value={filters.constructionCostMax}
                  onChange={(e) => set("constructionCostMax", e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.minRoi")}</p>
                <Input type="number" value={filters.roiMin} onChange={(e) => set("roiMin", e.target.value)} />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.minYield")}</p>
                <Input type="number" value={filters.yieldMin} onChange={(e) => set("yieldMin", e.target.value)} />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.minMargin")}</p>
                <Input type="number" value={filters.marginMin} onChange={(e) => set("marginMin", e.target.value)} />
              </div>
            </FilterSection>

            <FilterSection title={t("filters.physicalCharacteristics")}>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t("filters.topography")}</p>
                <CheckboxGroup
                  options={topographyOptions}
                  values={filters.topography}
                  onChange={(v) => set("topography", v)}
                />
              </div>
              <CheckboxOption
                label={t("filters.doubleFrontage")}
                checked={filters.doubleFrontage}
                onChange={(v) => set("doubleFrontage", v)}
              />
              <CheckboxOption
                label={t("filters.existingBuilding")}
                checked={filters.existingBuilding}
                onChange={(v) => set("existingBuilding", v)}
              />
              <CheckboxOption
                label={t("filters.demolitionRequired")}
                checked={filters.demolitionRequired}
                onChange={(v) => set("demolitionRequired", v)}
              />
              <CheckboxOption
                label={t("filters.vacantLand")}
                checked={filters.vacantLand}
                onChange={(v) => set("vacantLand", v)}
              />
            </FilterSection>
          </>
        )}
      </div>
    </aside>
  );
}
