-- Kotoba schema: shared content tables + per-user progress tables.
-- Content tables are level-tagged so N4+ slots in later without a schema change.

create extension if not exists "pgcrypto";

create table levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,        -- 'N5', 'N4', ...
  name text not null
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id),
  type text not null check (type in ('vocab', 'kanji')),
  term text not null,
  reading text,
  meaning text not null,
  example_sentence text,
  created_at timestamptz not null default now(),
  unique (level_id, type, term)
);
create index cards_level_id_idx on cards(level_id);

create table grammar_notes (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id),
  title text not null,
  body text not null,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create table readings (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id),
  title text not null,
  body text not null,
  audio_url text,
  created_at timestamptz not null default now()
);

create table listening_clips (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id),
  title text not null,
  audio_url text not null,
  transcript text not null,
  created_at timestamptz not null default now()
);

-- Per-user tables

create table user_card_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  due_at timestamptz not null default now(),
  interval_days numeric not null default 0,
  ease numeric not null default 2.5,
  reps integer not null default 0,
  last_reviewed_at timestamptz,
  unique (user_id, card_id)
);
create index user_card_progress_due_idx on user_card_progress(user_id, due_at);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

create table review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  reviewed_at timestamptz not null default now()
);
create index review_logs_user_reviewed_idx on review_logs(user_id, reviewed_at);

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id uuid not null references levels(id),
  granted_at timestamptz not null default now(),
  unique (user_id, level_id)
);

-- Row level security: shared content is publicly readable,
-- per-user tables are restricted to their owner.

alter table levels enable row level security;
alter table cards enable row level security;
alter table grammar_notes enable row level security;
alter table readings enable row level security;
alter table listening_clips enable row level security;
alter table user_card_progress enable row level security;
alter table journal_entries enable row level security;
alter table review_logs enable row level security;
alter table entitlements enable row level security;

create policy "levels are readable by anyone" on levels for select using (true);
create policy "cards are readable by anyone" on cards for select using (true);
create policy "grammar_notes are readable by anyone" on grammar_notes for select using (true);
create policy "readings are readable by anyone" on readings for select using (true);
create policy "listening_clips are readable by anyone" on listening_clips for select using (true);

create policy "users manage their own progress" on user_card_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own journal entries" on journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own review logs" on review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users read their own entitlements" on entitlements
  for select using (auth.uid() = user_id);
