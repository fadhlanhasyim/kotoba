"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { scheduleReview, type Grade } from "@/lib/srs";
import type { Card, DueCard, UserCardProgress } from "@/lib/types";
import FlashcardCard from "@/components/FlashcardCard";

const NEW_CARDS_PER_SESSION = 10;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ReviewPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [queue, setQueue] = useState<DueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUserId(uid);

      const now = new Date();
      const { data: progress } = await supabase
        .from("user_card_progress")
        .select("*")
        .eq("user_id", uid);

      const progressRows = (progress ?? []) as UserCardProgress[];
      const dueProgress = progressRows.filter((p) => new Date(p.due_at) <= now);
      const knownCardIds = progressRows.map((p) => p.card_id);

      const dueCards: DueCard[] = [];
      if (dueProgress.length > 0) {
        const { data: cards } = await supabase
          .from("cards")
          .select("*")
          .in("id", dueProgress.map((p) => p.card_id));
        for (const card of (cards ?? []) as Card[]) {
          const p = dueProgress.find((row) => row.card_id === card.id) ?? null;
          dueCards.push({ ...card, progress: p });
        }
      }

      let newCardsQuery = supabase.from("cards").select("*").limit(NEW_CARDS_PER_SESSION);
      if (knownCardIds.length > 0) {
        newCardsQuery = newCardsQuery.not("id", "in", `(${knownCardIds.join(",")})`);
      }
      const { data: newCards } = await newCardsQuery;
      const newDueCards: DueCard[] = ((newCards ?? []) as Card[]).map((card) => ({
        ...card,
        progress: null,
      }));

      setQueue(shuffle([...dueCards, ...newDueCards]));
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleGrade(grade: Grade) {
    if (!userId) return;
    const card = queue[index];
    const state = card.progress
      ? { intervalDays: card.progress.interval_days, ease: card.progress.ease, reps: card.progress.reps }
      : { intervalDays: 0, ease: 2.5, reps: 0 };

    const result = scheduleReview(state, grade);
    const now = new Date();

    await supabase.from("user_card_progress").upsert(
      {
        user_id: userId,
        card_id: card.id,
        due_at: result.dueAt.toISOString(),
        interval_days: result.intervalDays,
        ease: result.ease,
        reps: result.reps,
        last_reviewed_at: now.toISOString(),
      },
      { onConflict: "user_id,card_id" }
    );

    await supabase.from("review_logs").insert({
      user_id: userId,
      card_id: card.id,
      grade,
      reviewed_at: now.toISOString(),
    });

    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (loading) return <p className="caption">Loading review queue…</p>;

  if (index >= queue.length) {
    return (
      <div className="card rise" style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
          <i className="ti ti-circle-check" style={{ color: "var(--teal-400)" }} />
        </div>
        <h1 style={{ marginBottom: 8 }}>Session complete</h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
          {queue.length} card{queue.length === 1 ? "" : "s"} reviewed. Come back once more are due.
        </p>
      </div>
    );
  }

  const progressPct = Math.round((index / queue.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: "var(--radius-pill)",
            background: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: "var(--accent)",
              borderRadius: "var(--radius-pill)",
              transition: "width 0.4s var(--ease)",
            }}
          />
        </div>
        <span className="caption" style={{ whiteSpace: "nowrap" }}>
          {index + 1} / {queue.length}
        </span>
      </div>
      <FlashcardCard
        card={queue[index]}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onGrade={handleGrade}
      />
    </div>
  );
}
