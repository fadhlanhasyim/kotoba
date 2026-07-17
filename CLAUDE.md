@AGENTS.md

# kotoba

A personal JLPT study app, starting with N5. Spaced-repetition flashcards + a progress dashboard today; grammar reference, reading, and listening practice planned next. See [README.md](README.md) for setup.

## Stack

- Next.js (App Router, TypeScript), no Tailwind — plain CSS with design tokens in `app/globals.css`
- Supabase (Postgres + Auth), accessed client-side via `lib/supabase.ts` with the anon key; access control is enforced by Postgres row-level security, not app code
- Auth is Google OAuth only (`supabase.auth.signInWithOAuth({ provider: "google" })`) — no passwords, no email/magic-link flow. Requires a Google OAuth client configured in Google Cloud Console and enabled under Supabase Authentication → Providers → Google; this is manual dashboard setup, not something in the repo.
- **Every page-level auth check goes through `lib/useSession.ts`'s `useSession()` hook — never call `supabase.auth.getSession()` directly in a page and redirect on the result.** A bare one-shot `getSession()` can resolve before a session finishes restoring from storage/URL on a cold load, incorrectly redirecting a signed-in user to `/login` — `NavBar` used to also listen to `onAuthStateChange` and self-correct a moment later while the page stayed stuck on `/login`, which is exactly the "navbar shows signed in, page shows sign-in" bug this hook fixes. Pattern in every page: `const { session, loading: authLoading } = useSession()`, then in the data-loading `useEffect`, `if (authLoading) return; if (!session) { router.replace("/login"); return; }`.

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

**Pronunciation audio** (`lib/tts.ts`) is browser TTS (`speechSynthesis`, `lang: "ja-JP"`) — no audio files, no hosting, no schema. `speakJapanese(character)` is wired into `KanaCard` (only after `showAnswer` — never before reveal, since hearing the correct sound would leak the answer) and into `KanaRowOverview`'s character tiles. Guard on `!romaji.startsWith("(")` before offering a speaker button — sokuon/chōon have no standalone sound to speak, that's exactly what the parenthetical romaji convention already flags. Real recorded audio is a possible future upgrade but a much bigger lift (sourcing/recording + hosting); don't reach for it unless browser TTS quality genuinely becomes a problem.

**Repeat-write drill** (`components/WritingCanvas.tsx`, wired into `KanaCard`'s learn mode only): recognition/recall drilling alone wasn't producing durable memory — there was no *production* step, no motor encoding, the thing handwriting-on-paper naturally provides. So the first time a character appears (`mode === "learn"`), instead of an immediate "Got it, next" button, the user must freehand-write the character `REQUIRED_WRITES` (5) times over a faint guide, tracked by local `writeCount` state — no stroke-order validation, no scoring, pure self-directed repetition (matches how everything else in this app is self-assessed).

**Learn mode's layout is deliberately compact** (small character+romaji+speaker header row instead of the quiz mode's stacked 96px hero): the user is mobile-first, and the whole point of learn mode is writing every rep — the canvas and "Next rep" button must fit on a phone screen without scrolling. The canvas's faint guide glyph already shows the character full-size, so a big intro display above it is redundant. Don't "unify" learn mode back onto quiz mode's hero layout.

Two follow-on gaps, both solved without a second progress-tracking mechanism:

- **Writing beyond the mandatory 5, or during quiz/recall at all**: `KanaCard` has a second, independent "Practice writing" toggle (`practiceWriting` state) — unlimited, optional, shown whenever `mode === "quiz"` or the mandatory reps are already done. It's just a free draw pad; it doesn't affect grading or `writeCount`.
- **Re-drilling a row already marked mastered**: `pickInRow`'s pool is active-only (excludes mastered), so a mastered row had no way back in. `pickPracticeCard` in `lib/kana.ts` is the fix — pool is every *introduced* character regardless of mastery (same idea `pickInGroup` already used for confusable pairs; `pickInGroup` now just delegates to it). Reached via a "Practice this row again" button on the row's mastered-completion panel, which sets `practiceMode` in `app/kana/page.tsx`; `advance()` branches on that flag to keep using the full pool while cycling through practice cards. A wrong answer during practice mode demotes the character via the normal `handleGrade` streak-reset — same as confusable-pair practice, no special-casing.

`WritingCanvas` resets between characters via the **parent keying `<KanaCard key={current.kana.id}>`**, not an internal effect — remounting is the idiomatic reset here, and an effect that calls `setState` synchronously is exactly what `react-hooks/set-state-in-effect` flags. The one place an effect-driven `setState` *is* correct and kept (with a targeted eslint-disable) is reading `window.devicePixelRatio` for canvas sharpness: it must default to `1` on first render and update post-mount, or the canvas's `width`/`height` attributes mismatch between server and client and React throws a hydration error — a lazy `useState` initializer does **not** fix this, since it still runs during the client's hydration-matching render, before the mismatch would even be caught.

