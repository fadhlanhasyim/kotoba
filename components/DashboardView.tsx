"use client";

import Link from "next/link";
import type { PhaseStats, Recommendation } from "@/lib/learningPath";
import MetricCard from "@/components/MetricCard";
import ProgressRing from "@/components/ProgressRing";

export interface DashboardMetrics {
  streakDays: number;
  dueToday: number;
  accuracyPct: number;
  n5ProgressPct: number;
  kanaStreakDays: number;
  kanaMasteredCount: number;
  kanaTotal: number;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Where each recommendation phase sends you, and how the hero ring is labeled.
const PHASE_META: Record<string, { title: string; cta: string; href: string; ringLabel: string }> = {
  "core-hiragana": { title: "Core hiragana", cta: "Practice kana", href: "/kana", ringLabel: "hiragana" },
  "core-katakana": { title: "Core katakana", cta: "Practice kana", href: "/kana", ringLabel: "katakana" },
  "extended-kana": { title: "Extended kana", cta: "Practice kana", href: "/kana", ringLabel: "extended" },
  review: { title: "Vocab review", cta: "Start review", href: "/review", ringLabel: "N5" },
};

export default function DashboardView({
  metrics,
  phases,
  rec,
}: {
  metrics: DashboardMetrics;
  phases: PhaseStats[];
  rec: Recommendation;
}) {
  const meta = PHASE_META[rec.phaseId] ?? PHASE_META.review;
  // The hero ring tracks the phase you're actually working on — a 0% "all of N5"
  // number on day one of kana is technically true but demotivating and useless.
  const activePhase = phases.find((p) => p.id === rec.phaseId);
  const heroPct = activePhase ? activePhase.pct : metrics.n5ProgressPct;
  const heroSub = activePhase
    ? `${activePhase.masteredCount}/${activePhase.totalCount} mastered`
    : metrics.dueToday > 0
      ? `${metrics.dueToday} card${metrics.dueToday === 1 ? "" : "s"} due today`
      : "all caught up today";

  const ctaLabel =
    rec.phaseId === "review" && metrics.dueToday > 0 ? `${meta.cta} · ${metrics.dueToday} due` : meta.cta;

  return (
    <div className="rise" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p className="caption" style={{ marginBottom: 2 }}>
          {greeting()}
        </p>
        <h1>おかえり</h1>
        {metrics.kanaStreakDays > 0 && (
          <p
            style={{
              marginTop: 6,
              fontSize: 14,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="ti ti-flame" style={{ color: "var(--coral-400)" }} aria-hidden="true" />
            {metrics.kanaStreakDays}-day kana streak — show up today to keep it alive
          </p>
        )}
      </div>

      {/* Hero: what to do right now, driven by the learning-path recommendation */}
      <div
        className="card"
        style={{
          padding: 24,
          background: "var(--accent-bg)",
          borderColor: "var(--accent)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <ProgressRing percent={heroPct} label={meta.ringLabel} size={116} stroke={11} />
          <span className="caption">{heroSub}</span>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p
            className="caption"
            style={{
              color: "var(--accent-text)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <i className="ti ti-compass" aria-hidden="true" /> up next
          </p>
          <h2 style={{ marginBottom: 8 }}>{meta.title}</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>{rec.message}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={meta.href}>
              <span className="btn btn-primary">
                <i className="ti ti-player-play" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
                {ctaLabel}
              </span>
            </Link>
            <Link href="/learning-path">
              <span className="btn">See full path</span>
            </Link>
          </div>
          {metrics.dueToday > 0 && rec.phaseId !== "review" && (
            <p className="caption" style={{ marginTop: 12 }}>
              Also waiting:{" "}
              <Link href="/review" style={{ color: "var(--accent-text)", fontWeight: 600 }}>
                {metrics.dueToday} vocab card{metrics.dueToday === 1 ? "" : "s"} in review
              </Link>
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="caption" style={{ marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Kana
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <MetricCard icon="ti-flame" color="var(--coral-400)" label="day streak" value={`${metrics.kanaStreakDays}`} />
          <MetricCard
            icon="ti-language-hiragana"
            color="var(--teal-400)"
            label="mastered"
            value={`${metrics.kanaMasteredCount}/${metrics.kanaTotal}`}
          />
        </div>
      </div>

      <div>
        <h3 className="caption" style={{ marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          N5 vocab
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <MetricCard icon="ti-flame" color="var(--coral-400)" label="day streak" value={`${metrics.streakDays}`} />
          <MetricCard icon="ti-cards" color="var(--blue-500)" label="due today" value={`${metrics.dueToday}`} />
          <MetricCard icon="ti-target-arrow" color="var(--teal-400)" label="accuracy" value={`${metrics.accuracyPct}%`} />
          <MetricCard icon="ti-chart-bar" color="var(--amber-500)" label="N5 learned" value={`${metrics.n5ProgressPct}%`} />
        </div>
      </div>
    </div>
  );
}
