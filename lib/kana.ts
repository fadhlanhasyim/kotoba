import type { DrillKana, KanaCharacter, UserKanaProgress } from "@/lib/types";

export const MASTERY_STREAK = 3;
export const MASTERY_MIN_DAYS = 2; // must be correct on at least this many distinct days, not just in one sitting

// Below this many mastered characters, a "mixed recall" test wouldn't be meaningfully
// broader than just re-drilling a single row — not worth surfacing yet.
export const MIN_MASTERED_RECALL = 10;

export type Script = "hiragana" | "katakana";
export type ScriptFilter = Script | "both";

export interface KanaRow {
  key: string;
  script: Script;
  rowIndex: number;
  characters: DrillKana[];
}

export type QuizDirection = "toRomaji" | "toKana";

export interface PickedCard {
  mode: "learn" | "quiz";
  kana: DrillKana;
  direction?: QuizDirection;
}

// Rows by sort_order range (1-based, inclusive). 0-9: plain gojuon.
// 10-14: dakuten/handakuten (voiced modifications of ka/sa/ta/ha rows).
// 15-25: yōon (base + small ya/yu/yo glides). 26: sokuon (っ/ッ). 27: chōon (ー, katakana only —
// hiragana simply has zero characters in that range, so buildRows skips it there).
const ROW_BOUNDS: [number, number][] = [
  [1, 5], [6, 10], [11, 15], [16, 20], [21, 25],
  [26, 30], [31, 35], [36, 38], [39, 43], [44, 46],
  [47, 51], [52, 56], [57, 61], [62, 66], [67, 71],
  [72, 74], [75, 77], [78, 80], [81, 83], [84, 86],
  [87, 89], [90, 92], [93, 95], [96, 98], [99, 101],
  [102, 104], [105, 105], [106, 106],
];
export const ROW_LABELS = [
  "a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa",
  "ga", "za", "da", "ba", "pa",
  "kya", "sha", "cha", "nya", "hya", "mya", "rya", "gya", "ja", "bya", "pya",
  "sokuon", "chōon",
];

