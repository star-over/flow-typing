# Растворение слоя 3 (контракт компонентов) — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Растворить транзитный слой 3 (компонентные токены `--<компонент>-*`): компоненты начинают ссылаться на роли L2 (`--color-*`) напрямую, L3-токены удаляются из тем, тема сводится к целевой 2-слойной модели (ядро + роли) ADR 0029.

**Architecture:** Растворение — **устранение** слоя, не перенос. Каждый L3-токен инлайнится в компонент: цветовой слот → `var(--color-*)`, структурная геометрия (`1px solid`, кольца, `0.38`) → литерал прямо в CSS компонента; сам токен удаляется. Инлайн эквивалентен по семантике CSS custom properties (подстановка значения в момент использования), поэтому фаза миграции компонентов **визуально-нейтральна** — исключения ровно два (динамическая сборка имени токена). Порядок: сперва мигрируем все компоненты (темы ещё несут L3, безвредно), затем одним махом срезаем L3 из тем + переписываем тест + сносим TS-слой контракта.

**Tech Stack:** CSS custom properties (Svelte `<style>`), Vitest (`src/themes/contract.test.ts`), `make check` (svelte-check), `make build`, Storybook (визуальная сверка компонентов), `make check-all` (перед мержем).

---

## Канон (читать перед работой; НЕ пере-обсуждать)

- **`docs/adr/0029-theming-target-model-and-layer-conventions.md`** — целевая 2-слойная модель; «компоненты привязываются к L2 напрямую»; в consequences: «когда контракт растворится… отпадут его конвенции — именование по свойству и граница „геометрия против цвета“ на компонентном слое». Растворение — **реализация** этого ADR; решение не меняется → нового ADR не заводим.
- **`src/themes/CLAUDE.md`** — трёхслойка (после растворения → двухслойка), индикатор готовности L2 (достигнут).
- **`docs/06-component-contracts-and-themes.md`** — вся глава описывает контракт, который растворяем; переписывается (Фаза D).
- **`src/themes/roles.ts`** — `ROLE_DICTIONARY` (73 роли L2). **Остаётся** — это целевой слой.
- **`src/themes/sepia.css`** — эталон значений L3 (раз diff между темами = 0, значения sepia каноничны для инлайна).

## Решения грилл-сессии 2026-07-19 (ПРИМЕНЯЕМ, не пере-обсуждаем)

1. **Растворение = устранение L3.** Компонент ссылается на роль напрямую; L3-токен удаляется. Никакого общего `contract.css` / переноса — это была ошибка ранней грани, отброшена.
2. **Body-fallback снят.** `app.css` `body{}` ссылается на роли напрямую; литералы `--body-background`/`--body-color` в `:root` удаляются. Безопасно: head-скрипт в `app.html` ставит `data-theme` синхронно **до** инъекции CSS-`<link>` (`app.html:43-60`) → окна без темы для JS-on пользователя не существует; JS-off = пустой SPA, косметика.
3. **TS-слой контракта удалён:** `contract.ts` + ~20 `*.contract.ts` (единственный потребитель — тест; тип `ThemeContractToken` не используется; компоненты `*.contract.ts` не импортируют).
4. **`contract.test.ts` переписан** под 2-слойный мир (см. Task B1).
5. **Заход закрывает тему целиком (вариант 2):** растворение + выжившие backlog-пункты + усиление теста.
6. **9 мёртвых sign-in токенов** (github/yandex/disclaimer — UI сейчас рендерит только google) удаляются вместе с L3; возврат провайдера позже ссылается на роли напрямую (те же `--color-primary-*`, что у google).

## Миграция-поверхность (факты, померено скриптом)

- **231 L3-токен**, дословно идентичны во всех 4 темах (diff = 0 — перепроверено). Значение sepia = канон для инлайна.
- **268 статических ссылок** `var(--<L3>)` в 27 файлах (25 компонентов + `src/routes/stats/+page.svelte` + `src/app.css`) — механический инлайн. *(fallback-aware grep по префиксам даёт 272; 4 «лишних» — компонентные локали `--keycap-unit`×1 и `--avatar-size`×3, НЕ L3; см. «Ловушка префикс-гейтов».)*
- **2 динамические сборки имени** (литерального имени токена в коде нет — не ловится грепом; требуют переписи логики, НЕ инлайна):
  - `MovementPath.svelte:44` — `var(--movement-path-${fingerId.toLowerCase()}-marker, currentColor)` → 10 токенов `--movement-path-{l1..r5}-marker`.
  - `LandingHandsDemo.svelte:133` — `var(--finger-${targetKey.finger.toLowerCase()}-fill)` → позиционные `--finger-{l1..rb}-fill`.
- **1 fallback-стиль:** `--wordmark-pending-opacity` через `var(--wordmark-pending-opacity, 0.38)` (Wordmark.svelte:74); значение токена = `0.38`.
- **9 реально мёртвых** (0 ссылок): `--sign-in-screen-disclaimer-color`, `--sign-in-screen-btn-{github,yandex}-{background,color,border,hover-background}`.

**Почему безопасно (опора):** по семантике CSS custom properties `var(--X)`, где `--X: V`, вычисляется идентично инлайну `V` в любом контексте (шорхенд, множественный `box-shadow`, `linear-gradient`, `var(--X, fb)` → `V`). Значит Фаза A не двигает картинку по построению. Единственные не-подстановочные точки — 2 динамические сборки (Task A3, A13).

**Почему компоненты первыми, темы потом:** L3-токены разделяются между компонентами (`--select-*` → Select+SessionDurationSelector; `--settings-page-*` → 3 файла; `--finger-*-fill` → Finger+LandingHandsDemo; `--header-border` → Header+LanguageSwitcher; `--landing-*` → LandingScreen+LandingHandsDemo). Токен нельзя убрать из тем, пока не мигрированы ВСЕ его потребители. Срез L3 из тем — глобальный шаг Фазы B после всей Фазы A.

