-- Personal mnemonic overrides. Self-generated mnemonics reliably beat provided
-- ones, so any kana's mnemonic can be replaced with the user's own wording.
-- Separate table rather than a column on user_kana_progress: a note isn't
-- progress, and can exist for a character that has never been drilled.

create table user_kana_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kana_id uuid not null references kana_characters(id) on delete cascade,
  mnemonic text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, kana_id)
);
create index user_kana_notes_user_idx on user_kana_notes(user_id);

alter table user_kana_notes enable row level security;

create policy "users manage their own kana notes" on user_kana_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