export function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function rowCharacters(
  kana: KanaCharacter[],
  progress: Record<string, UserKanaProgress>,
  script: Script,
  rowIndex: number
): DrillKana[] {
  const [lo, hi] = ROW_BOUNDS[rowIndex];
  return kana
    .filter((k) => k.script === script && k.sort_order >= lo && k.sort_order <= hi)
    .map((k) => ({ ...k, progress: progress[k.id] ?? null }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function buildRows(
  kana: KanaCharacter[],
  progress: Record<string, UserKanaProgress>,
  script: ScriptFilter
): KanaRow[] {
  const scripts: Script[] = script === "both" ? ["hiragana", "katakana"] : [script];
  const rows: KanaRow[] = [];
  for (const s of scripts) {
    for (let r = 0; r < ROW_BOUNDS.length; r++) {
      const characters = rowCharacters(kana, progress, s, r);
      if (characters.length > 0) rows.push({ key: `${s}-${r}`, script: s, rowIndex: r, characters });
    }
  }
  return rows;
}

export function getRow(
  kana: KanaCharacter[],
  progress: Record<string, UserKanaProgress>,
  key: string
): KanaRow | null {
  const [s, idx] = key.split("-");
  const rowIndex = Number(idx);
  const characters = rowCharacters(kana, progress, s as Script, rowIndex);
  if (characters.length === 0) return null;
  return { key, script: s as Script, rowIndex, characters };
}

export function isRowUnstarted(row: KanaRow): boolean {
  return row.characters.every((c) => !c.progress);
}

export function rowStatus(row: KanaRow): "mastered" | "learning" | "new" {
  if (row.characters.every((c) => c.progress?.mastered_at)) return "mastered";
  if (row.characters.some((c) => c.progress)) return "learning";
  return "new";
}

// Weight inversely by streak: a just-missed/never-quizzed character (streak 0) is 3x more
// likely to come up than one on a streak of 2, without ever fully excluding confident ones —
// occasional review of those still matters for pushing them toward the day-gate.
function pickWeighted(options: DrillKana[]): DrillKana {
  const weights = options.map((c) => 1 / ((c.progress?.correct_streak ?? 0) + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

function pickQuizCard(pool: DrillKana[], excludeId: string | null): PickedCard | null {
  if (pool.length === 0) return null;
  const options = pool.length > 1 ? pool.filter((c) => c.id !== excludeId) : pool;
  const kana = pickWeighted(options);
  const direction: QuizDirection = Math.random() < 0.5 ? "toRomaji" : "toKana";
  return { mode: "quiz", kana, direction };
}

export function pickInRow(row: KanaRow, excludeId: string | null): PickedCard | null {
  const notIntroduced = row.characters.filter((c) => !c.progress);
  if (notIntroduced.length > 0) {
    const next = [...notIntroduced].sort((a, b) => a.sort_order - b.sort_order)[0];
    return { mode: "learn", kana: next };
  }
  const active = row.characters.filter((c) => c.progress && !c.progress.mastered_at);
  return pickQuizCard(active, excludeId);
}

// For deliberately re-drilling something already mastered — includes mastered members too,
// unlike pickInRow's active-only pool. Getting one wrong here is a genuine signal it should be
// demoted, which handleGrade already does via the normal streak reset; no separate tracking.
export function pickPracticeCard(characters: DrillKana[], excludeId: string | null): PickedCard | null {
  const introduced = characters.filter((c) => c.progress);
  return pickQuizCard(introduced, excludeId);
}

// Well-documented look-alike groups — shape confusion, not sound confusion.
// Deliberately static (linguistic fact, not user data), same pattern as ROW_BOUNDS above.
export interface ConfusableGroup {
  id: string;
  script: Script;
  characters: string[];
}

export const CONFUSABLE_GROUPS: ConfusableGroup[] = [
  { id: "nu-me", script: "hiragana", characters: ["ぬ", "め"] },
  { id: "ne-re-wa", script: "hiragana", characters: ["ね", "れ", "わ"] },
  { id: "ru-ro", script: "hiragana", characters: ["る", "ろ"] },
  { id: "ha-ho", script: "hiragana", characters: ["は", "ほ"] },
  { id: "ki-sa", script: "hiragana", characters: ["き", "さ"] },
  { id: "tsu-sokuon-hira", script: "hiragana", characters: ["つ", "っ"] },
  { id: "shi-tsu", script: "katakana", characters: ["シ", "ツ"] },
  { id: "so-n", script: "katakana", characters: ["ソ", "ン"] },
  { id: "u-wa", script: "katakana", characters: ["ウ", "ワ"] },
  { id: "na-me", script: "katakana", characters: ["ナ", "メ"] },
  { id: "ku-ke", script: "katakana", characters: ["ク", "ケ"] },
  { id: "ra-wa", script: "katakana", characters: ["ラ", "ワ"] },
  { id: "tsu-sokuon-kata", script: "katakana", characters: ["ツ", "ッ"] },
];

export function groupCharacters(
  kana: KanaCharacter[],
  progress: Record<string, UserKanaProgress>,
  group: ConfusableGroup
): DrillKana[] {
  return group.characters
    .map((ch) => kana.find((k) => k.script === group.script && k.character === ch))
    .filter((k): k is KanaCharacter => !!k)
    .map((k) => ({ ...k, progress: progress[k.id] ?? null }));
}

export function confusableGroupStatus(members: DrillKana[]): "locked" | "ready" | "mastered" {
  const introduced = members.filter((c) => c.progress);
  if (introduced.length < 2) return "locked";
  if (introduced.every((c) => c.progress?.mastered_at)) return "mastered";
  return "ready";
}

export function pickInGroup(members: DrillKana[], excludeId: string | null): PickedCard | null {
  return pickPracticeCard(members, excludeId);
}

// Broad recall test: pool is every mastered character across whatever scope the caller
// passes in (e.g. all rows under the current script filter) — not scoped to one row or
// group. A miss demotes the character via the normal handleGrade streak-reset, same as
// row-practice and confusable-pair drilling; no separate tracking needed.
export function pickMasteredRecall(pool: DrillKana[], excludeId: string | null): PickedCard | null {
  const mastered = pool.filter((c) => c.progress?.mastered_at);
  return pickQuizCard(mastered, excludeId);
}
