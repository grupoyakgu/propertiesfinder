"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/context";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-danger">{t("auth.invalidResetLink")}</p>
        <Link href="/login" className="mt-4 inline-block font-medium text-primary hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("auth.somethingWrong"));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError(t("auth.networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-success">{t("auth.passwordResetSuccess")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("auth.redirectingToLogin")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <FieldLabel htmlFor="password">{t("auth.newPassword")}</FieldLabel>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <div>
        <FieldLabel htmlFor="confirmPassword">{t("auth.confirmPassword")}</FieldLabel>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.pleaseWait") : t("auth.resetPassword")}
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
