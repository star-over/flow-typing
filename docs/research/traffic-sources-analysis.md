# Исследование источников трафика для FlowTyping после запуска

> Дата: 2026-07-14  
> Цель: понять, откуда FlowTyping может получать пользователей после запуска, сравнить каналы привлечения и выбрать приоритетную стратегию для каждой фазы развития продукта.

---

## 1. Продуктовый контекст

**FlowTyping** — браузерный SPA-тренажёр слепой печати на SvelteKit с фокусом на «визуализации движения» пальцев и адаптивном движке Auto-Flow. Целевая аудитория: школьники, студенты, молодые специалисты, офисные сотрудники и начинающие разработчики. Поддерживаются UI и материалы на английском и русском (`en`/`ru`), раскладки `qwerty`/`йцукен`.

Ключевые ограничения, влияющие на выбор каналов:

- **Чистый SPA, SSR/prerender отключены.** Поисковые боты видят единственный `index.html` с одним `title`/`description` (`src/app.html`, `src/routes/+layout.ts`). Это сильно ограничивает классический SEO без доработок.
- **Тренировка требует аутентификации** (`docs/adr/0012-training-requires-authentication.md`). Гостевой режим отложен. Высокий барьер входа снижает конверсию из «холодного» трафика.
- Проект на стадии **MVP / поиска Product/Market Fit**. Стратегия должна быть дешёвой, измеримой и ориентированной на обратную связь.

---

## 2. Обзор рынка и конкурентов

