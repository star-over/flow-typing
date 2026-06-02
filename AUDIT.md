# Архитектурный аудит: FlowTyping

**Дата:** 2026-06-01  
**Цель:** Оценка состояния кодовой базы и возможности миграции на компилируемый фреймворк (Svelte / Solid)  
**Методология:** Статический анализ структуры, зависимостей и паттернов

---

## 1. Общая сводка

| Метрика | Значение |
|---------|----------|
| **Всего строк кода** | ~4 900 (src/) |
| **Production-компонентов** | ~16 (tsx) |
| **XState-машин** | 3 (app, keyboard, training) |
| **Тестов** | 14 файлов |
| **Storybook stories** | 7 файлов |
| **Использование React API** | Минимальное (только `useState`, `useEffect`, `useRef`) |
| **Сложность миграции** | **Средняя** (~2–4 недели одному разработчику) |

**Ключевой вывод:** Проект — это **клиентское SPA**, спрятанное внутри Next.js App Router. ~85% бизнес-логики фреймворк-агностично. Миграция технически возможна и не потребует переписывания ядра.

---

## 2. Архитектурный обзор

### 2.1. Структура проекта

```
src/
├── app/                    # Точка входа Next.js (только layout + client wrapper)
├── components/
│   ├── ui/                 # Базовые UI-компоненты (~8 шт.)
│   └── app/                # Shell-компоненты (Header, MainContent, FooterActions)
├── machines/               # XState v5 — ядро бизнес-логики
├── store/                  # Zustand — пользовательские настройки
├── hooks/                  # React-хуки (events, i18n, URL-sync)
├── lib/                    # Утилиты, ViewModel-builder, positioning
├── data/                   # Раскладки клавиатур, тексты
├── interfaces/             # TypeScript-типы
└── stories/                # Storybook assets
```

### 2.2. Паттерн архитектуры

Проект следует паттерну **Container / Presentational Components** + **State Machines**:

- **XState-машины** управляют всей интерактивной логикой (экраны, ввод, тренировка).
- **Zustand** хранит персистентные настройки (язык, раскладка, `exerciseId`).
- **React-компоненты** — тонкий "клей": подключают DOM-события к машинам, рендерят UI.
- **Чистые функции** (`lib/`) строят ViewModel для рендеринга.

**Это хорошая архитектура.** Логика отделена от фреймворка, компоненты малы и переиспользуемы.

---

## 3. Анализ завязанности на Next.js / React

### 3.1. Что реально используется от Next.js

| Фича Next.js | Где | Насколько критично |
|--------------|-----|-------------------|
| **App Router** | `src/app/layout.tsx`, `app-client.tsx` | Только как точка входа. Нет вложенных роутов, нет `page.tsx`. |
| **Middleware** | `middleware.ts` | i18n: автоопределение locale + cookie. |
| **next/font/google** | `layout.tsx` | Загрузка шрифтов Geist. |
| **next/headers (cookies)** | `layout.tsx` | Чтение `NEXT_LOCALE` на сервере. |
| **next/navigation** | `use-url-sync.ts`, `user-preferences-page.tsx` | Синхронизация `?exerciseId=` и `router.refresh()`. |
| **Metadata API** | `layout.tsx` | Статические `<title>` / `<meta>`. |
| **Server Actions** | — | **Не используются.** |
| **API Routes** | — | **Не используются.** |
| **SSR / RSC** | `layout.tsx` | Только для чтения cookie. Весь UI — клиентский. |

**Вывод:** Next.js используется на 10% своих возможностей. Это оверхед для SPA без SSR.

### 3.2. Что реально используется от React

| API React | Количество | Где |
|-----------|-----------|-----|
| `useState` | 2 | `cursor-symbol.tsx`, `use-i18n.ts` |
| `useEffect` | 7 | `hands-ext`, `use-keyboard-events`, `use-url-sync`, `use-i18n`, `LanguageSetter`, `cursor-symbol` |
| `useRef` | 1 | `hands-ext.tsx` |
| `useContext` / `createContext` | 0 | — |
| `useMemo` / `useCallback` | 0 | — |
| `memo` / `forwardRef` | 0 | — |
| `createPortal` | 0 (Radix внутри) | `select.tsx` |

**Вывод:** Нет сложных React-паттернов (Context, render props, cloneElement, мемоизация). Компоненты простые и "тупые".

### 3.3. Зависимости от React-экосистемы

| Библиотека | Зависимость | Заменимость |
|------------|-------------|-------------|
| `@radix-ui/react-select` | 1 компонент | `bits-ui` (Svelte), `kobalte` (Solid) |
| `lucide-react` | Иконки | `lucide-svelte`, `lucide-solid` |
| `@xstate/react` | 2 файла (`app-client`, `training-scene`) | `@xstate/svelte`, `@xstate/solid` |
| `zustand` | 1 store | `svelte-zustand` / Svelte stores / Solid signals |
| `@tanstack/react-query` + `@tanstack/react-db` | **Только Storybook** | Для core — не нужно |
| `convex/react` | `ConvexProvider` в `app-client` | Есть vanilla/Svelte/Solid адаптеры |

