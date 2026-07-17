import type { KanaCharacter, UserKanaProgress } from "@/lib/types";
import { buildRows } from "@/lib/kana";

// Rows 0-9 are the plain gojuon (46 characters) — the highest-leverage, must-learn-first set.
// Rows 10+ are dakuten/handakuten/yōon/sokuon/chōon: modifications of characters you already
// know by that point, not new shapes, so lower risk to pick up gradually rather than gating on.
const CORE_RANGE: [number, number] = [0, 9];
const EXTENDED_RANGE: [number, number] = [10, 27];

export interface PhaseStats {
  id: string;
  title: string;
  why: string;
  masteredCount: number;
  totalCount: number;
  pct: number;
}

function statsInRange(
  kana: KanaCharacter[],
  progress: Record<string, UserKanaProgress>,
  script: "hiragana" | "katakana",
  lo: number,
  hi: number
): { mastered: number; total: number } {
  const chars = buildRows(kana, progress, script)
    .filter((r) => r.rowIndex >= lo && r.rowIndex <= hi)
    .flatMap((r) => r.characters);
  return { mastered: chars.filter((c) => c.progress?.mastered_at).length, total: chars.length };
}

function toPhase(id: string, title: string, why: string, s: { mastered: number; total: number }): PhaseStats {
  return {
    id,
    title,
    why,
    masteredCount: s.mastered,
    totalCount: s.total,
    pct: s.total > 0 ? Math.round((s.mastered / s.total) * 100) : 0,
  };
}

export function computeKanaPhases(
  kana: KanaCharacter[],
  progress: Record<string, UserKanaProgress>
): PhaseStats[] {
  const coreHira = statsInRange(kana, progress, "hiragana", ...CORE_RANGE);
  const coreKata = statsInRange(kana, progress, "katakana", ...CORE_RANGE);
  const extHira = statsInRange(kana, progress, "hiragana", ...EXTENDED_RANGE);
  const extKata = statsInRange(kana, progress, "katakana", ...EXTENDED_RANGE);

  return [
    toPhase(
      "core-hiragana",
      "Core hiragana",
      "The 46 basic hiragana carry most native Japanese text — grammar, particles, verb endings. Master these first: it's the fastest path to real reading ability, and starting katakana at the same time risks mixing up look-alike shapes (へ/ヘ, り/リ) while neither is secure yet.",
      coreHira
    ),
    toPhase(
      "core-katakana",
      "Core katakana",
      "Once hiragana's shapes feel solid, katakana stops competing with it for the same fragile memory and is safe to start. Used less often day-to-day (loanwords, emphasis) but still essential.",
      coreKata
    ),
    toPhase(
      "extended-kana",
      "Extended kana",
      "Dakuten, handakuten, yōon, sokuon, chōon — these aren't new shapes, they're modifications of characters you already know (a voicing mark, a small glide, a doubling mark). Lower risk to fill in gradually, and fine to overlap with starting vocabulary rather than gating on 100% completion.",
      { mastered: extHira.mastered + extKata.mastered, total: extHira.total + extKata.total }
    ),
  ];
}

export interface Recommendation {
  phaseId: string;
  message: string;
}

const CORE_READY_THRESHOLD = 80; // "solid enough to move on," not "perfect" — the day-gate already keeps mastery honest

export function recommend(phases: PhaseStats[], vocabStarted: boolean): Recommendation {
  const [coreHira, coreKata, extended] = phases;

  if (coreHira.pct < CORE_READY_THRESHOLD) {
    return {
      phaseId: coreHira.id,
      message:
        "Focus on core hiragana before starting katakana in parallel. Learning two new scripts for the same sounds at once, while neither is secure, is the single biggest source of kana mix-ups.",
    };
  }
  if (coreKata.pct < CORE_READY_THRESHOLD) {
    return {
      phaseId: coreKata.id,
      message:
        "Core hiragana is solid — good time to start core katakana now. You can keep filling in hiragana's extended forms (dakuten, yōon, sokuon) alongside it; those are lower-risk to learn gradually.",
    };
  }
  if (!vocabStarted) {
    return {
      phaseId: "review",
      message:
        "Both core scripts are solid — that's the real prerequisite, not 100% of every kana form. This is a good time to start Review (vocab/kanji) too. Keep picking up extended kana gradually; seeing them inside real words often sticks better than drilling them in isolation anyway.",
    };
  }
  if (extended.pct < CORE_READY_THRESHOLD) {
    return {
      phaseId: "extended-kana",
      message:
        "You're progressing on both kana and vocab — keep going. No need to rush extended kana forms; they'll keep reinforcing naturally as you read more vocab.",
    };
  }
  return {
    phaseId: "review",
    message: "Your kana foundation is strong across the board. Keep the momentum going with Review.",
  };
}
