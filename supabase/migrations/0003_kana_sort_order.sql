-- Introduce new kana in gojuon row order (a-i-u-e-o, ka-ki-ku-ke-ko, ...) rather
-- than randomly — each row reuses the same vowel pattern, so learning row-by-row
-- is the standard, lower-effort approach. sort_order encodes that sequence.

alter table kana_characters add column if not exists sort_order integer not null default 0;

update kana_characters k
set sort_order = v.sort_order
from (values
  ('hiragana', 'あ', 1), ('hiragana', 'い', 2), ('hiragana', 'う', 3), ('hiragana', 'え', 4), ('hiragana', 'お', 5),
  ('hiragana', 'か', 6), ('hiragana', 'き', 7), ('hiragana', 'く', 8), ('hiragana', 'け', 9), ('hiragana', 'こ', 10),
  ('hiragana', 'さ', 11), ('hiragana', 'し', 12), ('hiragana', 'す', 13), ('hiragana', 'せ', 14), ('hiragana', 'そ', 15),
  ('hiragana', 'た', 16), ('hiragana', 'ち', 17), ('hiragana', 'つ', 18), ('hiragana', 'て', 19), ('hiragana', 'と', 20),
  ('hiragana', 'な', 21), ('hiragana', 'に', 22), ('hiragana', 'ぬ', 23), ('hiragana', 'ね', 24), ('hiragana', 'の', 25),
  ('hiragana', 'は', 26), ('hiragana', 'ひ', 27), ('hiragana', 'ふ', 28), ('hiragana', 'へ', 29), ('hiragana', 'ほ', 30),
  ('hiragana', 'ま', 31), ('hiragana', 'み', 32), ('hiragana', 'む', 33), ('hiragana', 'め', 34), ('hiragana', 'も', 35),
  ('hiragana', 'や', 36), ('hiragana', 'ゆ', 37), ('hiragana', 'よ', 38),
  ('hiragana', 'ら', 39), ('hiragana', 'り', 40), ('hiragana', 'る', 41), ('hiragana', 'れ', 42), ('hiragana', 'ろ', 43),
  ('hiragana', 'わ', 44), ('hiragana', 'を', 45), ('hiragana', 'ん', 46),

  ('katakana', 'ア', 1), ('katakana', 'イ', 2), ('katakana', 'ウ', 3), ('katakana', 'エ', 4), ('katakana', 'オ', 5),
  ('katakana', 'カ', 6), ('katakana', 'キ', 7), ('katakana', 'ク', 8), ('katakana', 'ケ', 9), ('katakana', 'コ', 10),
  ('katakana', 'サ', 11), ('katakana', 'シ', 12), ('katakana', 'ス', 13), ('katakana', 'セ', 14), ('katakana', 'ソ', 15),
  ('katakana', 'タ', 16), ('katakana', 'チ', 17), ('katakana', 'ツ', 18), ('katakana', 'テ', 19), ('katakana', 'ト', 20),
  ('katakana', 'ナ', 21), ('katakana', 'ニ', 22), ('katakana', 'ヌ', 23), ('katakana', 'ネ', 24), ('katakana', 'ノ', 25),
  ('katakana', 'ハ', 26), ('katakana', 'ヒ', 27), ('katakana', 'フ', 28), ('katakana', 'ヘ', 29), ('katakana', 'ホ', 30),
  ('katakana', 'マ', 31), ('katakana', 'ミ', 32), ('katakana', 'ム', 33), ('katakana', 'メ', 34), ('katakana', 'モ', 35),
  ('katakana', 'ヤ', 36), ('katakana', 'ユ', 37), ('katakana', 'ヨ', 38),
  ('katakana', 'ラ', 39), ('katakana', 'リ', 40), ('katakana', 'ル', 41), ('katakana', 'レ', 42), ('katakana', 'ロ', 43),
  ('katakana', 'ワ', 44), ('katakana', 'ヲ', 45), ('katakana', 'ン', 46)
) as v(script, character, sort_order)
where k.script = v.script and k.character = v.character;