Ниша клавиатурных тренажёров большая и конкурентная. По данным [TypoTrainer](https://typotrainer.lukadevv.com/blog/best-typing-practice-tools), в 2026 году лидеры по посещаемости:

| Сервис | Оценка посещаемости | Позиционирование |
|---|---|---|
| Monkeytype | ~13.9 млн визитов/мес | Минималистичный тест скорости для опытных |
| Typing.com | ~12.4 млн | K-12, школы, новички |
| TypingClub | ~6.3 млн | Структурированные уроки для новичков |
| NitroType / 10FastFingers | ~4 млн каждый | Игры/соревнования |
| Keybr | ~3.6 млн | Алгоритмическая адаптация под слабые клавиши |
| TypeRacer | ~2.4 млн | Гонки на скорость |

### Источники трафика у конкурентов

| Сервис | Основной источник | Доля | Источник данных |
|---|---|---|---|
| **Monkeytype** | Direct | ~66–71% | [SimilarWeb](https://www.similarweb.com/website/monkeytype.com/), [Semrush](https://www.semrush.com/website/monkeytype.com/overview/) |
| **keybr.com** | Direct | ~62% | [SimilarWeb](https://www.similarweb.com/website/keybr.com/) |
| **typing.io** | Direct | ~57% | [SimilarWeb](https://www.similarweb.com/website/typing.io/) |
| **typing.com** | Organic Search | ~54.5% | [SimilarWeb](https://www.similarweb.com/website/typing.com/) |
| **typingclub.com** | Organic Search | ~45.5% | [SimilarWeb](https://www.similarweb.com/website/typingclub.com/) |
| **typingtest.com** | Organic Search | ~71.3% | [SimilarWeb](https://www.similarweb.com/website/typingtest.com/) |
| **typingmonkey.in** | Organic Search | ~87.2% | [SimilarWeb](https://www.similarweb.com/website/typingmonkey.in/) |

**Вывод:** у сильных брендов (Monkeytype, Keybr, typing.io) доминирует **прямой трафик**. У молодых и образовательных сайтов основной источник — **органический поиск**. Для нового продукта без бренда после запуска ключевой канал — SEO/органика, но только если технически возможно ранжироваться.

Русскоязычный сегмент меньше. [Клавогонки](https://klavogonki.ru/forum/general/19983/) — один из крупнейших русскоязычных проектов — имеют ~4.7 тыс. посетителей в день (~86 тыс. уников в месяц).

---

## 3. Источники трафика и их характеристики

### 3.1. Organic Search (SEO)
- **Что это:** трафик из Google, Яндекс, Bing по запросам вроде «typing speed test», «learn to type», «touch typing tutor», «тренажёр слепой печати», «слепой набор».
- **Плюсы:** масштабируемый, «бесплатный» после инвестиций в контент/технику, высокое намерение пользователя.
- **Минусы:** высокая конкуренция, долгий вывод результата (3–12 месяцев).
- **Для FlowTyping:** **ограничен из-за SPA-архитектуры**. Без SSR/prerender или отдельных лендингов SEO даст мало.

### 3.2. Direct / Brand
- **Плюсы:** самый дёшевый и лояльный трафик.
- **Минусы:** требует узнаваемости бренда, растёт годами.
- **Для FlowTyping:** на старте близок к нулю.

### 3.3. Referral (обзоры, форумы, каталоги)
- **Плюсы:** целевой трафик, доверие аудитории, относительно быстрый старт.
- **Минусы:** нерегулярный, требует outreach.
- **Для FlowTyping:** хороший канал благодаря уникальной «визуализации движения».

### 3.4. Paid Search (PPC)
- **Плюсы:** мгновенный трафик, точный таргетинг.
- **Минусы:** высокая стоимость в конкурентной нише, низкая маржинальность для бесплатного MVP.
- **Для FlowTyping:** **не рекомендуется на MVP-этапе**.

### 3.5. Social / Content Marketing
- **Плюсы:** виральный потенциал, формирование бренда.
- **Минусы:** требует регулярной работы с контентом.
- **Для FlowTyping:** сильный канал, особенно короткие видео с демонстрацией визуализации движения.

### 3.6. Product Hunt / Hacker News / BetaList
- **Плюсы:** быстрый всплеск пользователей, обратная связь, обратные ссылки.
- **Минусы:** кратковременный эффект (1–3 дня), низкое удержание холодной аудитории.
- **Для FlowTyping:** **рекомендуется на старте**.

### 3.7. Influencer / Educational Partnerships
- **Плюсы:** высокое доверие, целевая аудитория.
- **Минусы:** требует поиска партнёров.
- **Для FlowTyping:** перспективно для B2B и русскоязычного сегмента.

### 3.8. Viral / Referral Loops
- **Плюсы:** органический рост, низкий CAC.
- **Минусы:** требует продуманной геймификации.
- **Для FlowTyping:** пока не реализовано.

### 3.9. Email / Retention
- Не источник нового трафика, а инструмент удержания.

### 3.10. B2B / Institutional
- **Плюсы:** крупные контракты.
- **Минусы:** длинный цикл продаж.
- **Для FlowTyping:** фаза 3 (монетизация), не старт.

---

## 4. Сравнительный анализ источников трафика

| Источник | Скорость результата | Стоимость привлечения | Масштабируемость | Качество аудитории | Ресурсы | Приоритет для FlowTyping |
|---|---|---|---|---|---|---|
| **Organic Search** | Медленно (3–12 мес) | Низкая | Очень высокая | Высокое намерение | SEO, контент, SSR | Средний (пока SPA) |
| **Direct / Brand** | Очень медленно | Низкая | Высокая | Очень лояльная | Брендинг, время | Низкий на старте |
| **Referral** | Средне (1–3 мес) | Низкая/средняя | Средняя | Высокое доверие | Outreach, PR | **Высокий** |
| **Paid Search** | Мгновенно | Высокая | Высокая | Среднее | Бюджет, аналитика | Низкий на MVP |
| **Social / Content** | Средне (1–6 мес) | Средняя | Высокая | Среднее | Контент, видео | **Высокий** |
| **Product Hunt / HN** | Мгновенно (всплеск) | Низкая | Низкая | Ранние адоптеры | Подготовка запуска | **Высокий** |
| **Influencer / Education** | Средне | Средняя/высокая | Средняя | Высокое доверие | Партнёрства | Средний |
| **Viral Loops** | Средне | Очень низкая | Высокая | Зависит от продукта | Разработка | Средний |
| **Email** | — | Низкая | Низкая | Лояльная | CRM | Средний (удержание) |
| **B2B / Institutional** | Медленно | Высокая | Высокая | Очень высокая | Sales | Низкий на старте |

---

## 5. Стратегия по фазам

### Фаза 1 — MVP (сейчас)
1. **Запуск на Product Hunt и Hacker News** — главный бесплатный всплеск.
2. **Outreach к авторам обзоров** — Reddit, Habr, Telegram-каналы по продуктивности.
3. **Короткое видео** — TikTok/Reels/Shorts с демонстрацией визуализации движения.
4. **Смягчить барьер входа** — внедрить гостевой режим как можно раньше.
5. **SEO-заглушки** — сделать несколько статических лендингов (`/typing-tutor`, `/touch-typing-russian`, `/typing-test`) с `prerender=true`.

### Фаза 2 — Product/Market Fit
1. SEO + контент-блог (требуется SSR/prerender или отдельный блог).
2. Геймификация и виральные механики (share-карточки, лидерборды).
3. Email-ретеншн.
4. Сообщества пользователей.

### Фаза 3 — Монетизация
1. Paid Search для коммерческих запросов.
2. B2B-продажи в школы и IT-курсы.
3. Influencer-маркетинг в образовательной нише.

---

## 6. Ключевые риски

- **SPA без SSR** сильно ограничивает SEO — главный технический риск.
- **Обязательная авторизация** снижает конверсию из холодного трафика.
- **Высокая конкуренция** в англоязычной нише.
- **Русскоязычный рынок меньше**, часть конкурентов (Ratatype) столкнулась с блокировками в РФ.

---

## 7. Приоритеты на старте

1. **Product Hunt / Hacker News + outreach** — быстрый старт и обратная связь.
2. **Social / Content (короткое видео)** — демонстрация уникальной фичи.
3. **Referral (обзоры, форумы)** — целевой трафик.
4. **SEO** — в перспективе, после технических доработок.
5. **Paid Search и B2B** — на этапе монетизации.

---

## 8. Источники

- [TypoTrainer — Monkeytype, TypeRacer, Keybr: Which Typing Tool Is Right for You?](https://typotrainer.lukadevv.com/blog/best-typing-practice-tools)
- [SimilarWeb — monkeytype.com](https://www.similarweb.com/website/monkeytype.com/)
- [SimilarWeb — keybr.com](https://www.similarweb.com/website/keybr.com/)
- [SimilarWeb — typing.io](https://www.similarweb.com/website/typing.io/)
- [SimilarWeb — typing.com](https://www.similarweb.com/website/typing.com/)
- [SimilarWeb — typingclub.com](https://www.similarweb.com/website/typingclub.com/)
- [SimilarWeb — typingtest.com](https://www.similarweb.com/website/typingtest.com/)
- [SimilarWeb — typingmonkey.in](https://www.similarweb.com/website/typingmonkey.in/)
- [Semrush — monkeytype.com](https://www.semrush.com/website/monkeytype.com/overview/)
- [Semrush — typingclub.com](https://www.semrush.com/website/typingclub.com/overview/)
- [Клавогонки — Сравнение посещаемости тайпинг ресурсов](https://klavogonki.ru/forum/general/19983/)
- [SaaSHub — typing.io mentions](https://www.saashub.com/compare-typefacer-vs-typing-io)
- [Indie Hackers — How I got 21k+ views on Reddit for my product launch](https://www.indiehackers.com/post/how-i-got-21k-views-on-reddit-for-my-product-launch-877dc237a3)

---

*Файл создан: 2026-07-14. Данные о посещаемости — оценочные, рекомендуется перепроверять перед принятием стратегических решений.*
