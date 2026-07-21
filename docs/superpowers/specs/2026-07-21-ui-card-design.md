# Дизайн: `ui/Card`

Дата: 2026-07-21 · Ветка: `feat/ui-card`

## Контекст

Аудит CSS (грань #3) отметил «surface-плашку» в 6 местах, но при осмотре общее
у всех шести — по сути только `background: var(--color-surface)`; border, radius,
padding и структура расходятся. Разбор в мозговом штурме сузил цель до **семейства
контент-карточек** — тех, кто делит цельное «оформление» `surface + 1px border +
radius-4`:

- `SurveyPrompt .survey` (`<section>`, padding-4, max-width 28rem);
- `RepertoireProgress .repertoire-progress` (`<div>`, padding-6, width/max-width 640);
- `SessionStatsDisplay .stats-display` (`<section aria-labelledby>`, БЕЗ своего
  padding — секции внутри делит `border-top`; ширина/max-width 640).

Остальные три места **вне границы**: `SignInScreen .sign-in-screen` — карточка
без border с плотным flex-центр-layout (натягивать не стоит); `LandingHandsDemo
.board` и `RhythmChannel .track` — структурно не карточки, а холсты-визуализации
(`position:relative`, transform/overflow/фикс-height, absolute-дети, у track ещё
и radius-3). Обёртка холста в компонент сдвинула бы containing-block для
absolute-детей.

Svelte scoped-стиль между компонентами не разделить, поэтому устранить дубль можно только компонентом.

## Решение

Ввести `src/components/ui/Card.svelte` — доменно-нейтральный примитив-контейнер
по конвенции `src/components/CLAUDE.md` («`ui/` — generic-примитивы»). Владеет
только «оформлением» карточки; содержимое и per-site layout — у вызывающего.

### Контракт

```ts
const {
  as = 'div',
  padding = 'md',
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section';
  padding?: 'none' | 'sm' | 'md';
  children: Snippet;
} = $props();
```

- **Полиморфизм тега** — `<svelte:element this={as}>`. Нужен реально: две из трёх
  карточек — `<section>`, а `SessionStatsDisplay` несёт `aria-labelledby`
  (именованный регион). Рендер всегда `<div>` уронил бы этот регион (a11y-регресс).
  `as` ограничен `div | section` (только то, что есть в продукте; YAGNI).
- **`padding`** → `none` (0) · `sm` (`--spacing-4`) · `md` (`--spacing-6`); дефолт
  `md`. Padding внутри bordered-карточки — её забота; `SessionStatsDisplay`
  передаёт `none` (его секции задают padding сами).
- **`...rest`** пробрасывается на элемент (типизирован `HTMLAttributes<HTMLElement>`
  из `svelte/elements`, без `any`): сюда едут per-site **layout** (`style` с
  `max-width`/`width`/`margin`), `aria-labelledby`, `id`, `data-*`. Граница «стиль
  компонента ↔ layout владельца» — та же, что у `ui/Button`.
- **`children`** — фрагмент содержимого (`{@render children()}`).

### Разметка и стили

```svelte
<svelte:element this={as} {...rest} class="card" class:pad-sm={padding === 'sm'} class:pad-md={padding === 'md'}>
  {@render children()}
</svelte:element>

<style>
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-4);
  }
  .pad-sm { padding: var(--spacing-4); }
  .pad-md { padding: var(--spacing-6); }
</style>
```

- Класс `card` идёт **после** `{...rest}` — компонент владеет своим классом,
  вызывающий не может его затереть (layout передаёт `style`, не `class`).
- `padding='none'` → ни `pad-sm`, ни `pad-md` → без padding. Директивы `class:`
  (а не интерполяция) — чтобы Svelte видел `.pad-*` использованными (без
  unused-selector-предупреждения).
- Цвета — только роли (ADR 0029); геометрия — примитивы. Новых ролей нет.

## Применение

| Место | Изменение |
| --- | --- |
| `SurveyPrompt` `.survey` | `<section class="survey">` → `<Card as="section" padding="sm" style="max-width: 28rem;">`; правило `.survey` удаляется |
| `RepertoireProgress` `.repertoire-progress` | `<div class="repertoire-progress">` → `<Card padding="md" style="width: 100%; max-width: 640px;">`; правило удаляется |
| `SessionStatsDisplay` `.stats-display` | `<section class="stats-display" aria-labelledby="session-stats-title">` → `<Card as="section" padding="none" aria-labelledby="session-stats-title" style="width: 100%; max-width: 640px;">`; правило удаляется |

Внутренняя разметка/стили каждой карточки (`.row`, `.title`, `.hero`, `.grid` …)
не трогаются — Card оборачивает только «оформление».

## Проверка

Компонент — dumb UI, автоматических тестов не получает: в `src/components/**` намеренно ноль
`*.test.ts` (ADR 0013). Проверка — витрина.

Новый `src/components/ui/Card.stories.svelte` (duo-конвенция), истории:

- **Padding md / sm / none** — три отступа с демо-контентом внутри.
- **As section** — рендер тегом `section` (проверка полиморфизма).
- **With layout** — пример с `style="max-width: …"` (граница layout-владельца).

Проверки: `make check-dev` (0/0, в т.ч. без unused-selector), затем `make spell`
и `make build` (перед коммитом — `make check-all`). Storybook — визуальная сверка
трёх переведённых карточек с текущим видом.

## ADR

Не заводится. Card — простой контейнер-примитив, применяющий конвенцию `ui/`
(как `ui/MessageScreen` и `ui/Field`), а не система вариантов уровня дизайн-системы
(для которой заводился ADR 0033 у `ui/Button`). Оси `as`/`padding` — минимальные
и продиктованы конкретными сайтами, не таксономия.

## Что решено НЕ делать

- **`SignInScreen`** — вне: карточка без border с плотным flex-центр-layout
  (align-center, gap, margin, max-width). Параметр `border={false}` + проброс всего
  flex через `style` ради одного сайта — хуже дубля; остаётся bespoke.
- **Холсты `board` / `track`** — вне: не карточки (absolute-дети, transform,
  overflow, radius-3). Делят с карточкой только цвет поверхности.
- **Вариант `border` (no-border)** — не вводится, раз `SignInScreen` вне; все три
  карточки bordered.
- **Вариант `radius`** — не вводится: все контент-карточки на `radius-4` (radius-3
  был только у холста `track`).
- **`padding` как произвольная длина** — только три ступени под реальную нужду
  (none/sm/md); шкалу не расширяем спекулятивно.

## Область неопределённости

- Перенос per-site layout (`max-width`/`width`) в `style`-проброс выведен из CSS,
  а не подтверждён на экране. Сверить на витрине/в приложении, что три карточки визуально не
  сместились (габарит, отступы, скругление).
- `SessionStatsDisplay`: убедиться, что `aria-labelledby` доехал на `<section>`
  через `{...rest}` и регион остался именованным.
