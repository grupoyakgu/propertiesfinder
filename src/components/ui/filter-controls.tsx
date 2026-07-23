"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

export function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
      >
        {title}
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

export function RangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder = "",
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useLocale();
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder={`${t("filters.min")} ${placeholder}`}
          className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder={`${t("filters.max")} ${placeholder}`}
          className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}

export function CheckboxOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

export function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string, checked: boolean) {
    if (checked) onChange([...values, value]);
    else onChange(values.filter((v) => v !== value));
  }
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <CheckboxOption
          key={opt.value}
          label={opt.label}
          checked={values.includes(opt.value)}
          onChange={(checked) => toggle(opt.value, checked)}
        />
      ))}
    </div>
  );
}
