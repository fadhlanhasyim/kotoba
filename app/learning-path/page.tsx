"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { computeKanaPhases, recommend, type PhaseStats } from "@/lib/learningPath";
import type { KanaCharacter, UserKanaProgress } from "@/lib/types";
import LoadingState from "@/components/LoadingState";

interface ReviewPhase {
  id: "review";
  title: string;
  learnedCount: number;
  totalCount: number;
  pct: number;
}

function PhaseRow({
  title,
  why,
  pct,
  subtitle,
  current,
  href,
  linkLabel,
}: {
  title: string;
  why: string;
  pct: number;
  subtitle: string;
  current: boolean;
  href: string;
  linkLabel: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 18,
        borderColor: current ? "var(--accent)" : undefined,
        borderWidth: current ? 2 : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3>{title}</h3>
          {current && <span className="badge">now</span>}
        </div>
        <span className="caption" style={{ whiteSpace: "nowrap" }}>
          {subtitle}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: "var(--radius-pill)",
          background: "var(--border)",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: current ? "var(--accent)" : "var(--teal-400)",
            borderRadius: "var(--radius-pill)",
            transition: "width 0.4s var(--ease)",
          }}
        />
      </div>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>{why}</p>
      <Link href={href}>
        <span className="btn" style={{ fontSize: 13 }}>
          {linkLabel}
        </span>
      </Link>
    </div>
  );
}

export default function LearningPathPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const [phases, setPhases] = useState<PhaseStats[] | null>(null);
  const [review, setReview] = useState<ReviewPhase | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const uid = session.user.id;

    async function load() {
      const { data: kanaRows } = await supabase.from("kana_characters").select("*");
      const { data: progressRows } = await supabase
        .from("user_kana_progress")
        .select("*")
        .eq("user_id", uid);

      const kanaList = (kanaRows ?? []) as KanaCharacter[];
      const progressMap: Record<string, UserKanaProgress> = {};
      for (const row of (progressRows ?? []) as UserKanaProgress[]) {
        progressMap[row.kana_id] = row;
      }

      const { data: n5Level } = await supabase.from("levels").select("id").eq("code", "N5").single();
      let learnedCount = 0;
      let totalCount = 0;
      if (n5Level) {
        const { data: n5Cards } = await supabase.from("cards").select("id").eq("level_id", n5Level.id);
        const n5CardIds = (n5Cards ?? []).map((c) => c.id);
        totalCount = n5CardIds.length;
        if (n5CardIds.length > 0) {
          const { count: learned } = await supabase
            .from("user_card_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid)
            .gte("reps", 1)
            .in("card_id", n5CardIds);
          learnedCount = learned ?? 0;
        }
      }

      setPhases(computeKanaPhases(kanaList, progressMap));
      setReview({
        id: "review",
        title: "Vocab & kanji (Review)",
        learnedCount,
        totalCount,
        pct: totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0,
      });
    }
    load();
  }, [authLoading, session, router]);

  if (!phases || !review) return <LoadingState />;

  const rec = recommend(phases, review.learnedCount > 0);

  return (
    <div className="rise" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ marginBottom: 6 }}>Your learning path</h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
          Core hiragana, then core katakana, then extended kana forms and vocab together — not a strict
          all-of-kana-before-anything-else order. Here&rsquo;s where you actually stand.
        </p>
      </div>

      <div
        className="card"
        style={{ padding: 20, background: "var(--accent-bg)", borderColor: "var(--accent)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <i className="ti ti-compass" style={{ color: "var(--accent-text)", fontSize: 20 }} aria-hidden="true" />
          <h3 style={{ color: "var(--accent-text)" }}>Do this next</h3>
        </div>
        <p style={{ fontSize: 15, color: "var(--accent-text)" }}>{rec.message}</p>
      </div>

      {phases.map((phase) => (
        <PhaseRow
          key={phase.id}
          title={phase.title}
          why={phase.why}
          pct={phase.pct}
          subtitle={`${phase.masteredCount}/${phase.totalCount} mastered`}
          current={rec.phaseId === phase.id}
          href="/kana"
          linkLabel="Go to kana drill"
        />
      ))}

      <PhaseRow
        title={review.title}
        why="Once core hiragana and core katakana are solid, starting vocab doesn't need to wait for every extended kana form — seeing them inside real words reinforces them anyway."
        pct={review.pct}
        subtitle={review.totalCount > 0 ? `${review.learnedCount}/${review.totalCount} learned` : "Not started yet"}
        current={rec.phaseId === "review"}
        href="/review"
        linkLabel="Go to review"
      />
    </div>
  );
}
