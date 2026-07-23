"use client";

import { X } from "lucide-react";
import type { DashboardFilters } from "@/lib/filter-types";
import { countActiveFilters, emptyFilters } from "@/lib/filter-types";
import { FilterSection, RangeField, CheckboxGroup, CheckboxOption } from "@/components/ui/filter-controls";
import { Input, Select } from "@/components/ui/input";
import { spanishAutonomousCommunities } from "@/lib/labels";

const developmentPotentialOptions = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "HOTEL", label: "Hotel" },
  { value: "APARTHOTEL", label: "Aparthotel" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "MIXED_USE", label: "Mixed Use" },
  { value: "OFFICE", label: "Office" },
  { value: "STUDENT_HOUSING", label: "Student Housing" },
  { value: "SENIOR_LIVING", label: "Senior Living" },
  { value: "LOGISTICS", label: "Logistics" },
];

const planningStatusOptions = [
  { value: "URBAN", label: "Urban" },
  { value: "DEVELOPABLE", label: "Developable" },
  { value: "RURAL", label: "Rural" },
  { value: "PROTECTED", label: "Protected" },
  { value: "HISTORIC", label: "Historic" },
];

const landUseOptions = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "AGRICULTURAL", label: "Agricultural" },
  { value: "TOURISM", label: "Tourism" },
  { value: "MIXED", label: "Mixed" },
  { value: "OTHER", label: "Other" },
];

const cadastralUseOptions = [
  { value: "URBANO", label: "Urbano" },
  { value: "RUSTICO", label: "Rústico" },
];

const buildingTypeOptions = [
  { value: "DETACHED_HOUSE", label: "Detached House" },
  { value: "TERRACED_HOUSE", label: "Terraced House" },
  { value: "APARTMENT_BLOCK", label: "Apartment Block" },
  { value: "VILLA", label: "Villa" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "OFFICE_BUILDING", label: "Office Building" },
  { value: "HOTEL_BUILDING", label: "Hotel Building" },
  { value: "COMMERCIAL_BUILDING", label: "Commercial Building" },
  { value: "VACANT_PLOT", label: "Vacant Plot" },
  { value: "OTHER", label: "Other" },
];

const plotShapeOptions = [
  { value: "REGULAR", label: "Regular" },
  { value: "IRREGULAR", label: "Irregular" },
  { value: "RECTANGULAR", label: "Rectangular" },
  { value: "TRIANGULAR", label: "Triangular" },
  { value: "L_SHAPED", label: "L-Shaped" },
  { value: "CORNER", label: "Corner" },
];

const topographyOptions = [
  { value: "FLAT", label: "Flat" },
  { value: "SLOPED", label: "Sloped" },
];

