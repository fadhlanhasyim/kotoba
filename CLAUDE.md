@AGENTS.md

# kotoba

A personal JLPT study app, starting with N5. Spaced-repetition flashcards + a progress dashboard today; grammar reference, reading, and listening practice planned next. See [README.md](README.md) for setup.

## Stack

- Next.js (App Router, TypeScript), no Tailwind — plain CSS with design tokens in `app/globals.css`
- Supabase (Postgres + Auth), accessed client-side via `lib/supabase.ts` with the anon key; access control is enforced by Postgres row-level security, not app code
- Auth is Google OAuth only (`supabase.auth.signInWithOAuth({ provider: "google" })`) — no passwords, no email/magic-link flow. Requires a Google OAuth client configured in Google Cloud Console and enabled under Supabase Authentication → Providers → Google; this is manual dashboard setup, not something in the repo.

## Data model

Two categories of tables, defined in `supabase/migrations/0001_init.sql`:

- **Shared content** (`levels`, `cards`, `grammar_notes`, `readings`, `listening_clips`): level-tagged (N5/N4/...), publicly readable, the same rows for every user. Adding a new JLPT level means inserting rows, not changing schema or app code.
- **Per-user state** (`user_card_progress`, `review_logs`, `journal_entries`, `entitlements`): scoped by `user_id`, restricted by RLS policies (`auth.uid() = user_id`).

Keep this split. It's what lets multi-user support and paid levels (`entitlements`) get added later without restructuring.

`cards.type` is `'vocab' | 'kanji'` only (see the check constraint) — kana is deliberately not a `cards` row. It lives in its own tables (`kana_characters`, `user_kana_progress`, migrations `0002_kana.sql` / `0003_kana_sort_order.sql` / `0004_kana_day_gate.sql`) with a mastery model instead of spaced repetition, but it's still gated across time — see below. Don't fold kana into the SM-2 `cards` flow — it's a one-time front-loaded task, not something that needs years of spaced review like vocab does.

**Mastery requires two things, not one**: `correct_streak >= MASTERY_STREAK` (3, in-session confidence) AND `distinct_correct_days >= MASTERY_MIN_DAYS` (2, survives a gap) — both in `app/kana/page.tsx`. A same-session streak alone proves short-term recall, not memorization; a character can only be correctly answered once per calendar day toward the day count (`last_correct_date` guards this), so mastering everything in one sitting is structurally impossible no matter how well a session goes. A miss resets `correct_streak` to 0 but does not reset `distinct_correct_days` — days already earned stay earned. Don't collapse this back to a single streak check.

Kana is grouped into rows by `sort_order` via `ROW_BOUNDS` in `lib/kana.ts` — the row logic (`buildRows`, `getRow`, `pickInRow`, `rowStatus`, `isRowUnstarted`) lives there, shared between `app/kana/page.tsx` and `components/KanaRowPicker.tsx`, not duplicated.

`ROW_BOUNDS`/`ROW_LABELS` cover 28 rows, not just the 10 plain gojuon rows (あ-い-う-え-お, ...): rows 10-14 are dakuten/handakuten (が/ざ/だ/ば/ぱ — voiced modifications of ka/sa/ta/ha), 15-25 are yōon (きゃ/しゅ/ちょ... — base + small ya/yu/yo), 26 is sokuon (っ/ッ), 27 is chōon (ー, katakana-only — `buildRows` simply produces zero hiragana characters in that range and skips the row there, no special-casing needed). Mnemonics for these teach the *rule* (voicing, gliding, doubling, lengthening) rather than inventing a fresh shape-story per character, since these aren't new shapes — they're modifications of characters already learned in the plain gojuon rows. `romaji` for sokuon/chōon is a label like `"(sokuon)"`, not a real romaji token — fine since grading is self-reported (got it/missed it), not string-matched.

**Row selection is user-driven, not forced sequential.** `app/kana/page.tsx` shows a `KanaRowPicker` grid of every row (both scripts) with its status (mastered/learning/not started) — the user taps any row to open it, in any order. The picker highlights one row as "continue" (the first `learning` row, or first `new` row if none are in progress) as a suggestion, but that's a hint, not a gate. Don't reintroduce a forced "always resume the earliest incomplete row" flow — that was the previous design and was explicitly rejected as too restrictive.

Once a row is opened (`selectedRowKey`):

