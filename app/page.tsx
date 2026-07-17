"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { computeKanaPhases, recommend, type PhaseStats, type Recommendation } from "@/lib/learningPath";
import type { KanaCharacter, UserKanaProgress } from "@/lib/types";
import DashboardView, { type DashboardMetrics } from "@/components/DashboardView";

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

interface DashboardData {
  metrics: DashboardMetrics;
  phases: PhaseStats[];
  rec: Recommendation;
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);

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
      let n5Learned = 0;
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
          n5Learned = learned ?? 0;
          n5ProgressPct = Math.round((n5Learned / n5CardIds.length) * 100);
        }
      }

      // Full rows (not just the two columns the metrics need) so the same fetch
      // also feeds computeKanaPhases for the hero recommendation.
      const { data: kanaRows } = await supabase.from("kana_characters").select("*");
      const { data: progressRows } = await supabase
        .from("user_kana_progress")
        .select("*")
        .eq("user_id", uid);

      const kanaList = (kanaRows ?? []) as KanaCharacter[];
      const rows = (progressRows ?? []) as UserKanaProgress[];
      const progressMap: Record<string, UserKanaProgress> = {};
      for (const row of rows) {
        progressMap[row.kana_id] = row;
      }

      const kanaMasteredCount = rows.filter((r) => r.mastered_at).length;
      // No per-event log for kana (unlike review_logs for vocab) — last_seen_at per character is
      // overwritten on each touch, so the set of distinct dates across all 211 rows is a good-
      // enough proxy for "days practiced," not a precise audit log.
      const kanaStreakDays = computeStreak(rows.map((r) => r.last_seen_at).filter((d): d is string => !!d));

      const phases = computeKanaPhases(kanaList, progressMap);

      setData({
        metrics: {
          streakDays,
          dueToday: dueToday ?? 0,
          accuracyPct,
          n5ProgressPct,
          kanaStreakDays,
          kanaMasteredCount,
          kanaTotal: kanaList.length,
        },
        phases,
        rec: recommend(phases, n5Learned > 0),
      });
    }
    load();
  }, [authLoading, session, router]);

  if (!data) return <p className="caption">Loading…</p>;

  return <DashboardView metrics={data.metrics} phases={data.phases} rec={data.rec} />;
}
