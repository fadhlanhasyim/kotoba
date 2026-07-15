"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { DrillKana, KanaCharacter, UserKanaProgress } from "@/lib/types";
import KanaCard from "@/components/KanaCard";
import KanaRowOverview from "@/components/KanaRowOverview";

const MASTERY_STREAK = 3;
const MASTERY_MIN_DAYS = 2; // must be correct on at least this many distinct days, not just in one sitting
type ScriptFilter = "hiragana" | "katakana" | "both";

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// Gojuon rows by sort_order range (1-based, inclusive): a,ka,sa,ta,na,ha,ma,ya,ra,wa/n.
const ROW_BOUNDS: [number, number][] = [
  [1, 5], [6, 10], [11, 15], [16, 20], [21, 25],
  [26, 30], [31, 35], [36, 38], [39, 43], [44, 46],
];

interface KanaRow {
  key: string;
  characters: DrillKana[];
}

interface PickedCard {
  mode: "learn" | "quiz";
  kana: DrillKana;
}

function buildRows(
  kana: KanaCharacter[],
  progress: Record<string, UserKanaProgress>,
  script: ScriptFilter
): KanaRow[] {
  const scripts: ("hiragana" | "katakana")[] = script === "both" ? ["hiragana", "katakana"] : [script];
  const rows: KanaRow[] = [];
  for (const s of scripts) {
    for (let r = 0; r < ROW_BOUNDS.length; r++) {
      const [lo, hi] = ROW_BOUNDS[r];
      const characters = kana
        .filter((k) => k.script === s && k.sort_order >= lo && k.sort_order <= hi)
        .map((k) => ({ ...k, progress: progress[k.id] ?? null }))
        .sort((a, b) => a.sort_order - b.sort_order);
      if (characters.length > 0) rows.push({ key: `${s}-${r}`, characters });
    }
  }
  return rows;
}

function findCurrentRow(rows: KanaRow[]): KanaRow | null {
  return rows.find((row) => row.characters.some((c) => !c.progress?.mastered_at)) ?? null;
}

function isRowUnstarted(row: KanaRow): boolean {
  return row.characters.every((c) => !c.progress);
}

function pickInRow(row: KanaRow, excludeId: string | null): PickedCard | null {
  const notIntroduced = row.characters.filter((c) => !c.progress);
  if (notIntroduced.length > 0) {
    const next = [...notIntroduced].sort((a, b) => a.sort_order - b.sort_order)[0];
    return { mode: "learn", kana: next };
  }
  const active = row.characters.filter((c) => c.progress && !c.progress.mastered_at);
  if (active.length === 0) return null;
  const options = active.length > 1 ? active.filter((c) => c.id !== excludeId) : active;
  return { mode: "quiz", kana: options[Math.floor(Math.random() * options.length)] };
}

