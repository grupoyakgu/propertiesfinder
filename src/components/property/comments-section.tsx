"use client";

import { useState } from "react";
import { Heart, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientComment } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const textareaClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

export function CommentsSection({
  source,
  propertyId,
  currentUserId,
  initialComments,
}: {
  source: "plots" | "catastro";
  propertyId: string;
  /** Null when there's no signed-in user (shouldn't normally happen — these pages
   * require a session — but getCurrentUser() can still return null, e.g. a stale
   * token pointing at a deleted account, so this is handled defensively). */
  currentUserId: string | null;
  initialComments: ClientComment[];
}) {
  const { t, locale } = useLocale();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === "es" ? "es-ES" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, propertyId, body }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setBody("");
    } catch {
      setError(t("comments.postError"));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (!window.confirm(t("comments.deleteConfirm"))) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4 text-accent" />
        {t("comments.heading")}
      </h3>

      {currentUserId && (
        <form onSubmit={submitNew} className="mt-4 space-y-2 border-b border-border pb-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={4000}
            rows={3}
            placeholder={t("comments.bodyPlaceholder")}
            className={textareaClass}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? t("comments.posting") : t("comments.submit")}
          </Button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">{t("comments.empty")}</p>}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            canManage={currentUserId === comment.authorId}
            onDelete={() => deleteComment(comment.id)}
            onSaved={(updated) => setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  canManage,
  onDelete,
  onSaved,
  formatDate,
}: {
  comment: ClientComment;
  canManage: boolean;
  onDelete: () => void;
  onSaved: (updated: ClientComment) => void;
  formatDate: (iso: string) => string;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState(comment.body);

  const cancel = () => {
    setBody(comment.body);
    setEditing(false);
  };

  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onSaved(data.comment);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          className={textareaClass}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? t("comments.saving") : t("comments.save")}
          </Button>
          <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
            {t("comments.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{comment.authorName}</p>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              title={t("comments.edit")}
              className="rounded p-1 text-muted-foreground hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title={t("comments.delete")}
              className="rounded p-1 text-muted-foreground hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {formatDate(comment.createdAt)}
          {comment.updatedAt !== comment.createdAt ? ` · ${t("comments.edited")}` : ""}
        </p>
        <CommentLikeButton commentId={comment.id} initialLiked={comment.likedByMe} initialCount={comment.likeCount} />
      </div>
    </div>
  );
}

function CommentLikeButton({
  commentId,
  initialLiked,
  initialCount,
}: {
  commentId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const { t } = useLocale();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setCount((c) => c + (optimisticLiked ? 1 : -1));
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      if (!res.ok) {
        setLiked(!optimisticLiked);
        setCount((c) => c + (optimisticLiked ? -1 : 1));
        return;
      }
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.likeCount);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={liked ? t("card.unlike") : t("card.like")}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        liked ? "text-primary" : "text-muted-foreground hover:text-primary"
      )}
    >
      <Heart className="h-3.5 w-3.5" fill={liked ? "currentColor" : "none"} />
      {count}
    </button>
  );
}
