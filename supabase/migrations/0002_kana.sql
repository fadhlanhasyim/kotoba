-- Kana are learned once and mastered, not scheduled for long-term spaced
-- repetition like vocab/kanji cards. Separate tables, separate mastery model:
-- a correct streak per character, no due_at.

create table kana_characters (
  id uuid primary key default gen_random_uuid(),
  script text not null check (script in ('hiragana', 'katakana')),
  character text not null,
  romaji text not null,
  mnemonic text not null,
  unique (script, character)
);

create table user_kana_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kana_id uuid not null references kana_characters(id) on delete cascade,
  correct_streak integer not null default 0,
  mastered_at timestamptz,
  last_seen_at timestamptz,
  unique (user_id, kana_id)
);
create index user_kana_progress_user_idx on user_kana_progress(user_id);

alter table kana_characters enable row level security;
alter table user_kana_progress enable row level security;

create policy "kana_characters are readable by anyone" on kana_characters
  for select using (true);

create policy "users manage their own kana progress" on user_kana_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
