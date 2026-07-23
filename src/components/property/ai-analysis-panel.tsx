"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, ShieldAlert, ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlotAnalysis } from "@/lib/ai";
import { useLocale } from "@/lib/i18n/context";

export function AIAnalysisPanel({ slug }: { slug: string }) {
  const { t } = useLocale();
  const [analysis, setAnalysis] = useState<PlotAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/analyze/${slug}`, { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      setError(t("ai.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          {t("ai.heading")}
        </h3>
        {analysis && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {t("ai.score", { score: analysis.score })}
          </span>
        )}
      </div>

      {!analysis && !loading && (
        <div className="mt-3">
          <p className="mb-3 text-sm text-muted-foreground">{t("ai.intro")}</p>
          <Button size="sm" onClick={runAnalysis}>
            {t("ai.analyzeButton")}
          </Button>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("ai.analyzing")}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {analysis && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-foreground">{analysis.summary}</p>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("ai.recommendedUse")}</p>
            <p className="text-sm font-medium text-foreground">{analysis.recommendedUse}</p>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> {t("ai.strengths")}
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-success">+</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> {t("ai.risks")}
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              {analysis.risks.map((s, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-danger">–</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> {t("ai.nextSteps")}
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              {analysis.nextSteps.map((s, i) => (
                <li key={i}>{i + 1}. {s}</li>
              ))}
            </ul>
          </div>

          {analysis.source === "rule-based" && (
            <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
              {t("ai.ruleBasedNotice")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
