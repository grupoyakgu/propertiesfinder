import Link from "next/link";
import { MapPinned, Building2, Landmark, Hotel, Warehouse, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LinkButton } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

const quickChips: { label: string; icon: React.ElementType; params: string }[] = [
  { label: "Residential", icon: Building2, params: "potential=RESIDENTIAL" },
  { label: "Hotel", icon: Hotel, params: "potential=HOTEL" },
  { label: "Logistics", icon: Warehouse, params: "potential=LOGISTICS" },
  { label: "Historic", icon: Landmark, params: "planningStatus=HISTORIC" },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2 text-primary">
          <MapPinned className="h-6 w-6" strokeWidth={1.75} />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            PropertiesFinder
          </span>
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <LinkButton href="/dashboard" variant="ghost" size="sm">
                Dashboard
              </LinkButton>
              <LogoutButton />
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Sign in
              </LinkButton>
              <LinkButton href="/signup" variant="primary" size="sm">
                Get started
              </LinkButton>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
        <div className="mb-3 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
          AI acquisition analysis on official cadastral data
        </div>

        <h1 className="max-w-2xl text-balance text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Find your next development opportunity in Spain
        </h1>
        <p className="mt-4 max-w-xl text-balance text-center text-base text-muted-foreground">
          Search land and buildings by cadastral reference, planning status and investment
          potential — backed by official Catastro data and AI-driven analysis.
        </p>

        <form action="/dashboard" method="get" className="mt-9 w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(15,61,62,0.25)] transition-shadow focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(15,61,62,0.35)]">
            <MapPinned className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              name="q"
              type="text"
              placeholder="Search by city, province, or referencia catastral..."
              className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Search
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
        Cadastral references verified against the Sede Electrónica del Catastro. Listing data in
        this demo is illustrative and for evaluation purposes.
      </footer>
    </div>
  );
}