1. A brand-new row starts with a **`KanaRowOverview`** — all its characters + romaji shown together, so the shared vowel pattern is visible before drilling. Derived (`isRowUnstarted`), not persisted, plus a client-side `dismissedRow` flag so "start row" can move past it.
2. Characters are introduced one at a time in "learn" mode (character + romaji + mnemonic together, no guessing) — never quizzed cold. Learn mode always prompts with the character (that's the introduction) — direction only applies to quizzing.
3. Once every character in the row has been introduced, quizzing (guess → reveal → grade) cycles among that row's unmastered characters, and `pickInRow` also picks a random `direction` (`toRomaji` | `toKana`) per card — bidirectional recall (character→romaji *and* romaji→character) both count toward the same `correct_streak`/`distinct_correct_days`, deliberately not tracked as two separate mastery states per character. Don't split this into per-direction mastery tracking — it'd double the progress schema for a mostly-cosmetic distinction, since both directions are testing "do you know this character."
4. When the row is fully mastered, a completion panel offers to go back to the picker — it does not auto-advance to another row.

Don't fold kana into the SM-2 `cards` flow — the row grouping and the learn-before-quiz sequencing are there deliberately (kana mastery is front-loaded and testing recall on something never seen is just guessing).

**Confusable-pair drilling** (`CONFUSABLE_GROUPS` in `lib/kana.ts`, rendered by `ConfusableGroupPicker`, selected via `selectedGroupId` in `app/kana/page.tsx`): a static, hardcoded list of well-documented look-alike groups (ぬ/め, ね/れ/わ, シ/ツ, ソ/ン, etc. — shape confusion, not sound confusion), same "static linguistic fact" pattern as `ROW_BOUNDS`. The drill pool (`pickInGroup`) is every *introduced* member of the group **including already-mastered ones** — unlike `pickInRow`'s active-only pool. That's deliberate: getting a "mastered" character wrong against its look-alike here is a real signal it wasn't actually mastered, and grading it through the normal `handleGrade` path demotes it via the existing streak-reset, no separate mechanism needed. A group needs ≥2 introduced members to be drillable (`confusableGroupStatus` returns `"locked"` otherwise) — discrimination practice is meaningless with only one side learned. Don't build a separate progress-tracking table for this; it reuses `user_kana_progress` entirely.

**Quiz selection is weighted, not uniform** — `pickWeighted` in `lib/kana.ts` (used by `pickQuizCard`, which both `pickInRow` and `pickInGroup` funnel through) samples with weight `1 / (correct_streak + 1)`. A just-missed or never-quizzed character (streak 0) is ~3x more likely to come up than one on a streak of 2, without ever fully excluding confident ones — occasional review of those still matters for pushing them across the day-gate. This is a pure probability change with no rendering difference, so don't expect to verify it by screenshot; verify by simulating `pickWeighted` over many trials and checking the resulting ratios (see git history for the exact check used).

## Scheduling

`lib/srs.ts` implements a simplified SM-2: fixed learning steps for a card's first review, then ease-based intervals once it has graduated (`reps > 0`). Grades are `again | hard | good | easy`. Swap-in candidate later: FSRS, if SM-2's scheduling feels off in practice.

## Design system

"Warm paper & ink": light mode is warm off-white paper with cream cards; dark mode is deep warm ink. Coral is the single brand/accent color, teal is secondary/success. Tokens live in `app/globals.css` as CSS variables (`--accent`, `--surface-1`, `--surface-2`, `--text-secondary`, `--border`, `--shadow-{sm,md,lg}`, `--radius`, `--radius-lg`, `--radius-pill`, `--ease`) — reference those, never hardcode hex in components.

- Reusable classes in `globals.css`: `.card`, `.btn` / `.btn-primary`, `.badge` / `.badge-neutral`, `.jp` (Japanese display font), `.rise` (entrance animation). Prefer these over re-inlining.
- **Japanese text uses `.jp`** — a rounded system Japanese font stack (Hiragino Maru Gothic etc., `--font-jp`). UI text uses Plus Jakarta Sans, self-hosted via `next/font` in `app/layout.tsx` (exposed as `--font-jakarta` / `--font-ui`). Don't reintroduce a Google Fonts `<link>` — `next/font` is the way, and the pages-router font-link lint rule fires otherwise.
- **Icons**: Tabler webfont, installed as the `@tabler/icons-webfont` npm dep and imported in `app/layout.tsx` (NOT from a CDN — the jsdelivr CDN gets ORB-blocked cross-origin). Usage: `<i className="ti ti-name" />`. Selectors in the dist CSS use single-colon `:before`.
- Mode-adaptive color tints: use `color-mix(in srgb, <color> N%, transparent)` for icon-chip/badge backgrounds so they work in both light and dark. Don't use the fixed light-ramp stops (`--coral-50`, `--teal-50`) as backgrounds in dark mode — they render as near-white blocks.
- Sentence case everywhere; font weights 400/500/600/700 (Jakarta is a variable font).

## Commands

```bash
npm run dev      # local dev server
npm run build     # production build + typecheck
npm run lint      # eslint
```

## Content sourcing

Seed data (`supabase/seed/seed_n5.sql`) is a small hand-picked starter batch. The plan is to replace it with a full N5 vocab/kanji set built from JMdict + KANJIDIC2 (open, CC BY-SA — requires attribution if this app is ever shared or sold), cross-referenced against a community N5 word list to assign `level_id`.
