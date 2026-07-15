"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { KanaCharacter, UserKanaProgress } from "@/lib/types";
import {
  MASTERY_STREAK,
  MASTERY_MIN_DAYS,
  ROW_LABELS,
  buildRows,
  getRow,
  isRowUnstarted,
  pickInRow,
  rowStatus,
  today,
  type KanaRow,
  type PickedCard,
  type ScriptFilter,
} from "@/lib/kana";
import KanaCard from "@/components/KanaCard";
import KanaRowOverview from "@/components/KanaRowOverview";
import KanaRowPicker from "@/components/KanaRowPicker";

export default function KanaDrillPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [kana, setKana] = useState<KanaCharacter[]>([]);
  const [progress, setProgress] = useState<Record<string, UserKanaProgress>>({});
  const [script, setScript] = useState<ScriptFilter>("both");
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
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
      setLoading(false);
    }
    load();
  }, [router]);

  function openRow(row: KanaRow) {
    setSelectedRowKey(row.key);
    setCurrent(isRowUnstarted(row) ? null : pickInRow(row, null));
    setRevealed(false);
  }

  function backToGroups() {
    setSelectedRowKey(null);
    setCurrent(null);
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
    const row = selectedRowKey ? getRow(kana, nextProgress, selectedRowKey) : null;
    setCurrent(row ? pickInRow(row, previousCardId) : null);
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
  const selectedRow = selectedRowKey ? getRow(kana, progress, selectedRowKey) : null;

  if (!selectedRow) {
    const flatAll = rows.flatMap((r) => r.characters);
    const masteredCount = flatAll.filter((k) => k.progress?.mastered_at).length;
    const activeCount = flatAll.filter((k) => k.progress && !k.progress.mastered_at).length;
    const newCount = flatAll.length - masteredCount - activeCount;
    const recommendedKey =
      rows.find((r) => rowStatus(r) === "learning")?.key ?? rows.find((r) => rowStatus(r) === "new")?.key ?? null;

    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h1>Kana drill</h1>
          <p className="caption">
            {masteredCount} mastered &middot; {activeCount} learning &middot; {newCount} new
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["hiragana", "katakana", "both"] as ScriptFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setScript(s)}
              style={{ borderBottom: script === s ? "2px solid var(--accent)" : "2px solid transparent" }}
            >
              {s}
            </button>
          ))}
        </div>

        <KanaRowPicker rows={rows} recommendedKey={recommendedKey} onSelect={openRow} />
      </div>
    );
  }

  const showOverview = isRowUnstarted(selectedRow) && dismissedRow !== selectedRow.key;
  const rowLabel = `${ROW_LABELS[selectedRow.rowIndex]}-row`;

  return (
    <div>
      <button onClick={backToGroups} style={{ marginBottom: 16 }}>
        <i className="ti ti-arrow-left" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
        All groups
      </button>

      {current ? (
        <>
          <p className="caption" style={{ marginBottom: 16 }}>
            {selectedRow.script} &middot; {rowLabel}
          </p>
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
        </>
      ) : showOverview ? (
        <KanaRowOverview characters={selectedRow.characters} onStart={() => startRow(selectedRow)} />
      ) : (
        <div className="card rise" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
            <i className="ti ti-circle-check" style={{ color: "var(--teal-400)" }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>
            {selectedRow.script} {rowLabel} mastered
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            Held a {MASTERY_STREAK}-in-a-row streak across {MASTERY_MIN_DAYS} different days. Pick another group to
            keep going.
          </p>
        </div>
      )}
    </div>
  );
}