**Ловушка префикс-гейтов (находка аудита плана — читать перед версткой гейтов/теста).** Префикс имени НЕ отличает L3-токен от двух других видов имён, поэтому ни гейт, ни тест не должны опираться на «префикс `--keycap-`/`--avatar-`/… ⇒ L3»:
- **Компонентные локальные переменные** с легаси-префиксом, не входящие в тему и переживающие миграцию: `--keycap-unit` (`KeyCap.svelte:60/69`, размер клавиши) и `--avatar-size` (`Avatar.svelte`, inline `style="--avatar-size:{size}"`, использования :43/:44/:64). Их ровно две — подтверждено (272 − 268 = 4 ссылки = keycap-unit×1 + avatar-size×3).
- **Приватные ядерные токены тем** с «контрактными» именами: у `light`/`dark`/`nord` ядро содержит `--finger-1..5`, `--keycap-tint-1`, `--keycap-edge-1`, `--avatar-fill`, `--avatar-ink`, у `nord` ещё `--keycap-label`, `--keycap-marker`. (У `sepia` ядро чистое — потому эталон и не показал проблему.)

Следствия для верификации: (1) grep-гейты Фазы A — по **точным именам токенов задачи** или с `grep -v` исключением известной локали (ожидаем «только локаль», не «пусто»); (2) остаток L3 **в темах** ловим **L1-дисциплиной** (ядерный токен со значением-`var()` = недосрезанный L3), а НЕ префиксом; (3) валидность `var(--color-*)` — с carve-out двух динамических захватов по `${`.

## Диагностика и мерило прогресса

Регенерировать резолвер (в `tmp/`, при подчистке — переписать по шву comment-aware парсера `contract.test.ts`): парсит `:root[data-theme="X"]` блоки, вычитает CSS-комментарии `.replace(/\/\*[\s\S]*?\*\//g,'')`, L3-набор = общие (во всех темах) не-`--color-*`, не-`color-scheme` токены.

Верификация по ходу (**fallback-aware** паттерны — обычный `var(--token)` пропускает `var(--token, fb)`):

```bash
# L3-ссылки, оставшиеся в коде (цель Фазы A → 0). Исключаем две компонентные
# локали, что делят префикс, но НЕ являются L3-токенами (см. «Ловушка префикс-гейтов»).
grep -rhoE "var\(\s*--(keycap|finger|hands|movement-path|flow-line|cursor-symbol|regular-symbol|rhythm-channel|footer-actions|header|main-content|select|session-stats-display|repertoire-progress|survey-prompt|settings-page|sign-in-screen|user-menu|avatar|wordmark|landing|body)-[a-z0-9-]+" src/components src/routes src/app.css | grep -vE "keycap-unit|avatar-size" | wc -l

# динамические сборки имени (должны остаться только как --color-route / --color-finger после A3/A13)
grep -rnE 'var\(--[a-z-]*\$\{' src/components src/routes
```

## BSD-предупреждение (урок прошлых сессий)

`sed` на macOS не поддерживает `\b`; `grep -E` поддерживает, но `\b` ловит и дефис. **Все правки CSS/Svelte — Edit-инструментом, не sed.** `make spell` перед коммитом проверять **без пайпа** (`| tail` маскирует код возврата).

---

## Фаза A — миграция компонентов (темы не трогаем; визуально-нейтрально)

### Общая процедура механической задачи (относится к A0, A1, A2, A4–A12 и статической части A13)

Для файла из задачи, для **каждого** L3-токена из его таблицы:
1. Найти в `<style>` (или `app.css`) обращение `var(--<токен>)` (в т.ч. `var(--<токен>, fb)`).
2. Заменить его на **значение** из таблицы (столбец «→»). Для составных значений геометрия (`1px solid`, `inset …`, `0 0 0 …`, число) переезжает в CSS компонента буквально.
3. Токен в темах НЕ трогать (срез — Фаза B).

**Верификация каждой механической задачи (Steps):**
- Step «grep до»: обращения к токенам файла присутствуют (fallback-aware grep выше по файлу).
- Step «правка»: заменить по таблице (Edit).
- Step «grep после»: `grep -nE "var\(\s*--(<префиксы токенов этого файла>)-" <файл>` → **пусто** (исключение: KeyCap оставляет локаль `--keycap-unit`, Avatar — `--avatar-size`; для них `… | grep -v <локаль>`).
- Step «check»: `make check` (svelte-check) — без новых ошибок.
- Step «визуал»: `make storybook` → соответствующая story рендерится как раньше (или отметить, если story нет — норма).
- Step «commit»: `git add <файл> && git commit -m "refactor(themes): dissolve L3 in <компонент> → roles"`.

---

### Task A0: `src/app.css` — body на роли + снятие fallback

**Files:** Modify `src/app.css`

Токены body: `--body-background` → `var(--color-background)`; `--body-color` → `var(--color-text-primary)`.

- [ ] **Step 1:** В `body{}` заменить `background: var(--body-background)` → `background: var(--color-background)`; `color: var(--body-color)` → `color: var(--color-text-primary)`.
- [ ] **Step 2:** Удалить блок BODY FALLBACK в `:root` (строки с `--body-background: oklch(1 0 0);` и `--body-color: oklch(0.14 0 0);` + их шапку-комментарий).
- [ ] **Step 3:** На место комментария вписать (почему нет FOUC):

```css
  /* Тему ставит синхронный head-скрипт (src/app.html) ДО инъекции CSS-link —
   * data-theme установлен к первому применению стилей, окна без темы нет.
   * Поэтому body ссылается на роли напрямую, fallback-литералы не нужны. */
```

- [ ] **Step 4:** Обновить комментарий-абзац про «контрактные токены живут ТОЛЬКО в темах» → «компоненты ссылаются на роли `--color-*` напрямую; контрактного слоя больше нет».
- [ ] **Step 5:** `make check` + `make build` — зелёно; body окрашен во всех темах (визуал Фаза E).
- [ ] **Step 6:** Commit: `refactor(themes): body → roles directly, drop fallback (dissolve L3)`.

### Task A1: `src/components/key-cap/KeyCap.svelte` — 80 токенов