export default function KanaDrillPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [kana, setKana] = useState<KanaCharacter[]>([]);
  const [progress, setProgress] = useState<Record<string, UserKanaProgress>>({});
  const [script, setScript] = useState<ScriptFilter>("hiragana");
  const [dismissedRow, setDismissedRow] = useState<string | null>(null);
  const [current, setCurrent] = useState<PickedCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUserId(uid);

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

      setKana(kanaList);
      setProgress(progressMap);
      const currentRow = findCurrentRow(buildRows(kanaList, progressMap, "hiragana"));
      setCurrent(currentRow && !isRowUnstarted(currentRow) ? pickInRow(currentRow, null) : null);
      setLoading(false);
    }
    load();
  }, [router]);

  function selectScript(next: ScriptFilter) {
    setScript(next);
    const currentRow = findCurrentRow(buildRows(kana, progress, next));
    setCurrent(currentRow && !isRowUnstarted(currentRow) ? pickInRow(currentRow, current?.kana.id ?? null) : null);
    setRevealed(false);
  }

  function startRow(row: KanaRow) {
    setDismissedRow(row.key);
    setCurrent(pickInRow(row, null));
    setRevealed(false);
  }

  async function upsertProgress(kanaId: string, data: UserKanaProgress, now: string) {
    if (!userId) return;
    await supabase.from("user_kana_progress").upsert(
      {
        user_id: userId,
        kana_id: kanaId,
        correct_streak: data.correct_streak,
        mastered_at: data.mastered_at,
        last_seen_at: now,
        distinct_correct_days: data.distinct_correct_days,
        last_correct_date: data.last_correct_date,
      },
      { onConflict: "user_id,kana_id" }
    );
  }

  function advance(nextProgress: Record<string, UserKanaProgress>, previousCardId: string) {
    setProgress(nextProgress);
    const currentRow = findCurrentRow(buildRows(kana, nextProgress, script));
    setCurrent(currentRow && !isRowUnstarted(currentRow) ? pickInRow(currentRow, previousCardId) : null);
    setRevealed(false);
  }

  async function handleLearned() {
    if (!current) return;
    const now = new Date().toISOString();
    const updated: UserKanaProgress = {
      id: "",
      user_id: userId ?? "",
      kana_id: current.kana.id,
      correct_streak: 0,
      mastered_at: null,
      last_seen_at: now,
      distinct_correct_days: 0,
      last_correct_date: null,
    };
    const nextProgress = { ...progress, [current.kana.id]: updated };
    advance(nextProgress, current.kana.id);
    await upsertProgress(current.kana.id, updated, now);
  }

  async function handleGrade(gotIt: boolean) {
    if (!current) return;
    const prev = current.kana.progress;
    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const todayStr = today(nowDate);

    const nextStreak = gotIt ? (prev?.correct_streak ?? 0) + 1 : 0;

    // Only a correct answer on a day we haven't already logged counts toward
    // the day requirement — this is what makes "cover everything in one sitting"
    // structurally impossible, no matter how many times you get it right today.
    let distinctDays = prev?.distinct_correct_days ?? 0;
    let lastCorrectDate = prev?.last_correct_date ?? null;
    if (gotIt && lastCorrectDate !== todayStr) {
      distinctDays += 1;
      lastCorrectDate = todayStr;
    }

    const mastered = nextStreak >= MASTERY_STREAK && distinctDays >= MASTERY_MIN_DAYS;

    const updated: UserKanaProgress = {
      id: prev?.id ?? "",
      user_id: userId ?? "",
      kana_id: current.kana.id,
      correct_streak: nextStreak,
      mastered_at: mastered ? nowIso : null,
      last_seen_at: nowIso,
      distinct_correct_days: distinctDays,
      last_correct_date: lastCorrectDate,
    };

    const nextProgress = { ...progress, [current.kana.id]: updated };
    advance(nextProgress, current.kana.id);
    await upsertProgress(current.kana.id, updated, nowIso);
  }

  if (loading) return <p className="caption">Loading kana…</p>;

  const rows = buildRows(kana, progress, script);
  const flatAll = rows.flatMap((r) => r.characters);
  const masteredCount = flatAll.filter((k) => k.progress?.mastered_at).length;
  const activeCount = flatAll.filter((k) => k.progress && !k.progress.mastered_at).length;
  const newCount = flatAll.length - masteredCount - activeCount;
  const currentRow = findCurrentRow(rows);
  const showOverview = !!currentRow && isRowUnstarted(currentRow) && dismissedRow !== currentRow.key;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h1>Kana drill</h1>
        <p className="caption">
          {masteredCount} mastered &middot; {activeCount} learning &middot; {newCount} new
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["hiragana", "katakana", "both"] as ScriptFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => selectScript(s)}
            style={{
              borderBottom: script === s ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {!currentRow ? (
        <div>
          <h2>All mastered</h2>
          <p>
            Every {script} character has held a {MASTERY_STREAK}-in-a-row streak across at least{" "}
            {MASTERY_MIN_DAYS} different days. Try another script above.
          </p>
        </div>
      ) : showOverview ? (
        <KanaRowOverview characters={currentRow.characters} onStart={() => startRow(currentRow)} />
      ) : current ? (
        <KanaCard
          kana={current.kana}
          mode={current.mode}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onGrade={handleGrade}
          onLearned={handleLearned}
          progressHint={
            current.mode === "quiz"
              ? `streak ${current.kana.progress?.correct_streak ?? 0}/${MASTERY_STREAK} today · ${
                  current.kana.progress?.distinct_correct_days ?? 0
                }/${MASTERY_MIN_DAYS} days confirmed`
              : undefined
          }
        />
      ) : (
        <p className="caption">Loading…</p>
      )}
    </div>
  );
}