---

## 4. Состояние тестов и инфраструктуры

### 4.1. Тесты

- **14 тестовых файлов**, все — чистый TypeScript.
- **Не используют** React Testing Library, `@testing-library/react`, `render()`, `screen`.
- Тестируют: чистые функции, XState-машины (`createActor`), Zod-схемы, JSON-данные.
- **При миграции:** тесты **не требуют изменений**. `jsdom` можно удалить.

### 4.2. Storybook

- **7 stories** (`.stories.tsx`) для UI-компонентов.
- Полностью завязан на React + Next.js (`@storybook/nextjs-vite`).
- **При миграции:** потребуется полное переписывание stories на `.svelte` / Solid.
- Это **самый трудоемкий** элемент миграции относительно объема.

### 4.3. Tailwind CSS v4

- CSS-first конфигурация, **нет `tailwind.config.js`**.
- `@theme inline`, `@import "tailwindcss"` — работают в любом Vite-based фреймворке.
- **При миграции:** переносится 1-к-1, только путь к entry-CSS меняется.

### 4.4. ESLint

- Flat Config с React/Next.js специфичными плагинами.
- **При миграции:** заменить на `eslint-plugin-svelte` / `eslint-plugin-solid`.

---

## 5. Оценка миграции на компилируемые фреймворки

### 5.1. SvelteKit (Svelte 5)

**Сложность: Средняя**

| Что меняем | Оценка | Комментарий |
|------------|--------|-------------|
| UI-компоненты (~16) | 3–5 дней | JSX → Svelte-шаблоны. `cva` + `tailwind-merge` работают. |
| XState-интеграция | 0.5 дня | `@xstate/svelte` имеет `useMachine()` с похожим API. |
| Zustand → Svelte stores | 0.5 дня | Проще заменить на `$state` / `writable` / `svelte-zustand`. |
| Routing / Layout | 1–2 дня | `+layout.svelte`, `hooks.server.ts` для i18n/cookies. |
| URL-sync (`?exerciseId`) | 0.5 дня | `$page.url.searchParams`, `goto()` — нативно в SvelteKit. |
| Storybook (7 stories) | 2–3 дня | Полное переписывание на `@storybook/sveltekit`. |
| Tests | 0 дней | Не трогаем. |
| Radix Select → Bits UI | 0.5 дня | API похож на Radix. |
| Шрифты / Metadata | 0.5 дня | `@fontsource/geist` или `<link>`, `<svelte:head>`. |

**Итого:** ~8–12 дней фронтенд-разработки.

**Преимущества SvelteKit:**
- Компилятор убирает виртуальный DOM — меньше runtime, меньше bundle.
- Встроенный роутинг, формы, server hooks — меньше зависимостей.
- Svelte 5 Runes (`$state`, `$derived`) — проще, чем React hooks для этого проекта.
- Отличная производительность для интерактивных SPA (typing — latency-sensitive).

**Риски:**
- Svelte 5 относительно новый, экосистема меньше React.
- Переписывание Storybook — обязательно.

### 5.2. SolidStart (SolidJS)

**Сложность: Средняя (чуть ниже, чем Svelte)**

| Что меняем | Оценка | Комментарий |
|------------|--------|-------------|
| UI-компоненты | 2–4 дня | JSX остается! Меняются только реактивные примитивы. |
| XState-интеграция | 0.5 дня | `@xstate/solid` или прямые подписки. |
| Zustand → Solid signals | 0.5 дня | `createStore` / `createSignal` — нативная замена. |
| Routing / Layout | 1–2 дня | Файловый роутинг SolidStart похож на Next.js. |
| URL-sync | 0.5 дня | `useSearchParams`, `useNavigate` — похоже на Next.js. |
| Storybook | 2–3 дня | `@storybook/solid` — переписывание stories. |
| Tests | 0 дней | Не трогаем. |
| Radix Select → Kobalte | 0.5 дня | Headless UI для Solid. |

**Итого:** ~7–11 дней.

**Преимущества SolidStart:**
- JSX сохраняется — меньше синтаксических изменений в компонентах.
- Fine-grained reactivity — еще меньше overhead, чем Svelte, для обновлений клавиатуры/курсора.
- Ментальная модель ближе к React (компоненты = функции, не `.svelte` файлы).

**Риски:**
- Экосистема Solid меньше React/Svelte.
- Storybook для Solid менее зрелый.

### 5.3. Альтернатива: остаться на React, но уйти с Next.js

Если цель не "Svelte ради Svelte", а **снижение сложности инфраструктуры**, есть промежуточный вариант:

**Vite + React + `react-router-dom` (или Wouter)**

| Что меняется | Оценка |
|--------------|--------|
| Удалить Next.js | 1 день |
| Настроить Vite + Router | 0.5 дня |
| Переписать middleware (i18n) | 0.5 дня |
| Убрать `next/font`, `next/headers` | 0.5 дня |
| Компоненты | **0 дней** — JSX остается |
| Storybook | **0 дней** — остается React |
| Tests | **0 дней** |