**Files:** Modify `src/components/key-cap/KeyCap.svelte`

Таблица (токен → значение). Все обращения — по одному, в `<style>` KeyCap.

Базовые:
- `--keycap-color` → `var(--color-keycap-label)`
- `--keycap-marker-background` → `var(--color-keycap-marker)`
- `--keycap-home-ring` → `inset 0 0 0 0.1rem var(--color-keycap-label), 0 0 0 0.15rem var(--color-gap)`

Path-ring (L/R × 1..5): `--keycap-{l,r}{N}-path-ring` → `inset 0 0 0 0.14rem var(--color-route-{N}), 0 0 0 0.15rem var(--color-gap)` (N — цифра позиции).

Per-position fill/border/color (L/R × 1..5):
- `--keycap-{l,r}{N}-background` → `var(--color-keycap-group-{N}-background)`
- `--keycap-{l,r}{N}-border` → `1px solid var(--color-keycap-group-{N}-border)`
- `--keycap-{l,r}{N}-color` → `var(--color-keycap-label)`

Per-position target (L/R × 1..5):
- `--keycap-{l,r}{N}-target-background` → `var(--color-target-{N})`
- `--keycap-{l,r}{N}-target-color` → `var(--color-on-dense)`
- `--keycap-{l,r}{N}-target-ring` → `0 0 0 0.15rem var(--color-gap)`

Press result:
- `--keycap-correct-background` → `var(--color-keycap-correct-background)`
- `--keycap-correct-color` → `var(--color-on-dense)`
- `--keycap-correct-border` → `1px solid var(--color-keycap-correct-border)`
- `--keycap-correct-ring` → `0 0 0 0.15rem var(--color-gap)`
- `--keycap-error-background` → `var(--color-keycap-error-background)`
- `--keycap-error-color` → `var(--color-keycap-error-foreground)`
- `--keycap-error-border` → `1px solid var(--color-keycap-error-border)`

По общей процедуре. Grep после: `grep -nE "var\(\s*--keycap-" src/components/key-cap/KeyCap.svelte` → только `var(--keycap-unit)` (:69, локаль размера, не L3, остаётся); `… | grep -v keycap-unit` → пусто.

### Task A2: hands-scene статические — `Finger.svelte` + `HandsScene.svelte`

**Files:** Modify `src/components/hands-scene/Finger.svelte`, `src/components/hands-scene/HandsScene.svelte`

Finger (15):
- `--finger-{l,r}{N}-fill` → `var(--color-finger-{N})` (N=1..5)
- `--finger-{lb,rb}-fill` → `var(--color-finger-base)`
- `--finger-inactive-fill` → `var(--color-finger-inactive)`
- `--finger-idle-fill` → `var(--color-finger-idle)`
- `--finger-error-fill` → `var(--color-finger-error)`

HandsScene (1):
- `--hands-center-point-fill` → `var(--color-path-highlight)`

Grep после: `grep -nE "var\(\s*--(finger|hands)-" src/components/hands-scene/{Finger,HandsScene}.svelte` → пусто.

### Task A3: `src/components/hands-scene/MovementPath.svelte` — динамическая перепись + статика

**Files:** Modify `src/components/hands-scene/MovementPath.svelte`

Статика:
- `--movement-path-guide` → `var(--color-path-highlight)` (в `<style>`, `.guide { stroke: … }`)
- `--movement-path-marker-core` → `var(--color-marker-core)` (4 обращения: `.mc-specular/.mc-upper/.mc-body/.mc-edge` в `oklch(from var(--movement-path-marker-core) …)` → `oklch(from var(--color-marker-core) …)`)

Динамика (строка 44) — маркеры `--movement-path-{pos}-marker` резолвятся по вычисленному имени; их 10 значений = `var(--color-route-{N})`. `fingerId` — 2-символьный `FingerId` (`L1..R5|LB|RB`); второй символ — цифра позиции или `B`.

- [ ] **Step 1:** Заменить строку 44:

```ts
// БЫЛО:
const markerColor = $derived(`var(--movement-path-${fingerId.toLowerCase()}-marker, currentColor)`);
// СТАЛО:
const markerColor = $derived(`var(--color-route-${fingerId[1].toLowerCase()}, currentColor)`);
```

Эквивалентность: `L1`→`var(--color-route-1, currentColor)` (= прежний `--movement-path-l1-marker` = route-1); `LB`→`var(--color-route-b, currentColor)` — роли `--color-route-b` нет → `currentColor` (прежний `--movement-path-lb-marker` не существовал → `currentColor`). Значение сохранено для всех позиций.

- [ ] **Step 2:** Инлайнить статику (`--movement-path-guide`, `--movement-path-marker-core`) по таблице.
- [ ] **Step 3:** Обновить комментарий (строки 17-18, 46-48) — «цвет маршрута берётся из роли `--color-route-N`, тело — `--color-marker-core`»; добавить строку «букву руки (L/R) роняем намеренно — цвет позиционный, `--color-route-N` одинаков для обеих рук» (чтобы `fingerId[1]` не приняли за баг).
- [ ] **Step 4:** grep после: `grep -nE "var\(\s*--movement-path-" src/components/hands-scene/MovementPath.svelte` → пусто; `grep -n "color-route" src/components/hands-scene/MovementPath.svelte` → строка 44.
- [ ] **Step 5:** `make check`; Storybook MovementPath — спектр маркеров L1..R5 как раньше, тело-бусина как раньше.
- [ ] **Step 6:** Commit: `refactor(themes): dissolve L3 in MovementPath (dynamic markers → --color-route-N)`.

### Task A4: flow-line — `FlowLine.svelte` + `CursorSymbol.svelte` + `RegularSymbol.svelte`

**Files:** Modify all three in `src/components/flow-line/`

FlowLine (3):
- `--flow-line-border` → `2px solid var(--color-border)`
- `--flow-line-correct-background` → `var(--color-success-dim)`
- `--flow-line-error-background` → `var(--color-error-dim)`

