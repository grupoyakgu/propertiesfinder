import { Suspense } from "react";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function SignupPage() {
  const { t } = await getServerTranslator();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 flex w-full max-w-sm items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <MapPinned className="h-6 w-6" strokeWidth={1.75} />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {t("brand")}
          </span>
        </Link>
        <LanguageToggle />
      </div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.signupTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.signupSubtitle")}</p>
      </div>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
