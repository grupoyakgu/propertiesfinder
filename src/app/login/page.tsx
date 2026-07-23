import { Suspense } from "react";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-primary">
        <MapPinned className="h-6 w-6" strokeWidth={1.75} />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          PropertiesFinder
        </span>
      </Link>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue your acquisition search.
        </p>
      </div>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
