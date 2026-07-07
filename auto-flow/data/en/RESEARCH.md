# Исследование: источники английских текстов для корпуса FlowTyping

Цель — собрать лёгкие, разговорные и мотивирующие тексты для англоязычных drill'ов: отдельные слова, короткие предложения, цитаты, шутки, статусы и т.д.

## 1. Общие критерии отбора для проекта

В `CONTEXT.md` drill — это одно слово или одно законченное предложение. Конвейер в `auto-flow/corpus/` очищает текст, нарезает на слова/предложения, фильтрует по набору символов раскладки и считает мету. Поэтому хороший источник для нас:

- **Короткий**: 1–2 предложения, желательно до 120 символов.
- **Чистый**: минимум HTML, ссылок, хэштегов, markdown, emoji, матов.
- **Лицензионно безопасный**: CC0 / Public Domain / CC-BY / MIT лучше всего; нужна атрибуция — терпимо; сомнительная лицензия — избегаем.
- **Layout-совместимый**: ASCII + базовая пунктуация, без специфических символов.
- **Разнообразный**: хорошо иметь сегменты по сложности/теме.

## 2. Готовые датасеты и корпуса

### 2.1. Короткие предложения для начинающих

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[Tatoeba](https://tatoeba.org/eng/downloads)** | Краудсорсинговые предложения на множестве языков. Идеально для «чистых и простых» фраз. | ~10M предложений; `sentences.csv`, `links.csv` | CC-BY 2.0 FR / CC-BY-SA | `wget https://downloads.tatoeba.org/exports/sentences.tar.bz2` | Распаковать CSV, отфильтровать `lang = 'eng'`, убрать дубликаты, нарезать на предложения |
| **[ManyThings Anki / Tatoeba pairs](https://www.manythings.org/anki/)** | Готовые пары предложений eng↔lang, часто короткие и учебные | `.txt`/`.zip`, tab-delimited | CC-BY Tatoeba | `wget https://www.manythings.org/anki/eng-rus.zip` | Взять первую колонку (англ.) |
| **[Mozilla Common Voice sentences](https://github.com/common-voice/cv-dataset)** | Предложения для озвучивания; короткие, часто public domain | `.tsv` per locale | CC0 для большинства | Скачать с HuggingFace `mozilla-foundation/common_voice_17_0` или sentence-collector | Взять колонку `sentence`, отфильтровать по длине |
| **[Harvard Sentences](https://www.transgendermap.com/guidance/social/voice/feminization/harvard-sentences/)** | 720 фонетически сбалансированных предложений | PDF / множество plain-text зеркал | Public Domain | Найти plain-text (например, `harvard_sentences.txt`) | Разбить по нумерации, убрать пустые строки |

### 2.2. Простые выражения, разговорные фразы, диалоги

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[English Sentences / ManyThings](https://www.manythings.org/sentences/)** | Готовые учебные предложения по грамматике и темам | Тысячи предложений по категориям | Свободное использование для образовательных целей | `curl` страниц или скачать `.txt` | HTML→text, разбить на строки |
| **[OpenSubtitles через OPUS](https://opus.nlpl.eu/OpenSubtitles-v2018.php)** | Субтитры фильмов/сериалов — естественные диалоги, разговорные фразы | ~3B токенов, `.tmx`/`.xml`/Moses | Разная, в основном некоммерческая / исследовательская | `wget` с opus.nlpl.eu | Извлечь английские сегменты, убрать таймкоды, сплит по `\n`, фильтр длины |
| **[TED Talks transcripts](https://www.kaggle.com/datasets/db189ab19e7dfeda/ted-talks-transcripts-parallel-corpus)** | Расшифровки TED-выступлений, современный разговорный английский | ~300k предложений | CC BY-NC-ND 4.0 | Kaggle API | TSV/CSV, взять `transcript`, sentence-split |

### 2.3. Идиомы, фразовые глаголы, устойчивые выражения

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[englishidioms PyPI](https://pypi.org/project/englishidioms/)** | 22 209 идиом/фразовых глаголов с идентификацией | Python package | Уточнить в репозитории | `pip install englishidioms` | Использовать API пакета для извлечения списка |
| **[baiango/english_idioms](https://github.com/baiango/english_idioms)** | 500+ идиом в CSV | CSV | MIT-like / собрано вручную | `wget https://raw.githubusercontent.com/baiango/english_idioms/main/english_idioms.csv` | `csv` → `text` |
| **[Kaggle: English Idioms from URL to CSV](https://www.kaggle.com/code/sohaelshafey/english-idioms-from-url-to-csv)** | Парсинг сайтов с идиомами | ~3k+ | CC0 / CC-BY | Kaggle API / notebook | Запустить notebook или переписать парсер |
| **[English Phrasal Verbs JSON](https://github.com/WithEnglishWeCan/generated-english-phrasal-verbs)** | Сгенерированный список phrasal verbs | JSON | Уточнить | `raw.githubusercontent.com` | JSON → список |

### 2.4. Цитаты из литературы, фильмов, известных людей

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[Wikiquote dump](https://dumps.wikimedia.org/enwikiquote/)** | Цитаты из фильмов, книг, исторических фигур | ~100MB bz2 XML | CC-BY-SA 3.0 | `wget https://dumps.wikimedia.org/enwikiquote/latest/enwikiquote-latest-pages-articles.xml.bz2` | [wikiquote-parser](https://github.com/heyseth/wikiquote-parser) или свой SAX-парсер |
| **[Kaggle Quotes Dataset JSON](https://www.kaggle.com/datasets/mayankkathane/quotes-dataset-json)** | 100k+ цитат с авторами/тегами | JSON, 117MB | MIT | Kaggle API | `json.load`, взять `quote` |
| **[GitHub: Database-Quotes-JSON](https://github.com/JamesFT/Database-Quotes-JSON)** | 5000+ известных цитат | JSON | MIT / public | `raw.githubusercontent.com` | JSON → `quote` |
| **[Kaggle: Movie Quotes Dataset](https://www.kaggle.com/datasets/preprocessiing/movie-quotes-dataset)** | Цитаты из фильмов | JSON/CSV | Уточнить | Kaggle API | JSON → `quote` |
| **[Goodreads Popular Quotes Crawler](https://github.com/0xpranay/Goodreads-Crawler)** | Scrapy-паук для goodreads.com/quotes | Зависит от страниц | Парсинг сайта — серый юридический | `git clone`, `scrapy crawl goodreads` | CSS-селекторы `.quoteText` |

### 2.5. Шутки, лёгкий юмор, короткие мысли

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[Kaggle: 100500+ Reddit Jokes](https://www.kaggle.com/datasets/averkij/reddit-jokes-dataset)** | Шутки с Reddit r/Jokes с рейтингом | JSON | CC0 / public | Kaggle API | `json['title'] + json['body']`, фильтр по `score` |
| **[amoudgl/short-jokes-dataset](https://github.com/amoudgl/short-jokes-dataset)** | 231 657 коротких шуток | CSV | Уточнить | `raw.githubusercontent.com` | CSV → `Joke` |
| **[Kaggle: Showerthoughts 1M](https://www.kaggle.com/datasets/vishxl/showerthoughts)** | «Душевые мысли» — короткие, забавные, пафосные | CSV/JSON | CC0 | Kaggle API | Взять `title` |
| **[Reddit r/Showerthoughts API](https://docs.nickf.me/projects/shower%20thoughts/)** | Публичный API с отфильтрованными shower thoughts | REST JSON | Данные Reddit | `GET https://showerthoughts.nickf.me/api/thoughts` | JSON → `thought` |
| **[Kylecs/jokes-dataset-json](https://github.com/kylecs/jokes-dataset-json)** | ~1000 шуток в JSON | JSON | MIT | `raw.githubusercontent.com` | JSON → `body` |

### 2.6. Социальные сети / статусы / короткие посты

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[Pushshift Reddit dumps](https://files.pushshift.io/reddit/)** | Архивы комментариев и постов Reddit с 2005 | Терабайты, `.zst`/`.xz` JSONL | Custom / Public for research | `wget https://files.pushshift.io/reddit/comments/RC_2023-01.zst` | [ps_reddit_tool](https://github.com/magnusnissel/ps_reddit_tool), фильтр по subreddit (r/AskReddit, r/LifeProTips, r/TwoSentenceHorror, r/Showerthoughts) |
| **[Reddit API](https://www.reddit.com/dev/api/) + [PRAW](https://praw.readthedocs.io/)** | Живые посты и комментарии по subreddit | API rate-limited | Reddit Terms | `pip install praw`, OAuth app | JSON → `title/selftext/body` |
| **[Twitter/X datasets](https://github.com/shaypal5/awesome-twitter-data)** | Обзор Twitter-датасетов | Разные | Разные | См. репозиторий | См. конкретный датасет |

> **Важно:** данные соцсетей часто содержат мат, токсичность, личные данные, ссылки и хэштеги. Требуется жёсткая фильтрация.

### 2.7. Словари употребимых слов и частотные списки

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[Oxford 3000/5000](https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000)** | Самые важные слова для изучения английского | 3000/5000 слов | Oxford Terms (личное использование) | Веб-скрапинг страницы или [GitHub mirror](https://github.com/Berehulia/Oxford-3000-5000) | CSV → список слов |
| **[NGSL](https://www.newgeneralservicelist.com/)** | New General Service List, 2809 core words | CSV/Excel | Свободно | [newgeneralservicelist.org](https://www.newgeneralservicelist.com) | CSV → `headword` |
| **[BNC/COCA word lists](https://www.eapfoundation.com/vocab/general/bnccoca/)** | Списки по частотным полосам 1k–25k | Веб-таблицы | Уточнить | Парсинг страницы | HTML → CSV |
| **[wordfreq](https://github.com/kilimchoi/wordfreq) / [aparrish/wordfreq-en-25000](https://github.com/aparrish/wordfreq-en-25000)** | 25 000 английских слов с частотами | JSON | MIT / CC-BY-SA | `pip install wordfreq` или `raw.githubusercontent.com` | JSON → слова |
| **[SUBTLEX-US](https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexus)** | Частоты из субтитров, 282k строк | Excel/TXT | Академическая | [OSF](https://osf.io/djpqz/files/osfstorage) | pandas / csv → lemma/frequency |
| **[Dolch Sight Words](https://dolchword.net/dolch-word-list/)** | 220 базовых слов для начинающих | PDF / веб | Public | Парсинг PDF или HTML | Список слов |

### 2.8. Другие «лёгкие» тексты

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[Project Gutenberg](https://www.gutenberg.org/)** | Книги в public domain | 70 000+ книг, plain text | Public Domain (US) | [gutenberg.py](https://github.com/c-w/gutenberg), [gutenbergr](https://ladal.edu.au/tutorials/gutenberg/gutenberg.html), `wget` | Извлечь `.txt`, удалить лицензионные заголовки/концы, sentence-split |
| **[Aesop's Fables (PG)](https://www.gutenberg.org/ebooks/28)** | Короткие моральные басни | ~300 басен | Public Domain | `wget http://www.gutenberg.org/files/28/28-0.txt` | Разделить по басням (заголовки + мораль) |
| **[Simple English Wikipedia dump](https://dumps.wikimedia.org/simplewiki/)** | Упрощённая Википедия | ~50k статей | CC-BY-SA | `wget https://dumps.wikimedia.org/simplewiki/latest/simplewiki-latest-pages-articles.xml.bz2` | [WikiExtractor](https://github.com/attardi/wikiextractor) → plain text |
| **[News Category Dataset / HuffPost Headlines](https://www.kaggle.com/datasets/rmisra/news-category-dataset)** | Заголовки новостей | 200k заголовков | MIT | Kaggle API | CSV → `headline` |
| **[BBC News RSS Dataset](https://www.opendatabay.com/data/web-social/2d079367-c1ba-458b-9f36-d26f2c626222)** | Заголовки BBC | CSV | CC0 | OpenDataBay | CSV → `headline` |
| **[Open Trivia Database](https://opentdb.com/)** | Викторинные вопросы — короткие факты | API / thousands | MIT | `https://opentdb.com/api.php?amount=50` | JSON → `question` |

### 2.9. Большие корпуса для фильтрации/генерации

| Источник | Описание | Объём / формат | Лицензия | Скачивание | Парсинг |
|---|---|---|---|---|---|
| **[OSCAR](https://oscar-project.org/)** | Common Crawl по языкам | Терабайты | См. версию (обычно CC0/CC-BY) | HuggingFace `oscar-corpus/OSCAR_2301` | `datasets.load_dataset`, фильтрация по языку и качеству |
| **[C4 / Colossal Clean Crawled Corpus](https://huggingface.co/datasets/c4)** | Очищенный Common Crawl | Терабайты | ODC-BY | HuggingFace `c4` | `load_dataset("c4", "en")` |
| **[OpenWebText](https://github.com/jcpeterson/openwebtext)** | Reddit-ссылки → статьи | ~40GB | ODC-BY | Torrent / скрипты | JSONL → text |

## 3. Рекомендуемый пайплайн для проекта

Учитывая текущий конвейер в `auto-flow/corpus/`, предлагается следующий порядок:

1. **Собрать «базовый набор» из 3–5 источников**:
   - Tatoeba — для простых предложений.
   - Wikiquote / Database-Quotes-JSON — для цитат.
   - Showerthoughts / short-jokes — для юмора.
   - Project Gutenberg (Aesop's Fables + несколько коротких книг) — для лёгких текстов.

2. **Загрузить в `auto-flow/data/en/raw/`**:
   - Сохранить исходные файлы как есть.
   - Для каждого источника написать скрипт `auto-flow/scripts/import-<source>.ts`.

3. **Унифицированная очистка**:
   - Удалить HTML, markdown, ссылки, email, хэштеги, @упоминания, emoji.
   - Нормализовать кавычки, тире, многоточия.
   - Убрать строки с матом (список stopwords/regex), NSFW-флаги.
   - Фильтр по длине: 10–120 символов для предложений, 2–15 символов для слов.
   - Убедиться, что символы ⊆ набору QWERTY.

4. **Дедупликация**:
   - Нормализовать (lower case, trim, collapse spaces).
   - Хэш SHA-1 текста → уникальный `id` (как уже сделано в `src/data/drills/drills.jsonl`).

5. **Генерация меты**:
   - Использовать существующие функции из `auto-flow/corpus/meta.ts`/`coverage.ts`.
   - Добавить поле `source` (для трассировки).
   - Убрать/не добавлять `textLanguage` — согласно ADR 0001 и плану, подбор идёт по раскладке.

6. **Покрытие KeyLadder**:
   - Проверить, что для каждого шага KeyLadder есть достаточно drill'ов.
   - Если покрытие слабое — добавить короткие слова/биграммы из частотных списков.

7. **Выгрузка в `src/data/drills/drills.jsonl`** и импорт в Convex.

## 4. Сводная таблица приоритетов

| Приоритет | Источник | Зачем | Сложность |
|---|---|---|---|
| ⭐⭐⭐ | Tatoeba | Простые предложения, лицензия CC-BY, масштаб | Низкая |
| ⭐⭐⭐ | Wikiquote / Quotes JSON | Цитаты, мотивация, разнообразие | Низкая |
| ⭐⭐⭐ | Project Gutenberg (Aesop + short books) | Лёгкие нарративы | Средняя |
| ⭐⭐⭐ | Showerthoughts / Reddit Jokes | Юмор, короткие тексты | Низкая (требует фильтра) |
| ⭐⭐ | Simple English Wikipedia | Объёмный простой текст | Средняя |
| ⭐⭐ | OpenSubtitles / TED | Разговорные диалоги | Средняя |
| ⭐⭐ | NGSL / Oxford 3000 | Слова и словарный запас | Низкая |
| ⭐ | Pushshift / Common Crawl | Масштаб, но много шума | Высокая |

## 5. Лицензионные риски и фильтрация

- **Public Domain (Project Gutenberg, Aesop)** — безопасно, но в PG нужно удалить boilerplate лицензии из текста.
- **CC-BY / CC-BY-SA (Tatoeba, Wikiquote, Wikipedia)** — требуется атрибуция. Можно хранить `source`/`license` в мете drill'а.
- **Reddit / Twitter** — пользовательский контент, лицензия Reddit/ToS, но часто используется для исследований. Важна фильтрация личных данных.
- **Movie quotes / Goodreads** — возможны копирайтные претензии, лучше ограничиться Wikiquote.
- **NSFW / токсичность** — обязательна фильтрация по stopwords и ручная выборочная проверка.

## 6. Следующие шаги

Возможные дальнейшие действия:

1. Написать `auto-flow/scripts/import-tatoeba.ts` и `import-wikiquote.ts`.
2. Создать единый `auto-flow/data/en/raw/.gitignore` и Makefile target.
3. Собрать первую партию из ~10 000 английских drill'ов.
4. Проверить покрытие KeyLadder для QWERTY и JCUKEN.
