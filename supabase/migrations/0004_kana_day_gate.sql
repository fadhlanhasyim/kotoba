-- A same-session streak proves short-term recall, not memorization — getting
-- something right 3 times in a row right after seeing its mnemonic doesn't mean
-- it survives overnight. Mastery now also requires correct answers on at least
-- two distinct calendar days, so nothing can be "mastered" in a single sitting.

alter table user_kana_progress add column if not exists distinct_correct_days integer not null default 0;
alter table user_kana_progress add column if not exists last_correct_date date;

-- Anything mastered under the old same-session-only rule hasn't actually proven
-- multi-day retention — reset it so it re-earns mastery under the stricter rule.
update user_kana_progress set mastered_at = null where mastered_at is not null;
