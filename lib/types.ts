export interface Level {
  id: string;
  code: string;
  name: string;
}

export interface Card {
  id: string;
  level_id: string;
  type: "vocab" | "kanji";
  term: string;
  reading: string | null;
  meaning: string;
  example_sentence: string | null;
}

export interface UserCardProgress {
  id: string;
  user_id: string;
  card_id: string;
  due_at: string;
  interval_days: number;
  ease: number;
  reps: number;
  last_reviewed_at: string | null;
}

export type DueCard = Card & { progress: UserCardProgress | null };

export interface KanaCharacter {
  id: string;
  script: "hiragana" | "katakana";
  character: string;
  romaji: string;
  mnemonic: string;
  sort_order: number;
  /** Attached client-side from user_kana_notes — NOT a kana_characters column. */
  custom_mnemonic?: string | null;
}

export interface UserKanaNote {
  id: string;
  user_id: string;
  kana_id: string;
  mnemonic: string;
  updated_at: string;
}

export interface UserKanaProgress {
  id: string;
  user_id: string;
  kana_id: string;
  correct_streak: number;
  mastered_at: string | null;
  last_seen_at: string | null;
  distinct_correct_days: number;
  last_correct_date: string | null;
}

export type DrillKana = KanaCharacter & { progress: UserKanaProgress | null };
