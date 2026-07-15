-- Starter content: JLPT levels + a small batch of N5 vocab/kanji cards.
-- Enough to exercise the review flow locally. Swap for a full JMdict/KANJIDIC
-- import (tagged against a community N5 word list) once the app itself works.

insert into levels (code, name) values
  ('N5', 'JLPT N5'),
  ('N4', 'JLPT N4'),
  ('N3', 'JLPT N3'),
  ('N2', 'JLPT N2'),
  ('N1', 'JLPT N1')
on conflict (code) do nothing;

with n5 as (select id from levels where code = 'N5')
insert into cards (level_id, type, term, reading, meaning, example_sentence)
select n5.id, v.type, v.term, v.reading, v.meaning, v.example_sentence
from n5, (values
  ('vocab', '食べる', 'たべる', 'to eat', 'ご飯を食べる。'),
  ('vocab', '飲む', 'のむ', 'to drink', '水を飲む。'),
  ('vocab', '行く', 'いく', 'to go', '学校に行く。'),
  ('vocab', '来る', 'くる', 'to come', '友達が来る。'),
  ('vocab', '見る', 'みる', 'to see, to watch', 'テレビを見る。'),
  ('vocab', '聞く', 'きく', 'to listen, to ask', '音楽を聞く。'),
  ('vocab', '話す', 'はなす', 'to speak', '日本語を話す。'),
  ('vocab', '読む', 'よむ', 'to read', '本を読む。'),
  ('vocab', '書く', 'かく', 'to write', '名前を書く。'),
  ('vocab', '買う', 'かう', 'to buy', 'パンを買う。'),
  ('vocab', '学校', 'がっこう', 'school', '学校は九時に始まる。'),
  ('vocab', '先生', 'せんせい', 'teacher', '田中先生は親切だ。'),
  ('vocab', '友達', 'ともだち', 'friend', '友達と遊ぶ。'),
  ('vocab', '会社', 'かいしゃ', 'company', '父は会社で働く。'),
  ('vocab', '時間', 'じかん', 'time', '時間がない。'),
  ('vocab', '今日', 'きょう', 'today', '今日は晴れだ。'),
  ('vocab', '明日', 'あした', 'tomorrow', '明日は休みだ。'),
  ('vocab', '大きい', 'おおきい', 'big', 'この家は大きい。'),
  ('vocab', '小さい', 'ちいさい', 'small', '小さい犬がいる。'),
  ('vocab', '美味しい', 'おいしい', 'delicious', 'このケーキは美味しい。'),
  ('kanji', '日', 'にち・ひ', 'day, sun', '日曜日'),
  ('kanji', '月', 'げつ・つき', 'month, moon', '月曜日'),
  ('kanji', '火', 'か・ひ', 'fire', '火曜日'),
  ('kanji', '水', 'すい・みず', 'water', '水曜日'),
  ('kanji', '木', 'もく・き', 'tree, wood', '木曜日'),
  ('kanji', '金', 'きん・かね', 'gold, money', '金曜日'),
  ('kanji', '土', 'ど・つち', 'soil, earth', '土曜日'),
  ('kanji', '人', 'じん・ひと', 'person', '日本人'),
  ('kanji', '大', 'たい・おお', 'big', '大学'),
  ('kanji', '小', 'しょう・こ', 'small', '小学校')
) as v(type, term, reading, meaning, example_sentence)
on conflict (level_id, type, term) do nothing;
