"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/context";

export function ForgotPasswordForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("auth.somethingWrong"));
        setLoading(false);
        return;
      }

      setMessage(t("auth.resetEmailSent"));
      setEmail("");
    } catch {
      setError(t("auth.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@company.com"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {message && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{message}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.pleaseWait") : t("auth.sendResetLink")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.rememberPassword")}{" "}
        <Link href="/login" className="font-medium text-primary">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}