`WritingCanvas` takes `maxSize` (default 320), not a fixed pixel size — the outer box is `width: min(${maxSize}px, 100%)` with `aspectRatio: 1/1`, so it fills available card width up to that cap instead of being a small fixed square. The guide glyph's font size is computed from `maxSize` directly (a static prop, hydration-safe) rather than a CSS `%`/`cqw` trick — simpler, and the realistic shrink range on narrow viewports is small enough that a fixed-for-maxSize glyph size with `overflow: hidden` on the wrapper is an acceptable tradeoff over exact proportional scaling.

**The optional "Practice writing" toggle remembers your last choice** (`localStorage` key `kotoba:writingPracticeDefault`, read/written in `KanaCard`) instead of defaulting closed on every card — same hydration-safety pattern as the `devicePixelRatio` effect above: default `false` to match server render, apply the remembered value post-mount via an effect (also lint-disabled for the same reason). Don't read `localStorage` directly in the initial render/lazy initializer — same mismatch risk as `window.devicePixelRatio`.

**Re-drilling a mastered row is also viewable as a static reference, separately from drilling it.** `KanaRowOverview` now takes `onStart` *or* `onClose` (both optional) — with `onStart` it's the original "new group" intro flow; with `onClose` it's a read-only "reference" mode (badge changes, footer becomes a "Close" button, no drill CTA). `app/kana/page.tsx`'s `showReference` state toggles this independently of `current`/`practiceMode`, reachable via a "View group" button next to "Back" whenever a row is open (learning or mastered) — this is what lets you pull the character+romaji grid back up any time to study the group as a whole, not just once on first visit.

## Learning path

`lib/learningPath.ts` computes three kana phases from `buildRows` (core hiragana = rows 0-9, core katakana = rows 0-9, extended kana = rows 10+ both scripts) plus a `recommend()` function that also takes whether vocab/Review has been started. This encodes a specific, deliberate pedagogical stance — captured here so it doesn't get re-litigated or drifted away from by accident:

- **Core hiragana and core katakana are sequential, not parallel** — several katakana shapes are near-identical to unrelated hiragana (へ/ヘ, り/リ), so learning both scripts for the same sound at the same time, while neither is secure, measurably increases mix-ups. `recommend()` won't suggest starting katakana until core hiragana crosses `CORE_READY_THRESHOLD` (80% mastered — deliberately not 100%; the multi-day mastery gate already keeps that number honest, waiting for the last stragglers adds no safety benefit).
- **Kana and vocab are not sequential** — once both core scripts cross the threshold, `recommend()` suggests starting Review even if extended kana (dakuten/yōon/sokuon/chōon) isn't finished. Those are modifications of already-known characters, not new shapes, and are lower-risk to fill in gradually alongside vocab; waiting for 100% kana before any vocab exposure was assessed as overly conservative with no real payoff, especially since vocab exposure reinforces the extended forms anyway.

`app/learning-path/page.tsx` is the UI for this — reachable from the Dashboard hero's "See full path" button — showing live phase completion, a highlighted "do this next" recommendation banner, and a Review phase computed the same way the Dashboard computes N5 progress (don't duplicate that query differently here; keep them consistent).

**The Dashboard hero is driven by the same `recommend()` engine, not a static N5 ring.** `app/page.tsx` loads full kana rows + progress, computes phases, and renders an "Up next" card: progress ring for the *current phase* (a 0% all-of-N5 ring on day one of kana is technically true but demotivating), the recommendation message, and one CTA to the right drill (`PHASE_META` in `components/DashboardView.tsx` maps phase id → title/CTA/href). Vocab-due status stays visible as a secondary "Also waiting" line (or folds into the CTA label when the recommendation *is* review). The presentational layer is deliberately extracted into `DashboardView` (props: metrics/phases/rec) so a temp `/preview` route can render the exact real markup with fixture data for browser verification — the live page needs auth. Keep data loading in the page and rendering in the view.

## Scheduling

`lib/srs.ts` implements a simplified SM-2: fixed learning steps for a card's first review, then ease-based intervals once it has graduated (`reps > 0`). Grades are `again | hard | good | easy`. Swap-in candidate later: FSRS, if SM-2's scheduling feels off in practice.

## Design system

"Warm paper & ink": light mode is warm off-white paper with cream cards; dark mode is deep warm ink. Coral is the single brand/accent color, teal is secondary/success. Tokens live in `app/globals.css` as CSS variables (`--accent`, `--surface-1`, `--surface-2`, `--text-secondary`, `--border`, `--shadow-{sm,md,lg}`, `--radius`, `--radius-lg`, `--radius-pill`, `--ease`) — reference those, never hardcode hex in components.

