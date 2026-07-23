"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  className,
  responsive = false,
}: {
  className?: string;
  /** When true, hidden below the sm breakpoint (matches the other header toggle buttons). */
  responsive?: boolean;
}) {
  const { locale, setLocale, t } = useLocale();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "es" : "en")}
      className={cn(
        responsive ? "hidden sm:flex" : "flex",
        "shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground",
        className
      )}
    >
      <Languages className="h-3.5 w-3.5" />
      {t("language.switchTo")}
    </button>
  );
}
