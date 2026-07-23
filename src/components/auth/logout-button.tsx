"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { t } = useLocale();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
          router.refresh();
        });
      }}
    >
      {t("logout")}
    </Button>
  );
}
