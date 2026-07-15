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

Kana drill in `app/kana/page.tsx` works row by row (gojuon rows, e.g. あ-い-う-え-お), grouped by `sort_order` via `ROW_BOUNDS`, not per-script as a flat pool:

1. A new row starts with a **`KanaRowOverview`** — all its characters + romaji shown together, so the shared vowel pattern is visible before drilling. This state isn't persisted; it's derived (`isRowUnstarted`) from every character in the row having no progress row yet, plus a client-side `dismissedRow` flag so "start row" can move past it.
2. Within a row, characters are introduced one at a time in "learn" mode (character + romaji + mnemonic together, no guessing) — never quizzed cold.
3. Once every character in the row has been introduced, quizzing (guess → reveal → grade) cycles among that row's unmastered characters only.
4. Only once the whole row is mastered does the next row (by `sort_order`) begin.

Don't fold kana into the SM-2 `cards` flow or flatten this back to a per-script pool — the row grouping and the learn-before-quiz sequencing are both there deliberately (see conversation: kana mastery is front-loaded and testing recall on something never seen is just guessing).

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
