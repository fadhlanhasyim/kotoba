# kotoba

A personal JLPT study app: spaced-repetition flashcards, a progress dashboard, and (later) grammar/reading/listening practice, built level-by-level starting with N5.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth) — shared content tables (`cards`, `levels`, ...) are level-tagged and separate from per-user tables (`user_card_progress`, `review_logs`, ...), so N4+ and multi-user support slot in later without a schema change.
- SM-2-style spaced repetition (`lib/srs.ts`)

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough). This step needs to be done by you in your own account — sign-ups can't be done on your behalf.
2. In the Supabase dashboard, open the **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql` — creates all tables and row-level security policies
   - `supabase/seed/seed_n5.sql` — inserts JLPT levels and a starter batch of N5 vocab/kanji cards
3. In **Project settings → API**, copy the project URL and anon public key.
4. Copy `.env.local.example` to `.env.local` and fill in those two values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. In **Authentication → URL configuration**, make sure `http://localhost:3000` is an allowed redirect URL so magic-link sign-in works locally.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with your email (you'll get a magic link — no password), then go to **review** to start studying. The dashboard shows streak, cards due, accuracy, and N5 progress.

## Next steps

- Swap the starter seed for a full N5 vocab/kanji set (JMdict + KANJIDIC, cross-referenced against a community N5 list).
- Grammar reference, reading, and listening practice (see the shared content tables already in the schema).
- Mock test mode once enough content exists.
