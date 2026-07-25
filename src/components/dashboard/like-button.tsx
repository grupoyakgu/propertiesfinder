"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

/** Self-contained "like" toggle — manages its own state and API call, so it works
 * identically whether it's dropped into a dashboard card/table row/map popup or a
 * standalone server-rendered detail page. `onToggle` is optional and only needed by
 * views that must react to an unlike (e.g. removing the row from a favorites list). */
export function LikeButton({
  propertyId,
  initialLiked,
  onToggle,
  className,
}: {
  propertyId: string;
  initialLiked: boolean;
  onToggle?: (liked: boolean) => void;
  className?: string;
}) {
  const { t } = useLocale();
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  // Resyncs when a fresh server-computed value arrives (e.g. a detail page's
  // router.refresh() after some other action — like posting a comment — also
  // liked the property) via the "adjust state during render" pattern, since
  // setState-in-effect isn't allowed here. Safe against clobbering an in-flight
  // toggle: the parent only ever passes a new initialLiked once it has the
  // server's confirmed value, by which point this button's own optimistic state
  // already matches it.
  const [prevInitialLiked, setPrevInitialLiked] = useState(initialLiked);
  if (initialLiked !== prevInitialLiked) {
    setPrevInitialLiked(initialLiked);
    setLiked(initialLiked);
  }

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const optimistic = !liked;
    setLiked(optimistic);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) {
        setLiked(!optimistic);
        return;
      }
      const data = await res.json();
      setLiked(data.liked);
      onToggle?.(data.liked);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      title={liked ? t("card.unlike") : t("card.like")}
      className={cn(
        "shrink-0 rounded p-1",
        liked ? "text-primary" : "text-muted-foreground hover:text-primary",
        className
      )}
    >
      <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
    </button>
  );
}
