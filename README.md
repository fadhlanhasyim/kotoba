# kotoba

A personal JLPT study app: spaced-repetition flashcards, a kana mastery drill, and a progress dashboard, built level-by-level starting with N5.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth) — shared content tables (`cards`, `levels`, `kana_characters`, ...) are level-tagged and separate from per-user tables (`user_card_progress`, `review_logs`, `user_kana_progress`, ...), so N4+ and multi-user support slot in later without a schema change.
- SM-2-style spaced repetition (`lib/srs.ts`) for vocab/kanji; a separate multi-day mastery gate for kana (`app/kana/page.tsx`)

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough). This step needs to be done by you in your own account — sign-ups can't be done on your behalf.
2. In the Supabase dashboard, open the **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_kana.sql`
   - `supabase/migrations/0003_kana_sort_order.sql`
   - `supabase/migrations/0004_kana_day_gate.sql`
   - `supabase/seed/seed_n5.sql`
   - `supabase/seed/seed_kana.sql`

   (Or, if you have the Supabase CLI linked to your project: `supabase db push`, then run the two seed files via `psql <connection-string> -f supabase/seed/...`.)
3. **Set up Google sign-in** (this app uses Google OAuth only — no passwords, no email links):
   - In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID (type: Web application).
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins: `http://localhost:3000` (add your production URL later too)
   - In the Supabase dashboard → **Authentication → Providers → Google**, enable it and paste the Client ID + Client Secret from Google Cloud Console.
4. In **Project settings → API**, copy the project URL and anon public key.
5. Copy `.env.local.example` to `.env.local` and fill in those two values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
6. In **Authentication → URL configuration**, make sure `http://localhost:3000` is an allowed redirect URL.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, then go to **review** to drill N5 vocab/kanji or **kana** to work through hiragana/katakana. The dashboard shows streak, cards due, accuracy, and N5 progress.

## Next steps

- Swap the starter seed for a full N5 vocab/kanji set (JMdict + KANJIDIC, cross-referenced against a community N5 list).
- Grammar reference, reading, and listening practice (see the shared content tables already in the schema).
- Mock test mode once enough content exists.
