"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/context";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const next = searchParams.get("next") ?? "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name, email, password } : { email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("auth.somethingWrong"));
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError(t("auth.networkError"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      {mode === "signup" && (
        <div>
          <FieldLabel htmlFor="name">{t("auth.fullName")}</FieldLabel>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            placeholder="Jane Investor"
          />
        </div>
      )}
      <div>
        <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@company.com"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
          {mode === "login" && (
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.pleaseWait") : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            {t("auth.noAccount")}{" "}
            <Link href="/signup" className="font-medium text-primary">
              {t("auth.getStarted")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="font-medium text-primary">
              {t("auth.signIn")}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