export function FiltersSidebar({
  filters,
  onChange,
  mode = "plots",
}: {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  mode?: "plots" | "catastro";
}) {
  function set<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const activeCount = countActiveFilters(filters);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Filters {activeCount > 0 && <span className="text-primary">({activeCount})</span>}
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...emptyFilters, sort: filters.sort })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <FilterSection title="Location" defaultOpen>
          <Input
            placeholder="City / Municipality"
            value={filters.municipality}
            onChange={(e) => set("municipality", e.target.value)}
          />
          <Input
            placeholder="Province"
            value={filters.province}
            onChange={(e) => set("province", e.target.value)}
          />
          <Select
            value={filters.autonomousCommunity}
            onChange={(e) => set("autonomousCommunity", e.target.value)}
          >
            <option value="">Autonomous Community (any)</option>
            {spanishAutonomousCommunities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FilterSection>

        <FilterSection title="Land Characteristics">
          <RangeField
            label="Plot Size (m²)"
            minValue={filters.plotSizeMin}
            maxValue={filters.plotSizeMax}
            onMinChange={(v) => set("plotSizeMin", v)}
            onMaxChange={(v) => set("plotSizeMax", v)}
          />
          <RangeField
            label="Built Area (m²)"
            minValue={filters.builtAreaMin}
            maxValue={filters.builtAreaMax}
            onMinChange={(v) => set("builtAreaMin", v)}
            onMaxChange={(v) => set("builtAreaMax", v)}
          />
          <RangeField
            label="Construction Year"
            minValue={filters.constructionYearMin}
            maxValue={filters.constructionYearMax}
            onMinChange={(v) => set("constructionYearMin", v)}
            onMaxChange={(v) => set("constructionYearMax", v)}
          />
          <RangeField
            label="Number of Floors"
            minValue={filters.floorsMin}
            maxValue={filters.floorsMax}
            onMinChange={(v) => set("floorsMin", v)}
            onMaxChange={(v) => set("floorsMax", v)}
          />
          {mode === "plots" && (
            <>
              <RangeField
                label="Max Buildable Area (m²)"
                minValue={filters.buildableAreaMin}
                maxValue={filters.buildableAreaMax}
                onMinChange={(v) => set("buildableAreaMin", v)}
                onMaxChange={(v) => set("buildableAreaMax", v)}
              />
              <RangeField
                label="Occupancy Ratio (%)"
                minValue={filters.occupancyMin}
                maxValue={filters.occupancyMax}
                onMinChange={(v) => set("occupancyMin", v)}
                onMaxChange={(v) => set("occupancyMax", v)}
              />
              <RangeField
                label="Frontage Width (m)"
                minValue={filters.frontageMin}
                maxValue={filters.frontageMax}
                onMinChange={(v) => set("frontageMin", v)}
                onMaxChange={(v) => set("frontageMax", v)}
              />
              <RangeField
                label="Depth (m)"
                minValue={filters.depthMin}
                maxValue={filters.depthMax}
                onMinChange={(v) => set("depthMin", v)}
                onMaxChange={(v) => set("depthMax", v)}
              />
            </>
          )}
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Land Use</p>
            <CheckboxGroup options={landUseOptions} values={filters.landUse} onChange={(v) => set("landUse", v)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Cadastral Use (Clase de inmueble)</p>
            <CheckboxGroup
              options={cadastralUseOptions}
              values={filters.cadastralUse}
              onChange={(v) => set("cadastralUse", v)}
            />
          </div>
          {mode === "plots" && (
            <>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Building Type</p>
                <CheckboxGroup
                  options={buildingTypeOptions}
                  values={filters.buildingType}
                  onChange={(v) => set("buildingType", v)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Plot Shape</p>
                <CheckboxGroup
                  options={plotShapeOptions}
                  values={filters.plotShape}
                  onChange={(v) => set("plotShape", v)}
                />
              </div>
              <CheckboxOption
                label="Corner plot only"
                checked={filters.cornerPlot}
                onChange={(v) => set("cornerPlot", v)}
              />
            </>
          )}
        </FilterSection>

        {mode === "plots" && (
          <>
            <FilterSection title="Development Potential">
              <CheckboxGroup
                options={developmentPotentialOptions}
                values={filters.potential}
                onChange={(v) => set("potential", v)}
              />
            </FilterSection>

            <FilterSection title="Planning Status">
              <CheckboxGroup
                options={planningStatusOptions}
                values={filters.planningStatus}
                onChange={(v) => set("planningStatus", v)}
              />
            </FilterSection>

            <FilterSection title="Investment">
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Maximum Purchase Price (€)</p>
                <Input
                  type="number"
                  value={filters.priceMax}
                  onChange={(e) => set("priceMax", e.target.value)}
                  placeholder="e.g. 5000000"
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Max Price per m² (€)</p>
                <Input
                  type="number"
                  value={filters.pricePerSqmMax}
                  onChange={(e) => set("pricePerSqmMax", e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Max Estimated Construction Cost (€)</p>
                <Input
                  type="number"
                  value={filters.constructionCostMax}
                  onChange={(e) => set("constructionCostMax", e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Minimum Expected ROI (%)</p>
                <Input type="number" value={filters.roiMin} onChange={(e) => set("roiMin", e.target.value)} />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Minimum Expected Yield (%)</p>
                <Input type="number" value={filters.yieldMin} onChange={(e) => set("yieldMin", e.target.value)} />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Minimum Development Margin (%)</p>
                <Input type="number" value={filters.marginMin} onChange={(e) => set("marginMin", e.target.value)} />
              </div>
            </FilterSection>

            <FilterSection title="Physical Characteristics">
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Topography</p>
                <CheckboxGroup
                  options={topographyOptions}
                  values={filters.topography}
                  onChange={(v) => set("topography", v)}
                />
              </div>
              <CheckboxOption
                label="Double frontage"
                checked={filters.doubleFrontage}
                onChange={(v) => set("doubleFrontage", v)}
              />
              <CheckboxOption
                label="Existing building"
                checked={filters.existingBuilding}
                onChange={(v) => set("existingBuilding", v)}
              />
              <CheckboxOption
                label="Demolition required"
                checked={filters.demolitionRequired}
                onChange={(v) => set("demolitionRequired", v)}
              />
              <CheckboxOption
                label="Vacant land"
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
