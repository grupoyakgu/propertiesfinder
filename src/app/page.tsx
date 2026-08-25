import Link from "next/link";
import { MapPinned, Building2, Landmark, Hotel, Warehouse, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LinkButton } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Logo } from "@/components/ui/logo";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function Home() {
  const user = await getCurrentUser();
  const { t } = await getServerTranslator();

  const quickChips: { label: string; icon: React.ElementType; params: string }[] = [
    { label: t("landing.chipResidential"), icon: Building2, params: "potential=RESIDENTIAL" },
    { label: t("landing.chipHotel"), icon: Hotel, params: "potential=HOTEL" },
    { label: t("landing.chipLogistics"), icon: Warehouse, params: "potential=LOGISTICS" },
    { label: t("landing.chipHistoric"), icon: Landmark, params: "planningStatus=HISTORIC" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2 text-primary">
          <Logo className="h-6" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {t("brand")}
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <LanguageToggle responsive />
          {user ? (
            <>
              <LinkButton href="/dashboard" variant="ghost" size="sm">
                {t("nav.dashboard")}
              </LinkButton>
              <LogoutButton />
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                {t("nav.signIn")}
              </LinkButton>
              <LinkButton href="/signup" variant="primary" size="sm">
                {t("nav.getStarted")}
              </LinkButton>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
        <div className="mb-3 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
          {t("landing.badge")}
        </div>

        <h1 className="max-w-2xl text-balance text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("landing.title")}
        </h1>
        <p className="mt-4 max-w-xl text-balance text-center text-base text-muted-foreground">
          {t("landing.subtitle")}
        </p>

        <form action="/dashboard" method="get" className="mt-9 w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(15,61,62,0.25)] transition-shadow focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(15,61,62,0.35)]">
            <MapPinned className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              name="q"
              type="text"
              placeholder={t("landing.searchPlaceholder")}
              className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("landing.searchButton")}
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {quickChips.map(({ label, icon: Icon, params }) => (
            <Link
              key={label}
              href={`/dashboard?${params}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        {t("landing.footer")}
      </footer>
    </div>
  );
}