CursorSymbol (2):
- `--cursor-symbol-background` → `var(--color-cursor-background)`
- `--cursor-symbol-color` → `var(--color-cursor-foreground)`

RegularSymbol (5):
- `--regular-symbol-pending-color` → `var(--color-symbol-pending)`
- `--regular-symbol-correct-color` → `var(--color-symbol-correct)`
- `--regular-symbol-corrected-color` → `var(--color-symbol-corrected)`
- `--regular-symbol-one-error-color` → `var(--color-symbol-one-error)`
- `--regular-symbol-many-errors-color` → `var(--color-symbol-many-errors)`

Grep после: `grep -nE "var\(\s*--(flow-line|cursor-symbol|regular-symbol)-" src/components/flow-line/*.svelte` → пусто.

### Task A5: `src/components/rhythm-channel/RhythmChannel.svelte` — 8 токенов

**Files:** Modify `src/components/rhythm-channel/RhythmChannel.svelte`

- `--rhythm-channel-track-background` → `var(--color-surface)`
- `--rhythm-channel-track-border` → `1px solid var(--color-border)`
- `--rhythm-channel-zone-fill` → `var(--color-success-dim)` (3 обращения)
- `--rhythm-channel-marker-in` → `var(--color-success)` (2 обращения)
- `--rhythm-channel-marker-outside` → `var(--color-rhythm-outside)`
- `--rhythm-channel-state-fill` → `var(--color-rhythm-outside-dim)` (2 обращения)
- `--rhythm-channel-anchor` → `var(--color-text-secondary)`
- `--rhythm-channel-trail` → `var(--color-text-dim)` (2 обращения)

Grep после: `grep -nE "var\(\s*--rhythm-channel-" …` → пусто.

### Task A6: app shell — `FooterActions.svelte` + `MainContent.svelte`

**Files:** Modify `src/components/app/FooterActions.svelte`, `src/components/app/MainContent.svelte`

FooterActions (10):
- `--footer-actions-btn-background` → `var(--color-surface)`
- `--footer-actions-btn-color` → `var(--color-text-primary)`
- `--footer-actions-btn-border` → `1px solid var(--color-border)`
- `--footer-actions-btn-hover-background` → `var(--color-surface-hover)`
- `--footer-actions-btn-primary-background` → `var(--color-primary-background)`
- `--footer-actions-btn-primary-color` → `var(--color-background)`
- `--footer-actions-btn-primary-border` → `1px solid var(--color-primary-background)`
- `--footer-actions-btn-success-background` → `var(--color-success)`
- `--footer-actions-btn-success-color` → `var(--color-background)`
- `--footer-actions-btn-success-border` → `1px solid var(--color-success)`

MainContent (1): `--main-content-pause-color` → `var(--color-text-secondary)`

> **NB:** зашитый `opacity: 0.9` на hover primary/success (backlog П.6) — **не трогаем здесь**, это дизайн-пункт Фазы C.

Grep после: `grep -nE "var\(\s*--(footer-actions|main-content)-" …` → пусто.

### Task A7: header — `Header.svelte` + `LanguageSwitcher.svelte`

**Files:** Modify `src/components/header/Header.svelte`, `src/components/header/LanguageSwitcher.svelte`

- `--header-border` → `1px solid var(--color-border)` (Header + LanguageSwitcher, суммарно 3 обращения)

Grep после: `grep -nE "var\(\s*--header-" src/components/header/*.svelte` → пусто.

### Task A8: select-семья — `ui/Select.svelte` + `settings/SessionDurationSelector.svelte`

**Files:** Modify `src/components/ui/Select.svelte`, `src/components/settings/SessionDurationSelector.svelte`

Select-токены (в обоих файлах):
- `--select-background` → `var(--color-surface)`
- `--select-border` → `1px solid var(--color-border)`
- `--select-color` → `var(--color-text-primary)`
- `--select-focus-outline` → `2px solid var(--color-border)`
- `--select-arrow-background` → `var(--color-text-secondary)` (только Select)

SessionDurationSelector дополнительно ссылается на «чужие» токены (заменить их значениями тоже):
- `--settings-page-label-color` → `var(--color-text-secondary)`
- `--landing-cta-background` → `var(--color-brand-accent)`
- `--landing-cta-color` → `var(--color-cursor-foreground)`

Grep после: `grep -nE "var\(\s*--(select|settings-page|landing)-" src/components/ui/Select.svelte src/components/settings/SessionDurationSelector.svelte` → пусто.

### Task A9: train — `SessionStatsDisplay.svelte` + `RepertoireProgress.svelte` + `SurveyPrompt.svelte`

**Files:** Modify все три в `src/components/train/`

SessionStatsDisplay (18):
- `--session-stats-display-background` → `var(--color-surface)`
- `--session-stats-display-border` → `1px solid var(--color-border)`
- `--session-stats-display-divider` → `1px solid var(--color-border)` (6 обращений)
- `--session-stats-display-label-color` → `var(--color-text-secondary)`
- `--session-stats-display-value-color` → `var(--color-text-primary)` (2)
- `--session-stats-display-unit-color` → `var(--color-text-secondary)`
- `--session-stats-display-note-color` → `var(--color-text-secondary)`
- `--session-stats-display-trend-color` → `var(--color-text-secondary)`
- `--session-stats-display-info-border` → `1px solid var(--color-border)`
- `--session-stats-display-info-color` → `var(--color-text-secondary)`
- `--session-stats-display-info-hover-background` → `var(--color-surface-hover)`
- `--session-stats-display-info-open-background` → `var(--color-text-primary)`
- `--session-stats-display-info-open-color` → `var(--color-surface)`
- `--session-stats-display-info-body-color` → `var(--color-text-secondary)`
- `--session-stats-display-info-body-border` → `1px solid var(--color-border)`
- `--session-stats-display-link-color` → `var(--color-text-primary)`
- `--session-stats-display-link-border` → `1px solid var(--color-border)`
- `--session-stats-display-link-hover-border` → `1px solid var(--color-text-primary)`

