import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Grupo Yakgu wordmark (public/logo.png, 615×176 — a wide horizontal
 * mark, so it's sized by height with the width following automatically)
 * used everywhere the app previously showed a generic pin icon as its brand
 * mark: the dashboard header, login/signup, and the property detail page. */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Grupo Yakgu"
      width={615}
      height={176}
      priority
      className={cn("h-5 w-auto shrink-0", className)}
    />
  );
}
