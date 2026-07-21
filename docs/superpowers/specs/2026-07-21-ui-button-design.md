# Дизайн: `ui/Button`

Дата: 2026-07-21 · Ветка: `fix/css-focus-a11y-token-cleanup`

## Контекст

Аудит CSS (грань #3) выявил дублирование кнопочных стилей. Один и тот же
визуальный словарь (`surface + border`, плотная заливка, ghost-контур,
brand-accent) размазан по независимым копиям в нескольких компонентах и роутах:

- нейтральная `surface + 1px border`: `FooterActions .btn`, `SettingsPage .btn`,
  `stats/+page .btn`;
- плотная заливка: `FooterActions .btn.primary` / `.btn.success`,
  `SettingsPage .btn-danger`, `SignInScreen .btn-google`;
- ghost-контур: `MessageScreen .message-screen__action` (уже вынесен в примитив
  экрана, но кнопка вшита в него);
- brand-accent CTA: `LandingScreen .cta` (×2, hero + closing);
- `surface`-подобная с фоном `--color-background`: `SurveyPrompt .answer`.

Дублируемая база визуально совпадает и у пассивных surface-плашек, и даже у
декоративной каретки логотипа — но это совпадение **цвета/токенов**, а не
сущности. Разбор в мозговом штурме выделил шесть развилок (граница компонента;
вариант против отдельного компонента; отношение к `Surface`; полиморфизм
`button`/`a`; граница «стиль компонента ↔ макет владельца»; API контента) и
закрыл каждую. Решения ниже.

## Решение

Ввести `src/components/ui/Button.svelte` — доменно-нейтральный интерактивный
примитив по конвенции `src/components/CLAUDE.md` («`ui/` — generic-примитивы»).
Компонент покрывает **только интерактивные элементы управления**. Пассивные плашки
(будущий `ui/Surface`), сегмент переключатель-группы (будущий `ui/SegmentedControl`) и
каретка логотипа (глиф, не элемент управления) — вне границы.

### Контракт

```ts
const {
  variant = 'neutral',
  size = 'md',
  href,
  type = 'button',
  disabled = false,
  children,
  ...rest
}: {
  variant?: 'neutral' | 'primary' | 'success' | 'danger' | 'ghost' | 'accent';
  size?: 'md' | 'lg';
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children: Snippet;
} = $props();
```

- **Полиморфизм элемента.** Корень — `<svelte:element this={href ? 'a' : 'button'}>`.
  `href` задан → навигация (`<a href>`), иначе → действие (`<button type>`).
  Различие «навигация ↔ действие» — реальное (доступность, открытие в новой
  вкладке, preload маршрута, семантика для программы для чтения с экрана), поэтому моделируется
  явно, а не сводится к одному тегу.
- **`disabled`** применяется только к `<button>` (у `<a>` disabled-ссылок в
  продукте нет — не поддерживаем, YAGNI).
- **Контент — фрагмент `children`** (`{@render children()}`): кнопки оборачивают
  метку + опциональный `<KeyHint>`. Закрытый контракт (как у `MessageScreen`)
  здесь не подходит — нужна композиция ребёнка. Метка приходит уже
  локализованной (ADR 0022), компонент строк не знает.
- **`...rest`** пробрасывается на элемент: `onclick`, `aria-*`,
  `aria-keyshortcuts`, `data-*`.

### Варианты → роли

| variant | фон | текст | граница | hover |
| --- | --- | --- | --- | --- |
| `neutral` | `--color-surface` | `--color-text-primary` | `--color-border` | фон → `--color-surface-hover` |
| `primary` | `--color-primary-background` | `--color-on-dense` | = фон | `--color-primary-hover` |
| `success` | `--color-success` | `--color-on-dense` | = фон | `--color-success-hover` |
| `danger` | `--color-error` | `--color-on-dense` | = фон | `--color-error-hover` |
| `ghost` | `transparent` | `--color-text-primary` | `--color-text-secondary` | граница → `--color-text-primary` |
| `accent` | `--color-brand-accent` | `--color-cursor-foreground` | `transparent` | `--color-brand-accent-hover`; `:active { translateY(1px) }` |

- **Согласование текста плотных вариантов.** Сейчас `FooterActions` красит текст
  плотных кнопок в `--color-background`, а `SettingsPage` / `SignInScreen` — в
  `--color-on-dense` (роль ровно «текст/символ на плотной заливке», ADR 0029).
  Стандартизуем на `--color-on-dense`. У двух кнопок футера это даёт крошечный
  сдвиг тона текста — принято осознанно ради единого источника истины.
- **Нейтрализация `KeyHint`.** Внутри плотных и `accent`-вариантов вложенный
  `KeyHint` теряет свою плашку (`:global(.key-hint)` → `background: transparent;
  border-color: currentColor; color: inherit; opacity: 0.85`). Правило живёт в
  компоненте — вызывающие его больше не повторяют (сейчас дубль в `FooterActions`
  и `LandingScreen`).
- Новых ролей не заводится; все слоты — существующие `--color-*`.

### Размеры и фокус

- `md` (дефолт): `padding: var(--spacing-2) var(--spacing-4)`, `--font-size-sm`,
  `--font-weight-medium`.
- `lg` (CTA): `padding: var(--spacing-3) var(--spacing-6)`, `--font-size-md`,
  `--font-weight-semibold`.
- Размер — ось, отдельная от цвета (не «`accent` значит крупный»). Два значения,
  ровно под реальную потребность (`lg` = только CTA).
- Фокус — примитив `--focus-ring-*` с `--color-text-primary`; у `accent`
  сохраняется намеренное brand-accent-кольцо с `outline-offset: 3px`.

### Граница «стиль компонента ↔ макет владельца»

Компонент владеет только «внутренним» видом: padding (по `size`), radius,
цвета/состояния, `inline-flex` + `gap` под иконку `KeyHint`, `:active`.
Позиционирование (margin, align-self, width, flex) — забота вызывающего через
родительский контейнер (`gap` / grid), не через стилизацию кнопки (в Svelte
scoped-стиль родителя до корня дочернего компонента и не дотянется). Конкретно
`SettingsPage .btn` теряет `margin-top` — отступ переезжает в `gap` родителя.

Геометрия — литералами и примитивами; цвета — через роли (ADR 0029).

## Применение

| Место | Изменение |
| --- | --- |
| `FooterActions` `.btn` / `.primary` / `.success` | `<Button variant>` + `KeyHint` в `children`; локальная нейтрализация `KeyHint` удаляется |
| `SettingsPage` `.btn` (cancel) / `.btn-danger` | `variant="neutral"` / `"danger"`; `margin-top` → `gap` родителя |
| `stats/+page` `.btn` | `<Button href={resolve('/')}>` — повышается до ссылки (навигация), уходит `onclick={goto()}` |
| `SurveyPrompt` `.answer` | `variant="neutral"` + локальное переопределение фона на `--color-background` (кнопки лежат внутри surface-карточки) |
| `MessageScreen` action | `variant="ghost"` — ghost-кнопка перестаёт быть вшитой, минус дубль |
| `LandingScreen` `.cta` ×2 | `<Button variant="accent" size="lg" href={resolve('/train')}>` + `KeyHint` |
| `SignInScreen` `.btn-google` | `variant="primary"` |

## Проверка

Компонент — dumb UI, автоматических тестов не получает: в `src/components/**`
намеренно ноль `*.test.ts` (ADR 0013). Проверка — витрина.

Новый `src/components/ui/Button.stories.svelte` (duo-конвенция), истории:

- **Variants** — по одной на каждый `variant` (оба тега: `<button>` и `<a>`).
- **Sizes** — `md` против `lg`.
- **States** — hover / focus-visible / disabled.
- **With KeyHint** — композиция ребёнка внутри плотного и `accent`-варианта
  (проверка нейтрализации плашки).

Проверки: `make check-dev`, затем `make spell` и `make build` (перед коммитом —
`make check-all`). Storybook — визуальная сверка каждого мигрированного места с
текущим видом.

## ADR

Введение примитива с **системой вариантов** — структурное решение о
дизайн-системе, которого в конвенциях ещё нет (спек `MessageScreen` явно отложил
его сюда: «оформить тогда, с опытом от `MessageScreen`»). Поэтому работа
оформляется новым **ADR 0033** (следующий свободный номер; последний принятый —
0032). ADR фиксирует: вариант-таксономию, полиморфизм `href → <a>`,
стандартизацию foreground плотных вариантов на `--color-on-dense`, границу
«стиль компонента ↔ макет владельца». Тело — краткое, детали — в этом описании.
ADR пишется первым шагом реализации, до кода компонента.

## Что решено НЕ делать

- **Готовая библиотека (shadcn и аналоги).** shadcn — React + Tailwind; в
  `CLAUDE.md` он назван поимённо в запрете, как и Tailwind/PostCSS. Svelte-порт
  тоже на Tailwind. Это не упрощение, а разворот фундаментального решения (второй
  тематический движок против ролей `--color-*`, дерево зависимостей в приватный
  SPA) — и он не закрыл бы доменные вопросы (CTA-ссылка, `KeyHint`, i18n, темы),
  а удвоил бы их. Пересмотр позиции «CSS без фреймворков» — если понадобится —
  отдельный ADR, не через кнопку.
- **Button-only без полиморфизма.** Свести CTA к `<button onclick={goto()}>`
  можно, но цена сосредоточена на главной точке входа лендинга: потеря свойств
  ссылки (новая вкладка, preload, семантика). Отвергнуто в пользу полиморфизма.
- **Матрица `style × tone`** вместо семантических имён. Даёт комбинации, которых
  в продукте нет (`ghost` + `danger`). Выбраны семантические имена в один параметр
  `variant` (читаемее на call-site, YAGNI).
- **Втягивание сегмента и каретки.** `SessionDurationSelector .segment` — член
  переключатель-группы (selected-состояние, `flex:1`), будущий `ui/SegmentedControl`.
  `Wordmark .caret` — глиф логотипа, не интерактив. Оба делят с кнопкой только
  токен цвета.
- **`SurveyPrompt .dismiss`** (bare-text кнопка без фона/границы) и
  **`SignInScreen .btn-dev`** (dev-only, dashed, вне контракта тем — ADR 0012)
  не мигрируют: одиночные, не часть дублирующегося семейства.
- **`ui/Surface`** (консолидация surface-плашек) — отдельный спек. Button делит
  с Surface только роль-токены, но не код; смешивать контейнер и элемент управления в один
  примитив не станем.

## Область неопределённости

- **Согласование foreground → `--color-on-dense`** и **переопределение фона `.answer`**
  выведены из ролей, а не измерены. Сверить на витрине: если тон текста плотных
  кнопок футера или контраст `.answer` внутри карточки визуально просядут —
  откатить точечно.
- **Повышение stats-«назад» до `<a>`** меняет механику перехода (SvelteKit
  перехватывает клик по `<a href>` в клиентскую навигацию — поведение
  эквивалентно `goto`, плюс свойства ссылки). Сверить, что переход работает.
