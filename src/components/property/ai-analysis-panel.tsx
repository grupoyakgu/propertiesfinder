"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, ShieldAlert, ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlotAnalysis } from "@/lib/ai";

export function AIAnalysisPanel({ slug }: { slug: string }) {
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
      setError("Could not generate analysis right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          AI Investment Analysis
        </h3>
        {analysis && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Score {analysis.score}/100
          </span>
        )}
      </div>

      {!analysis && !loading && (
        <div className="mt-3">
          <p className="mb-3 text-sm text-muted-foreground">
            Run an AI acquisition analysis covering strengths, risks, recommended use and
            next due-diligence steps.
          </p>
          <Button size="sm" onClick={runAnalysis}>
            Analyze this plot
          </Button>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing plot data…
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {analysis && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-foreground">{analysis.summary}</p>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recommended use</p>
            <p className="text-sm font-medium text-foreground">{analysis.recommendedUse}</p>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Strengths
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
              <ShieldAlert className="h-3.5 w-3.5" /> Risks
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
              <ListChecks className="h-3.5 w-3.5" /> Next steps
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              {analysis.nextSteps.map((s, i) => (
                <li key={i}>{i + 1}. {s}</li>
              ))}
            </ul>
          </div>

          {analysis.source === "rule-based" && (
            <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
              Generated from structured data only. Set ANTHROPIC_API_KEY for full Claude-powered
              analysis.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