**Итого:** ~2–3 дня. Получаем тот же SPA, но без оверхеда Next.js.

---

## 6. Что делать с Convex и TanStack Query

**Важное наблюдение:** `ConvexProvider`, `@tanstack/react-query`, `@tanstack/react-db` **присутствуют в коде, но не используются в продакшен-фичах**.

- `ConvexProvider` оборачивает приложение, но внутри `src/` нет `useQuery` / `useMutation`.
- `verses.db.ts` и stories с TanStack Query — только в Storybook (`verses-query-minimal.stories.tsx`).

**Рекомендация:** Перед миграцией решить, нужен ли Convex вообще. Если нет — удалить зависимости и упростить миграцию. Если нужен — для SvelteKit/SolidStart есть vanilla/Svelte/Solid адаптеры Convex.

---

## 7. Итоговые рекомендации

### 7.1. Нужна ли миграция?

**Текущее использование Next.js — неоправданно для SPA.**

- Нет SSR для UI.
- Нет API Routes.
- Нет Server Actions.
- Нет оптимизации изображений (`next/image`).
- App Router используется как "дорогой `index.html`".

**Next.js добавляет:**
- Сложность сборки и конфигурации.
- Больший runtime (React hydration, роутинг).
- Зависимость от Vercel-специфичных паттернов.

### 7.2. Если мигрировать — куда?

| Приоритет | Фреймворк | Обоснование |
|-----------|-----------|-------------|
| **🥇 Рекомендуется** | **SvelteKit** | Лучшее соотношение "чистота кода / производительность / runtime size". Для typing-тренажера latency критична. |
| 🥈 Хороший вариант | **SolidStart** | Меньше синтаксических изменений (JSX), максимальная производительность реактивности. |
| 🥉 Минимализм | **Vite + React** | Самый дешевый переход. Убираем Next.js, сохраняем весь JSX и экосистему. |
| ❌ Не рекомендуется | Оставить Next.js | Текущая архитектура не использует преимуществ фреймворка. Это технический долг. |

### 7.3. План миграции (если выбираем SvelteKit)

**Фаза 1 — Подготовка (1–2 дня):**
1. Вынести XState-машины в отдельный пакет/папку (уже сделано, но проверить чистоту).
2. Сделать Zustand-store vanilla (`createStore` вместо `create`).
3. Вынести `use-keyboard-events` в vanilla `subscribeKeyboardEvents()`.
4. Удалить / отключить Convex и TanStack Query из core.

**Фаза 2 — Инфраструктура (1–2 дня):**
1. Инициализировать SvelteKit (`npm create svelte@latest`).
2. Настроить Tailwind v4, TypeScript paths, Vitest.
3. Перенести `middleware.ts` → `src/hooks.server.ts` (i18n + cookies).
4. Настроить шрифты (`@fontsource/geist`).

**Фаза 3 — Компоненты (3–5 дней):**
1. Переписать `app/layout.tsx` → `+layout.svelte`.
2. Переписать `app-client.tsx` → `+page.svelte` с `@xstate/svelte`.
3. Мигрировать UI-компоненты (`src/components/ui/`) по очереди.
4. Заменить Radix Select на `bits-ui`.

**Фаза 4 — Интеграция (1–2 дня):**
1. URL-sync (`?exerciseId`) через `$page.url` + `goto()`.
2. i18n через derived store + динамический `import()`.
3. `hands-ext.tsx` → Svelte action (`use:positionKeyboards`).

**Фаза 5 — Storybook + QA (2–3 дня):**
1. Переписать 7 stories на Svelte.
2. Прогнать все 14 тестов (должны пройти без изменений).
3. Ручное тестирование typing flow.

**Общая оценка: 10–15 рабочих дней.**

### 7.4. Что оставить без изменений

- `src/machines/*.ts` — 100% переносимы.
- `src/lib/*.ts` (кроме `verses.db.ts`) — чистый TypeScript.
- `src/data/` — статические данные.
- `src/interfaces/` — типы.
- **Все 14 тестовых файлов**.
- Tailwind CSS v4 стили.

---

## 8. Технический долг (вне зависимости от миграции)

| Проблема | Приоритет | Решение |
|----------|-----------|---------|
| `next.config.ts` пустой, но Next.js тянет тяжелый runtime | Средний | Либо настроить output: 'export', либо уйти с Next.js. |
| `use-url-sync.ts` жестко завязан на Next.js | Средний | Абстрагировать интерфейс `RouterAdapter`. |
| `hands-ext.tsx` мутирует DOM напрямую (`style.transform`) | Низкий | Вынести в action/hook с четким lifecycle. |
| `convex` + `@tanstack/react-*` в deps, но не в core | Низкий | Удалить мертвый код. |
| `jsdom` + `@testing-library/*` в deps, но не используются | Низкий | Удалить. |

---

*Аудит подготовлен на основе статического анализа кодовой базы FlowTyping.*
