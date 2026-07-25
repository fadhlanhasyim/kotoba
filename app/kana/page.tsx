"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { DrillKana, KanaCharacter, UserKanaNote, UserKanaProgress } from "@/lib/types";
import {
  CONFUSABLE_GROUPS,
  MASTERY_STREAK,
  MASTERY_MIN_DAYS,
  MIN_MASTERED_RECALL,
  ROW_LABELS,
  buildRows,
  getRow,
  groupCharacters,
  isRowUnstarted,
  pickInGroup,
  pickInRow,
  pickMasteredRecall,
  pickPracticeCard,
  rowStatus,
  today,
  type ConfusableGroup,
  type KanaRow,
  type PickedCard,
  type ScriptFilter,
} from "@/lib/kana";
import KanaCard from "@/components/KanaCard";
import KanaRowOverview from "@/components/KanaRowOverview";
import KanaRowPicker from "@/components/KanaRowPicker";
import ConfusableGroupPicker from "@/components/ConfusableGroupPicker";
import LoadingState from "@/components/LoadingState";

export default function KanaDrillPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const userId = session?.user.id ?? null;
  const [kana, setKana] = useState<KanaCharacter[]>([]);
  const [progress, setProgress] = useState<Record<string, UserKanaProgress>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [script, setScript] = useState<ScriptFilter>("both");
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [dismissedRow, setDismissedRow] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [current, setCurrent] = useState<PickedCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const { data: noteRows } = await supabase.from("user_kana_notes").select("*").eq("user_id", uid);

      const kanaList = (kanaRows ?? []) as KanaCharacter[];
      const progressMap: Record<string, UserKanaProgress> = {};
      for (const row of (progressRows ?? []) as UserKanaProgress[]) {
        progressMap[row.kana_id] = row;
      }
      const notesMap: Record<string, string> = {};
      for (const row of (noteRows ?? []) as UserKanaNote[]) {
        notesMap[row.kana_id] = row.mnemonic;
      }

      setKana(kanaList);
      setProgress(progressMap);
      setNotes(notesMap);
      setLoading(false);
    }
    load();
  }, [authLoading, session, router]);

  // The kana list with personal mnemonics attached — everything below (rows,
  // drills, groups) is built from this so an override shows everywhere.
  const kanaMerged = kana.map((k) => (notes[k.id] ? { ...k, custom_mnemonic: notes[k.id] } : k));

  async function saveMnemonic(kanaId: string, mnemonic: string | null) {
    if (!userId) return;
    if (mnemonic) {
      setNotes((prev) => ({ ...prev, [kanaId]: mnemonic }));
      await supabase.from("user_kana_notes").upsert(
        { user_id: userId, kana_id: kanaId, mnemonic, updated_at: new Date().toISOString() },
        { onConflict: "user_id,kana_id" }
      );
    } else {
      setNotes((prev) => {
        const next = { ...prev };
        delete next[kanaId];
        return next;
      });
      await supabase.from("user_kana_notes").delete().eq("user_id", userId).eq("kana_id", kanaId);
    }
  }

  function openRow(row: KanaRow) {
    setSelectedRowKey(row.key);
    setPracticeMode(false);
    setShowReference(false);
    setCurrent(isRowUnstarted(row) ? null : pickInRow(row, null));
    setRevealed(false);
  }

  function openGroup(group: ConfusableGroup, members: DrillKana[]) {
    setSelectedGroupId(group.id);
    setPracticeMode(false);
    setShowReference(false);
    setCurrent(pickInGroup(members, null));
    setRevealed(false);
  }

  function backToPicker() {
    setSelectedRowKey(null);
    setSelectedGroupId(null);
    setPracticeMode(false);
    setShowReference(false);
    setTestingAll(false);
    setCurrent(null);
  }

  // Mixed recall test: pool is every mastered character across the current script
  // filter, not scoped to one row — a broader, harder shuffle than row-practice.
  function startMasteredTest() {
    setSelectedRowKey(null);
    setSelectedGroupId(null);
    setTestingAll(true);
    const pool = buildRows(kanaMerged, progress, script).flatMap((r) => r.characters);
    setCurrent(pickMasteredRecall(pool, null));
    setRevealed(false);
  }

  function startRow(row: KanaRow) {
    setDismissedRow(row.key);
    setCurrent(pickInRow(row, null));
    setRevealed(false);
  }

  // Re-drilling something already mastered — pickPracticeCard (unlike pickInRow) includes
  // mastered members, so this is the only way back to a fully-mastered row.
  function startPractice(row: KanaRow) {
    setPracticeMode(true);
    setCurrent(pickPracticeCard(row.characters, null));
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
    if (selectedRowKey) {
      const row = getRow(kanaMerged, nextProgress, selectedRowKey);
      if (!row) {
        setCurrent(null);
      } else if (practiceMode) {
        setCurrent(pickPracticeCard(row.characters, previousCardId));
      } else {
        setCurrent(pickInRow(row, previousCardId));
      }
    } else if (selectedGroupId) {
      const group = CONFUSABLE_GROUPS.find((g) => g.id === selectedGroupId);
      const members = group ? groupCharacters(kanaMerged, nextProgress, group) : [];
      setCurrent(pickInGroup(members, previousCardId));
    } else if (testingAll) {
      const pool = buildRows(kanaMerged, nextProgress, script).flatMap((r) => r.characters);
      setCurrent(pickMasteredRecall(pool, previousCardId));
    } else {
      setCurrent(null);
    }
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

  if (loading) return <LoadingState label="Loading kana…" />;

  const rows = buildRows(kanaMerged, progress, script);
  const selectedRow = selectedRowKey ? getRow(kanaMerged, progress, selectedRowKey) : null;
  const selectedGroup = selectedGroupId ? CONFUSABLE_GROUPS.find((g) => g.id === selectedGroupId) ?? null : null;

  if (!selectedRow && !selectedGroup && !testingAll) {
    const flatAll = rows.flatMap((r) => r.characters);
    const masteredCount = flatAll.filter((k) => k.progress?.mastered_at).length;
    const activeCount = flatAll.filter((k) => k.progress && !k.progress.mastered_at).length;
    const newCount = flatAll.length - masteredCount - activeCount;
    const recommendedKey =
      rows.find((r) => rowStatus(r) === "learning")?.key ?? rows.find((r) => rowStatus(r) === "new")?.key ?? null;

    const visibleGroups = CONFUSABLE_GROUPS.filter((g) => script === "both" || g.script === script).map((group) => ({
      group,
      members: groupCharacters(kanaMerged, progress, group),
    }));

    return (
      <div>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <h1>Kana drill</h1>
            <p className="caption">
              {masteredCount} mastered &middot; {activeCount} learning &middot; {newCount} new
            </p>
          </div>
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              height: 6,
              borderRadius: "var(--radius-pill)",
              background: "var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(masteredCount / Math.max(1, flatAll.length)) * 100}%`,
                background: "var(--teal-400)",
                transition: "width 0.4s var(--ease)",
              }}
            />
            <div
              style={{
                width: `${(activeCount / Math.max(1, flatAll.length)) * 100}%`,
                background: "var(--accent)",
                transition: "width 0.4s var(--ease)",
              }}
            />
          </div>
        </div>

        <div className="segmented" style={{ marginBottom: 22 }}>
          {(["hiragana", "katakana", "both"] as ScriptFilter[]).map((s) => (
            <button key={s} onClick={() => setScript(s)} className={script === s ? "active" : undefined}>
              {s}
            </button>
          ))}
        </div>

        <div
          className="card"
          style={{
            padding: 16,
            marginBottom: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            borderColor: masteredCount >= MIN_MASTERED_RECALL ? "var(--accent)" : undefined,
          }}
        >
          <div>
            <p style={{ fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-shuffle" style={{ color: "var(--accent)" }} aria-hidden="true" />
              Mixed recall test
            </p>
            <p className="caption">
              {masteredCount >= MIN_MASTERED_RECALL
                ? `Every mastered character (${masteredCount}) shuffled together — a real test, not just this row.`
                : `Master ${MIN_MASTERED_RECALL - masteredCount} more to unlock a mixed test across everything you know.`}
            </p>
          </div>
          <button
            className="btn-primary"
            disabled={masteredCount < MIN_MASTERED_RECALL}
            onClick={startMasteredTest}
            style={{ flexShrink: 0 }}
          >
            Start
          </button>
        </div>

        <KanaRowPicker rows={rows} recommendedKey={recommendedKey} onSelect={openRow} />

        <h2 style={{ margin: "28px 0 10px" }}>Look-alikes</h2>
        <p className="caption" style={{ marginBottom: 14 }}>
          Characters that are easy to mix up — practice telling them apart once you&rsquo;ve learned them individually.
        </p>
        <ConfusableGroupPicker groups={visibleGroups} onSelect={openGroup} />
      </div>
    );
  }

  const isGroupDrill = !!selectedGroup;
  const showOverview =
    !isGroupDrill && !testingAll && !!selectedRow && isRowUnstarted(selectedRow) && dismissedRow !== selectedRow.key;
  const rowLabel = selectedRow ? `${ROW_LABELS[selectedRow.rowIndex]}-row` : "";

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={backToPicker}>
          <i className="ti ti-arrow-left" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
          Back
        </button>
        {selectedRow && !showOverview && (
          <button onClick={() => setShowReference((v) => !v)}>
            <i className="ti ti-eye" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
            {showReference ? "Hide group" : "View group"}
          </button>
        )}
      </div>

      {showReference && selectedRow ? (
        <KanaRowOverview characters={selectedRow.characters} onClose={() => setShowReference(false)} />
      ) : current ? (
        <>
          <p className="caption" style={{ marginBottom: 16 }}>
            {testingAll
              ? `mixed recall · ${script}`
              : isGroupDrill
                ? `look-alikes · ${selectedGroup!.characters.join(" / ")}`
                : `${selectedRow!.script} · ${rowLabel}${practiceMode ? " · practice" : ""}`}
          </p>
          <KanaCard
            key={current.kana.id}
            kana={current.kana}
            mode={current.mode}
            direction={current.direction}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onGrade={handleGrade}
            onLearned={handleLearned}
            onSaveMnemonic={saveMnemonic}
            progressHint={
              current.mode !== "quiz"
                ? undefined
                : current.kana.progress?.mastered_at
                  ? "mastered — practice keeps it sharp"
                  : `streak ${current.kana.progress?.correct_streak ?? 0}/${MASTERY_STREAK} today · ${
                      current.kana.progress?.distinct_correct_days ?? 0
                    }/${MASTERY_MIN_DAYS} days confirmed`
            }
          />
        </>
      ) : testingAll ? (
        <div className="card rise" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
            <i className="ti ti-mood-empty" style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>Nothing left to test</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            Every mastered character just got demoted from misses — go rebuild a streak, then come back for another
            round.
          </p>
        </div>
      ) : showOverview ? (
        <KanaRowOverview characters={selectedRow!.characters} onStart={() => startRow(selectedRow!)} />
      ) : isGroupDrill ? (
        <div className="card rise" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
            <i className="ti ti-circle-check" style={{ color: "var(--teal-400)" }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>Nothing to drill here yet</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            Learn at least two of {selectedGroup!.characters.join(", ")} from their rows first, then come back.
          </p>
        </div>
      ) : (
        <div className="card rise" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
            <i className="ti ti-circle-check" style={{ color: "var(--teal-400)" }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>
            {selectedRow!.script} {rowLabel} mastered
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>
            Held a {MASTERY_STREAK}-in-a-row streak across {MASTERY_MIN_DAYS} different days. Pick another group to
            keep going, or drill this one again — getting one wrong here can still demote it.
          </p>
          <button onClick={() => startPractice(selectedRow!)}>
            <i className="ti ti-refresh" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
            Practice this row again
          </button>
        </div>
      )}
    </div>
  );
}