RepertoireProgress (7):
- `--repertoire-progress-background` → `var(--color-surface)`
- `--repertoire-progress-border` → `1px solid var(--color-border)`
- `--repertoire-progress-label-color` → `var(--color-text-muted)` (3)
- `--repertoire-progress-value-color` → `var(--color-text-primary)` (2)
- `--repertoire-progress-bar-track` → `var(--color-background)`
- `--repertoire-progress-bar-fill` → `var(--color-success)`
- `--repertoire-progress-accent-color` → `var(--color-success)` (2)

SurveyPrompt (9):
- `--survey-prompt-background` → `var(--color-surface)`
- `--survey-prompt-border` → `1px solid var(--color-border)`
- `--survey-prompt-question-color` → `var(--color-text-primary)`
- `--survey-prompt-button-background` → `var(--color-background)`
- `--survey-prompt-button-border` → `1px solid var(--color-border)`
- `--survey-prompt-button-color` → `var(--color-text-primary)`
- `--survey-prompt-button-hover-background` → `var(--color-surface-hover)`
- `--survey-prompt-thanks-color` → `var(--color-text-secondary)`
- `--survey-prompt-dismiss-color` → `var(--color-text-secondary)`

Grep после: `grep -nE "var\(\s*--(session-stats-display|repertoire-progress|survey-prompt)-" src/components/train/*.svelte` → пусто.

### Task A10: settings — `SettingsPage.svelte` + `TrainingSettingsSection.svelte` + `routes/stats/+page.svelte`

**Files:** Modify `src/components/settings/SettingsPage.svelte`, `src/components/settings/TrainingSettingsSection.svelte`, `src/routes/stats/+page.svelte`

settings-page токены (распределены по трём файлам):
- `--settings-page-label-color` → `var(--color-text-secondary)` (SettingsPage + TrainingSettingsSection; SessionDurationSelector уже покрыт в A8)
- `--settings-page-input-background` → `var(--color-surface)`
- `--settings-page-input-color` → `var(--color-text-primary)`
- `--settings-page-input-border` → `1px solid var(--color-border)`
- `--settings-page-btn-background` → `var(--color-surface)` (SettingsPage + routes/stats)
- `--settings-page-btn-color` → `var(--color-text-primary)` (SettingsPage + routes/stats)
- `--settings-page-btn-border` → `1px solid var(--color-border)` (SettingsPage + routes/stats)
- `--settings-page-btn-hover-background` → `var(--color-surface-hover)` (SettingsPage + routes/stats)
- `--settings-page-danger-btn-background` → `var(--color-error)`
- `--settings-page-danger-btn-color` → `var(--color-on-dense)`
- `--settings-page-danger-btn-border` → `1px solid var(--color-error)`
- `--settings-page-danger-btn-hover-background` → `var(--color-error-hover)`
- `--settings-page-danger-text-color` → `var(--color-error)` (2)

Grep после: `grep -nE "var\(\s*--settings-page-" src/components/settings/*.svelte src/routes/stats/+page.svelte` → пусто.

### Task A11: auth — `SignInScreen.svelte` + `UserMenu.svelte` + `Avatar.svelte`

**Files:** Modify `src/components/auth/SignInScreen.svelte`, `src/components/auth/UserMenu.svelte`, `src/components/ui/Avatar.svelte`

SignInScreen — используются только google-токены (github/yandex/disclaimer мёртвые, удаляются в Фазе B):
- `--sign-in-screen-background` → `var(--color-surface)`
- `--sign-in-screen-title-color` → `var(--color-text-primary)`
- `--sign-in-screen-btn-google-background` → `var(--color-primary-background)`
- `--sign-in-screen-btn-google-color` → `var(--color-on-dense)`
- `--sign-in-screen-btn-google-border` → `1px solid var(--color-primary-border)`
- `--sign-in-screen-btn-google-hover-background` → `var(--color-primary-hover)`

UserMenu (8):
- `--user-menu-loading-color` → `var(--color-symbol-pending)` (натяжка семантики — backlog Фаза C; здесь инлайним как есть)
- `--user-menu-guest-link-color` → `var(--color-link)`
- `--user-menu-guest-link-hover-color` → `var(--color-link-hover)`
- `--user-menu-authenticated-name-color` → `var(--color-text-primary)` (2)
- `--user-menu-dropdown-background` → `var(--color-surface-raised)`
- `--user-menu-dropdown-border` → `1px solid var(--color-border-accent)` (2)
- `--user-menu-dropdown-item-color` → `var(--color-text-primary)` (2)
- `--user-menu-dropdown-item-hover-background` → `var(--color-surface-hover)`

Avatar (3):
- `--avatar-background` → `var(--color-surface-accent)`
- `--avatar-color` → `var(--color-ink-strong)`
- `--avatar-border` → `1px solid var(--color-border-accent)`

Grep после: `grep -nE "var\(\s*--(sign-in-screen|user-menu|avatar)-" src/components/auth/*.svelte src/components/ui/Avatar.svelte` → только `var(--avatar-size)` ×3 (локаль размера в Avatar, не L3, остаётся); `… | grep -v avatar-size` → пусто.

### Task A12: `src/components/ui/Wordmark.svelte` — 5 токенов (вкл. fallback-opacity)

**Files:** Modify `src/components/ui/Wordmark.svelte`

- `--wordmark-ink` → `var(--color-text-primary)`
- `--wordmark-caret-background` → `var(--color-brand-accent)`
- `--wordmark-caret-color` → `var(--color-cursor-foreground)`
- `--wordmark-bar-background` → `var(--color-path-highlight)`
- `--wordmark-pending-opacity` → `0.38` (строка 74: `opacity: var(--wordmark-pending-opacity, 0.38)` → `opacity: 0.38`)

Grep после: `grep -nE "var\(\s*--wordmark-" src/components/ui/Wordmark.svelte` → пусто.

### Task A13: landing — `LandingScreen.svelte` (статика) + `LandingHandsDemo.svelte` (динамика)

**Files:** Modify `src/components/landing/LandingScreen.svelte`, `src/components/landing/LandingHandsDemo.svelte`

