"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import MetricCard from "@/components/MetricCard";
import ProgressRing from "@/components/ProgressRing";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

interface Metrics {
  streakDays: number;
  dueToday: number;
  accuracyPct: number;
  n5ProgressPct: number;
  kanaStreakDays: number;
  kanaMasteredCount: number;
  kanaTotal: number;
}

function computeStreak(reviewedAtDates: string[]): number {
  const days = new Set(reviewedAtDates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cursor = new Date();
  // if nothing reviewed today yet, the streak still counts through yesterday
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const uid = session.user.id;

    async function load() {
      const now = new Date().toISOString();
      const { count: dueToday } = await supabase
        .from("user_card_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .lte("due_at", now);

      const { data: logs } = await supabase
        .from("review_logs")
        .select("grade, reviewed_at")
        .eq("user_id", uid)
        .order("reviewed_at", { ascending: false })
        .limit(500);

      const total = logs?.length ?? 0;
      const correct = logs?.filter((l) => l.grade === "good" || l.grade === "easy").length ?? 0;
      const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
      const streakDays = computeStreak((logs ?? []).map((l) => l.reviewed_at));

      const { data: n5Level } = await supabase.from("levels").select("id").eq("code", "N5").single();
      let n5ProgressPct = 0;
      if (n5Level) {
        const { data: n5Cards } = await supabase.from("cards").select("id").eq("level_id", n5Level.id);
        const n5CardIds = (n5Cards ?? []).map((c) => c.id);
        if (n5CardIds.length > 0) {
          const { count: learned } = await supabase
            .from("user_card_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid)
            .gte("reps", 1)
            .in("card_id", n5CardIds);
          n5ProgressPct = Math.round(((learned ?? 0) / n5CardIds.length) * 100);
        }
      }

      const { data: kanaProgressRows } = await supabase
        .from("user_kana_progress")
        .select("mastered_at, last_seen_at")
        .eq("user_id", uid);
      const { count: kanaTotal } = await supabase
        .from("kana_characters")
        .select("id", { count: "exact", head: true });

      const rows = kanaProgressRows ?? [];
      const kanaMasteredCount = rows.filter((r) => r.mastered_at).length;
      // No per-event log for kana (unlike review_logs for vocab) — last_seen_at per character is
      // overwritten on each touch, so the set of distinct dates across all 211 rows is a good-
      // enough proxy for "days practiced," not a precise audit log.
      const kanaStreakDays = computeStreak(rows.map((r) => r.last_seen_at).filter((d): d is string => !!d));

      setMetrics({
        streakDays,
        dueToday: dueToday ?? 0,
        accuracyPct,
        n5ProgressPct,
        kanaStreakDays,
        kanaMasteredCount,
        kanaTotal: kanaTotal ?? 0,
      });
    }
    load();
  }, [authLoading, session, router]);

  if (!metrics) return <p className="caption">Loading…</p>;

  const dueLabel =
    metrics.dueToday > 0
      ? `${metrics.dueToday} card${metrics.dueToday === 1 ? "" : "s"} waiting for you`
      : "You're all caught up for now";

  return (
    <div className="rise" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p className="caption" style={{ marginBottom: 2 }}>
          {greeting()}
        </p>
        <h1>おかえり</h1>
      </div>

      {/* Hero: N5 progress + primary call to action */}
      <div
        className="card"
        style={{
          padding: 24,
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <ProgressRing percent={metrics.n5ProgressPct} label="N5" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ marginBottom: 6 }}>Your road to N5</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 16 }}>{dueLabel}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/review">
              <span className="btn btn-primary">
                <i className="ti ti-player-play" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
                Start review
              </span>
            </Link>
            <Link href="/kana">
              <span className="btn">Practice kana</span>
            </Link>
            <Link href="/learning-path">
              <span className="btn">
                <i className="ti ti-compass" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
                Learning path
              </span>
            </Link>
          </div>
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