- Reusable classes in `globals.css`: `.card`, `.btn` / `.btn-primary`, `.badge` / `.badge-neutral`, `.jp` (Japanese display font), `.rise` (entrance animation). Prefer these over re-inlining.
- **`.btn` (shared with `button`) is `display: inline-flex`, deliberately** — it's routinely applied to a `<span>` inside a `next/link` `<Link>` (`<Link href="..."><span className="btn">...</span></Link>`), and a plain `inline` span's padding paints visually but doesn't count toward layout height. That mismatch made a `<Link>`'s own box report ~20px tall while its `.btn` span rendered ~39.5px, so wrapped rows in a `flexWrap: "wrap"` button row (e.g. the Dashboard hero CTAs) visually overlapped the next row once the buttons wrapped on mobile — same root cause affected NavBar's "Sign in" pill. Don't drop the `display` from this rule.
- **Japanese text uses `.jp`** — a rounded system Japanese font stack (Hiragino Maru Gothic etc., `--font-jp`). UI text uses Plus Jakarta Sans, self-hosted via `next/font` in `app/layout.tsx` (exposed as `--font-jakarta` / `--font-ui`). Don't reintroduce a Google Fonts `<link>` — `next/font` is the way, and the pages-router font-link lint rule fires otherwise.
- **Icons**: Tabler webfont, installed as the `@tabler/icons-webfont` npm dep and imported in `app/layout.tsx` (NOT from a CDN — the jsdelivr CDN gets ORB-blocked cross-origin). Usage: `<i className="ti ti-name" />`. Selectors in the dist CSS use single-colon `:before`.
- Mode-adaptive color tints: use `color-mix(in srgb, <color> N%, transparent)` for icon-chip/badge backgrounds so they work in both light and dark. Don't use the fixed light-ramp stops (`--coral-50`, `--teal-50`) as backgrounds in dark mode — they render as near-white blocks.
- Sentence case everywhere; font weights 400/500/600/700 (Jakarta is a variable font).
- Page loading states use `<LoadingState />` (`components/LoadingState.tsx`) — the breathing brand mark, centered — not a bare "Loading…" paragraph.
- `.segmented` (globals.css) is the pill segmented control (script filter on the kana page) — active option gets `.active` (accent-bg tint).
- **`button`/`.btn` is `display: inline-flex; align-items: center; justify-content: center`** (needed so `Link`-wrapped `.btn` spans size correctly). Consequence: any button laid out as a flex *column* card (KanaRowPicker's RowCard, ConfusableGroupPicker) must set `alignItems: "stretch"` inline or its children get horizontally centered.
- The kana picker groups rows into pedagogical sections (`SECTIONS` in `KanaRowPicker.tsx`: gojuon / dakuten / yōon / sokuon+chōon — a finer split of the learning path's core/extended ranges) and colors each character by its own progress (`charColor`: teal mastered, coral learning, ink untouched — shared with ConfusableGroupPicker). Keep row-level status *and* per-character state; a row card should be scannable without opening it.

## PWA

Installable, not offline-capable — this app is entirely Supabase-driven, so there's little value in real offline data access; the goal is just "add to home screen, feels native."

- `app/manifest.ts` — the Next.js manifest file convention (`MetadataRoute.Manifest`), auto-wired into `<head>` as `<link rel="manifest">`. No need to add that tag manually.
- `app/icons/{192,512,512-maskable}/route.tsx` — plain Route Handlers (not the special `icon.tsx`/`apple-icon.tsx` convention, which only wires into `<head>` `<link>` tags and can't be referenced elsewhere) returning `next/og`'s `ImageResponse`, so `manifest.ts` has stable URLs to point at. Each needs `export const dynamic = "force-static"` — without it they render dynamically on every request instead of being prerendered at build time; `export const runtime = "edge"` does **not** fix this in this Next version (see `AGENTS.md` — the caching/route-segment-config model changed in v16) and isn't needed here anyway, since the sibling `icon.tsx`/`apple-icon.tsx` files already prove `ImageResponse` works fine on the default runtime.
- The maskable icon (`512-maskable`) has **no border radius and no padding beyond the safe zone** — the OS applies its own crop shape (circle, squircle, ...), so content must survive being cropped to the center ~80%. The other two icons round their own corners since they're displayed as-is.
- `public/sw.js` + `components/ServiceWorkerRegister.tsx` — a deliberately minimal, network-first service worker (only exists to satisfy "Add to Home Screen" install criteria on browsers that require an active fetch handler). Don't build this out into a real offline cache — that's a bigger project this app doesn't need, given nearly everything requires a live Supabase connection anyway.
- `viewport` export (not `metadata.themeColor` — that field is deprecated in favor of a separate `viewport` export in this Next version) sets the theme color; `metadata.appleWebApp` covers the iOS-specific standalone-mode meta tags.

## Commands

```bash
npm run dev      # local dev server
npm run build     # production build + typecheck
npm run lint      # eslint
```

## Content sourcing

Seed data (`supabase/seed/seed_n5.sql`) is a small hand-picked starter batch. The plan is to replace it with a full N5 vocab/kanji set built from JMdict + KANJIDIC2 (open, CC BY-SA — requires attribution if this app is ever shared or sold), cross-referenced against a community N5 word list to assign `level_id`.