Статика (оба файла):
- `--landing-cta-background` → `var(--color-brand-accent)`
- `--landing-cta-color` → `var(--color-cursor-foreground)`
- `--landing-cta-border` → `1px solid transparent`
- `--landing-cta-hover-background` → `var(--color-brand-accent-hover)`
- `--landing-muted-color` → `var(--color-text-secondary)`
- `--landing-rule` → `1px solid var(--color-border)`
- `--landing-demo-path` → `var(--color-path-highlight)`
- `--landing-demo-surface` → `var(--color-surface)`

Динамика (LandingHandsDemo.svelte:133) — `--finger-{pos}-fill` резолвится по имени; значения = `var(--color-finger-{N})`, а для `lb/rb` = `var(--color-finger-base)`. В ЭТОМ компоненте локальный `FingerId` — только L2..R5 (больших пальцев нет), так что ветка `b`→`base` здесь недостижима; держим её future-proof (наивный `finger[1]` дал бы несуществующий `--color-finger-b`). Явная ветка:

- [ ] **Step 1:** Заменить строку 133:

```ts
// БЫЛО:
const dotColor = $derived(targetKey ? `var(--finger-${targetKey.finger.toLowerCase()}-fill)` : 'transparent');
// СТАЛО:
const dotColor = $derived.by(() => {
  if (!targetKey) return 'transparent';
  const pos = targetKey.finger[1].toLowerCase(); // '1'..'5' | 'b'
  return `var(--color-finger-${pos === 'b' ? 'base' : pos})`;
});
```

Эквивалентность: `L1`→`var(--color-finger-1)` (= прежний `--finger-l1-fill`); `LB`→`var(--color-finger-base)` (= прежний `--finger-lb-fill`). Добавить комментарий «букву руки роняем намеренно — цвет позиционный».

- [ ] **Step 2:** Инлайнить статику landing по таблице (оба файла).
- [ ] **Step 3:** grep после: `grep -nE "var\(\s*--(landing|finger)-" src/components/landing/*.svelte` → пусто; `grep -n "color-finger" src/components/landing/LandingHandsDemo.svelte` → строка ~133.
- [ ] **Step 4:** `make check`; Storybook Landing/LandingHandsDemo — цвет точки по пальцу цели как раньше.
- [ ] **Step 5:** Commit: `refactor(themes): dissolve L3 in landing (dynamic finger fill → --color-finger-N)`.

### Task A-GATE: подтвердить, что код больше не ссылается на L3

- [ ] **Step 1:** Fallback-aware grep (из «Диагностика», уже с `grep -vE "keycap-unit|avatar-size"`) → **0** статических L3-ссылок.
- [ ] **Step 2:** `grep -rnE 'var\(--[a-z-]*\$\{' src/components src/routes` → только `--color-route-` (MovementPath) и `--color-finger-` (LandingHandsDemo).
- [ ] **Step 3:** `make check` + `make build` — зелёно.

---

## Фаза B — срез L3 из тем + переписка теста + снос TS-слоя

### Task B1: переписать `src/themes/contract.test.ts` под 2 слоя

**Files:** Modify `src/themes/contract.test.ts`

Тест перестаёт импортировать `THEME_CONTRACT`; источники — `ROLE_DICTIONARY`, `THEMES`, `_template.css`, скан `src/**/*.svelte` + `src/app.css`. **Без префиксных эвристик** (см. «Ловушка префикс-гейтов»): остаток L3 в темах ловит L1-дисциплина, остаток L3-ссылок в компонентах — с исключением двух известных локалей.

Инварианты:

1. **Роли объявлены.** Каждая тема из `THEMES` **и** `_template.css` декларирует каждую роль `ROLE_DICTIONARY`. *(Добавляем `_template` — прежний тест проверял его по `THEME_CONTRACT`; теперь по ролям, иначе шаблон незаметно дрейфует от словаря.)*
2. **L1-дисциплина = и есть страж «нет недосрезанного L3 в теме».** Токен без префикса `--color-` и не `color-scheme` — ядро, значение **без `var()`**. Недосрезанный L3 (`--keycap-l1-background: var(...)`) — не `--color-`, но с `var()` → падает здесь. Приватное ядро (`--finger-1`, `--keycap-tint-1`, `--avatar-fill`…) — абсолюты, проходит. Префикс не используется вообще.
3. **L2-дисциплина:** `--color-*` начинается с `var(` или `oklch(from var(`.
4. **Валидность ролей в ссылках.** Собрать `var(--color-<X>)` из всех тем, `src/**/*.svelte`, `src/app.css`; каждый `<X>` ∈ `ROLE_DICTIONARY`. **Carve-out:** пропускать любое `var(...)`, содержащее `${` (два динамических захвата `--color-route-${…}` / `--color-finger-${…}` — валидируются в A3/A13, это не имена ролей). Скан — **по всему файлу** (динамика живёт в `<script>`, не только в `<style>`). Новая гарантия: ссылка на несуществующую роль падает тестом (раньше — только svelte-check по факту).
5. **Компоненты не ссылаются на легаси-L3.** Ни один `src/**/*.svelte` / `src/app.css` не содержит `var(--<легаси-префикс>-…)` (fallback-aware, набор префиксов — как в «Диагностике»), **кроме** двух компонентных локалей `--keycap-unit`, `--avatar-size` (документированное исключение — это размеры, не токены темы).
6. **Дубли имён и циклы.** *(Фолд backlog «усилить контракт-тест».)* Детект дублей требует **dup-preserving** парса: `parseRootTokens` отдаёт `Record` (последнее-побеждает → дубли невидимы, ровно слепота из backlog). Добавить `parseRawDeclarations(path, selector): Array<[name, value]>` и проверить отсутствие дублей имён в блоке темы. Циклы: построить граф `--A → {--B, …}` из `var(--B)` в значении `--A` внутри блока темы, DFS — цикл (в т.ч. само-ссылка) роняет тест. (Ровно этот баг: nord `--keycap-correct-*` core↔contract → цикл → прозрачность, fix `2e763a6`.)
7. Сохранить блоки `registry ↔ filesystem`, `app.html inline bootstrap`.

- [ ] **Step 1 (RED):** Написать новый тест. После Фазы A компоненты уже мигрированы, поэтому п.4/5 зелёные; **RED-драйвер — п.2 (L1-дисциплина)**: темы ещё несут L3-токены со значением-`var()`, классифицируемые как ядро → FAIL. Запустить `npx vitest run src/themes/contract.test.ts` — ожидаем FAIL на L1-дисциплине.
- [ ] **Step 2:** Убедиться, что FAIL именно по п.2 (недосрезанный L3), а не по сломанной логике теста — сообщение содержит имя L3-токена + его `var()`-значение.
- [ ] **Step 3:** Commit: `test(themes): rewrite contract test for 2-layer model (RED before strip)`.

### Task B2: срезать L3 из 5 файлов тем (+ 9 мёртвых sign-in токенов)

**Files:** Modify `src/themes/sepia.css`, `light.css`, `dark.css`, `nord.css`, `_template.css`

- [ ] **Step 1:** В каждом файле удалить **всю секцию «СЛОЙ 3 · КОНТРАКТ КОМПОНЕНТОВ»** (от её шапки-комментария до конца блока `:root[...]`, перед `}`). Это все 231 токен `--<компонент>-*`, включая 9 мёртвых sign-in и `--body-*`. Роли (`--color-*`) и ядро — оставить.
- [ ] **Step 2:** В `_template.css` — то же (секция L3 → удалить); шапку-инструкцию правим в Фазе D.
- [ ] **Step 3 (GREEN):** `npx vitest run src/themes/contract.test.ts` — весь зелёный.
- [ ] **Step 4:** `make check` + `make build`.
- [ ] **Step 5:** Commit: `refactor(themes): strip dissolved L3 from all themes (GREEN)`.

### Task B3: снести TS-слой контракта

**Files:** Delete `src/themes/contract.ts` и все `*.contract.ts` — **22 файла** (`git ls-files '*.contract.ts'`: `src/Root.contract.ts` в корне src + 21 компонентный)

- [ ] **Step 1:** Убедиться, что `contract.test.ts` (после B1) не импортирует `./contract`. `grep -rn "\.contract'" src` → только сами файлы (никто не потребляет).
- [ ] **Step 2:** Удалить `src/themes/contract.ts`.
- [ ] **Step 3:** Удалить все `*.contract.ts` по списку из git (22 файла, включая `src/Root.contract.ts`): `git rm $(git ls-files '*.contract.ts')`. *(Не полагаться на glob `src/**` — в bash без `globstar` не раскроется; список из `git ls-files` надёжнее.)*
- [ ] **Step 4:** `make check` (нет висячих импортов) + `npx vitest run src/themes/contract.test.ts`.
- [ ] **Step 5:** Commit: `refactor(themes): remove TS contract layer (contract.ts + *.contract.ts)`.

---

## Фаза C — выжившие backlog-пункты (закрываем тему)

Механические (значение-нейтральные или чисто-структурные) — делаем; дизайн-пункты (**меняют вид**) — через визуальную сессию с владельцем по рендер-сравнению, один за раз (не кодим молча).

### Task C1 (механика): роль `--color-path-highlight` — уточнить семантику имени

**Files:** `src/themes/roles.ts`, `src/themes/{sepia,light,dark,nord}.css`, `_template.css`, компоненты-потребители.

Backlog: имя «highlight» спорит с ролью «тихой направляющей». Переименовать роль во всех темах + `ROLE_DICTIONARY` + обращениях компонентов (после Фазы A компоненты ссылаются на неё напрямую). Целевое имя — **предложить владельцу** (кандидат: `--color-guide`). Захват разделителя при grep, Edit-инструментом. Тест п.4 ловит рассинхрон.

> Требует утверждения имени → мини-решение владельца перед кодом.

### Task C2 (механика): `--radius-sm` без примитива

**Files:** компонент(ы), использующие `var(--radius-sm)`.

`grep -rn "radius-sm" src` → заменить на реальный примитив `--radius-2` (=0.25rem/4px, бывш. sm). Value-нейтрально (fallback и так давал это значение). Commit.

### Task C3 (дизайн, визуал): ring у error-состояния клавиши (П.6)

`--keycap-correct-ring` есть, у error — нет. После Фазы A это чисто компонентный вопрос KeyCap. **Подготовить рендер-сравнение** (error с gap-ring vs без), показать владельцу, реализовать по решению.

### Task C4 (дизайн, визуал): hover `opacity: 0.9` в FooterActions (П.6)

Зашитый `opacity: 0.9` на hover primary/success не темизируется. **Подготовить рендер-сравнение** (opacity vs роль hover-цвета), показать владельцу, реализовать по решению.

### Task C5 (микро): `--user-menu-loading-color` семантика

После Фазы A UserMenu ссылается на `--color-symbol-pending` для loading. Обсудить с владельцем: оставить или завести/использовать более точную роль. Мелочь, возможно wontfix.

### Task C6 (механика): идиомы калькуляций в ролях

Разнобой `calc(l * .90)` vs `calc(l - 0.08)` в `--color-*`. **Значение менять нельзя** (визуальная правка). Резолюция: зафиксировать конвенцию идиомы в `src/themes/CLAUDE.md` (Фаза D), значения не трогать; фактическое выравнивание — при следующей цветовой сессии. (Либо wontfix — решение владельца.)

### Task C7 (дизайн, визуал): контраст метки correct-клавиши

`--color-keycap-correct-background` несёт α 0.8; над пергаментом эффективный контраст метки ~2.85:1 — ниже 3:1 для крупного символа. Свойство роли L2 (переживает растворение). **Подготовить рендер-сравнение** (текущая α vs правка), показать владельцу, реализовать по решению. *(Перенос из backlog — находка аудита плана; при выборе фолда закрывается здесь.)*

---

## Фаза D — документация

### Task D1: `docs/06-component-contracts-and-themes.md`

Переписать главу под 2-слойную модель: контракт растворён; компоненты ссылаются на роли `--color-*` напрямую; геометрия живёт в компоненте. Затронуть **все** секции: §6.1 (принцип), §6.2 (`*.contract.ts` — удалены), §6.3 (именование — теперь роли, не контракт), §6.4 (слоёв 2, не 3), **§6.5 (глобальный `:root` и body fallback — fallback снят в A0)**, §6.6 (контракт-тест → новый инвариант B1), §6.7 (алгоритм), §6.8 (таблица решений). Новый §6.7: «перечислить элементы → нужна роль? добавить в `roles.ts` + все темы → ссылаться `var(--color-*)` из компонента → `make check-all`».

### Task D2: `src/themes/CLAUDE.md`

Трёхслойка → двухслойка (ядро + роли); L3 растворён; убрать «следующий шаг — вынос L3» (сделано). Зафиксировать конвенцию идиомы калькуляций (из C6, если выбран этот путь).

### Task D3: `src/components/CLAUDE.md`

«Trio-конвенция» → «Duo» (`X.svelte` + `X.stories.svelte`; `*.contract.ts` больше нет). Обновить «Добавить темизируемый компонент» (ссылка на новый §6.7).

### Task D4: `_template.css` шапка

Убрать шаги про L3; инструкция создания темы = ядро + роли (заполнить роли по `ROLE_DICTIONARY`).

### Task D5: `docs/backlog.md`

- Удалить раздел «Темизация — усилить контракт-тест» (полностью фолднут в B1 п.6).
- Раздел «Темизация — отложено до растворения контракта (L3)»: удалить **только** закрытые заходом пункты (П.6-комментарий `KeyCap.contract.ts` и `--hands-*`/`--landing-*` префиксы — испарились с удалением токенов; остальные П.6/П.9 → закрыты Фазой C). **Не сносить раздел целиком:** два пункта не про контракт — **перенести** их в самостоятельные записи backlog:
  - контраст метки correct-клавиши ~2.85:1 (свойство роли `--color-keycap-correct-background`, α 0.8) — при выборе фолда уходит в C7, иначе остаётся отложенным;
  - CursorSymbol пер-позиционный (отдельная фича со своим ADR — вне этого захода).
- ADR 0029 **не трогаем**: статус-строку не правим (по конвенции backlog «Также см.» статус воплощения живёт в backlog, не в ADR/индексе).

### Task D6: корневой `CLAUDE.md`

- Строка ~26 (Stack): «цвета и декорация… через **компонентные контракты**» → «компоненты ссылаются на роли `--color-*` напрямую (2-слойная модель, ADR 0029)»; поправить упоминание body-fallback (снят в A0).
- Строка ~61: описание `src/themes/CLAUDE.md` — убрать «(`*.contract.ts`, `THEME_CONTRACT`)» (удалены в B3).

### Task D7: `src/lib/CLAUDE.md`

Строка ~41: убрать «Контракт-токены: `SIGN_IN_SCREEN_CONTRACT` + `USER_MENU_CONTRACT` агрегированы в `THEME_CONTRACT`» — все три идентификатора удалены в B3.

---

## Фаза E — финальная верификация и завершение

### Task E1: полные гейты

- [ ] `node tmp/l3-map.mjs` (регенерированный) → **0** L3-токенов в темах.
- [ ] Fallback-aware grep → **0** L3-ссылок в коде (кроме `--color-route`/`--color-finger` динамики).
- [ ] `make check-all` — чисто (lint · check · test · **spell без пайпа** · build · convex --once).

### Task E2: визуальный smoke (verify-практика)

Прогнать приложение (`make dev` / `make preview`), все 4 темы, ключевые экраны: тренировка (клавиатура, поток, ритм-канал, руки/маршрут), landing (демо-руки), settings, stats, sign-in, user-menu. Сверить, что картинка не поехала (Фаза A нейтральна по построению; убеждаемся эмпирически, особое внимание — MovementPath спектр и LandingHandsDemo точка).

### Task E3: завершение ветки

`finishing-a-development-branch` — мерж в `master` (merge-commit) по слову владельца.

---

## Self-review + аудит плана (4 субагента, чистый контекст, 2026-07-19)

**Ядро подтверждено здоровым (пересечение аудиторов):** все 231 токен покрыты A0–A13, значения = sepia дословно (0 расхождений), файловые привязки верны; ровно 2 динамические сборки; порядок «компоненты→срез» безопасен (ни один токен не срезается с немигрированным потребителем); referential-transparency держится; снятие body-fallback безопасно (head-скрипт до CSS); снос TS-слоя (B3) чист.

**Правки по находкам аудита (внесены):**
- **Префиксные эвристики убраны** из гейтов и теста — они не отличали L3 от (а) компонентных локалей `--keycap-unit`/`--avatar-size` и (б) приватных ядерных токенов light/dark/nord (`--finger-1..5`, `--keycap-tint-1`…). B1 теперь: остаток L3 в темах ловит **L1-дисциплина** (п.2), остаток в компонентах — с исключением двух локалей (п.5), валидность ролей — carve-out динамик по `${` (п.4). Гейты Фазы A — с `grep -v` известной локали.
- **Dup-детект** переведён на dup-preserving парс (`Record` схлопывал дубли вхолостую); цикл-детект — явный DFS; `_template` покрыт ролями (п.1).
- **RED-драйвер исправлен:** L1-дисциплина (п.2), не мнимый «пункт 6».
- **Числа:** 268 L3-ссылок (не 272), 27 файлов, 22 `*.contract.ts`.
- **Доки:** добавлены D6 (корневой `CLAUDE.md`), D7 (`src/lib/CLAUDE.md`); D1 явно включает §6.5; ADR-статус не трогаем (конвенция).
- **Backlog D5:** раздел не сносится целиком — два не-контрактных пункта перенесены (контраст correct-клавиши → C7; CursorSymbol пер-позиционный → отдельный ADR, вне захода).

**Открытые мини-решения владельца:** имя роли взамен `--color-path-highlight` (C1); визуалы C3/C4/C7.
