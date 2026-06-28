# Guardrails для AI-агентов в TypeScript-проектах

> Исследование и анализ применительно к проекту `flow-typing`.

## 1. Что такое «дрифт» агента

AI-агенты в кодовой базе склонны «уплывать» от задачи и стандартов проекта. Самые частые формы дрифта:

| Вид дрифта | Пример | Инструмент, который ловит |
|---|---|---|
| **Типовые shortcuts** | `any`, `@ts-ignore`, `as unknown as X`, неявный `any` | `tsc` strict + ESLint typed linting |
| **Архитектурный дрифт** | UI импортирует внутренности API, циклические зависимости | `dependency-cruiser`, `eslint-plugin-boundaries`, `madge` |
| **Мёртвый код** | Неиспользуемые экспорты, лишние зависимости | `knip` |
| **Семантический дрифт** | Код компилируется, но логика неверна | property-based tests, mutation testing |
| **Hallucinated APIs** | Агент выдумал метод, которого нет в библиотеке | contract tests, live sandbox evals |
| **Форматный/стилевой шум** | Непоследовательные отступы, разные стили в diff | Prettier / Biome |

Главный принцип: **guardrails должны быть внутри агентного цикла, а не только на этапе PR**. Чем раньше агент получает детерминированный feedback, тем меньше он уходит в сторону.

---

## 2. Проверка типов: настройки TypeScript

### Базовый набор

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "noEmit": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

### Ключевые флаги

- **`strict: true`** — включает `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`. Это первый и самый важный guardrail: агент не может «замазать» проблему `any`.
- **`noUncheckedIndexedAccess: true`** — доступ к массивам и `Record` возвращает `T | undefined`. Заставляет агента явно обрабатывать отсутствующие элементы.
- **`exactOptionalPropertyTypes: true`** — различает `field?: T` и `field: T | undefined`. Предотвращает «тихую» подстановку `undefined` в опциональные поля.
- **`noImplicitOverride: true`** — при переопределении методов требует `override`. Ловит случайные изменения поведения при рефакторинге.
- **`noFallthroughCasesInSwitch: true`** — запрещает неявное проваливание в `switch`.
- **`isolatedModules: true`** — защищает от конструкций, которые неправильно транспилируются Babel/SWC.
- **`noEmit: true` + `tsc --noEmit` в CI** — запускать полную проверку типов независимо от сборки.

### Для монорепозиториев

- **`composite: true`** + TypeScript project references — изолируют проекты и не дают агенту «пробросить» импорт через запрещённые границы.

---

## 3. ESLint: конфиги и правила

### Базовая современная конфигурация

ESLint 9+ использует flat config. Рекомендуется `typescript-eslint` с type-aware linting:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
```

`projectService: true` — обязательно для правил, использующих типы. Без него `no-floating-promises` и аналоги не работают.

### Правила, которые непосредственно ловят AI shortcuts

| Правило | Почему важно для агента |
|---|---|
| `@typescript-eslint/no-explicit-any` | Запрещает `any` — главный escape hatch агента. |
| `@typescript-eslint/ban-ts-comment` | Блокирует `@ts-ignore` / `@ts-expect-error` без описания. |
| `@typescript-eslint/no-non-null-assertion` | Запрещает `!` как способ «заткнуть» null-check. |
| `@typescript-eslint/no-floating-promises` | Ловит `async fn()` без `await`/`void`. |
| `@typescript-eslint/no-misused-promises` | Ловит передачу async-функции туда, где ожидается sync. |
| `@typescript-eslint/await-thenable` | Ловит `await` на не-Promise. |
| `@typescript-eslint/no-unnecessary-condition` | Ловит проверки, которые по типу всегда true/false. |
| `@typescript-eslint/no-unnecessary-type-assertion` | Запрещает бесполезные `as`. |
| `@typescript-eslint/switch-exhaustiveness-check` | Обязует обрабатывать все варианты discriminated union. |
| `@typescript-eslint/consistent-type-imports` | Разделяет `import type` и runtime imports. |
| `@typescript-eslint/consistent-type-definitions` | Единообразие `interface` vs `type`. |
| `@typescript-eslint/no-unused-vars` | С `_ignorePattern` — убирает мёртвые переменные. |

### Правила для контроля сложности и архитектуры

- `max-lines-per-function` / `sonarjs/cognitive-complexity` / `sonarjs/max-params` — агенты любят плодить длинные функции; ограничения заставляют декомпозировать.
- `no-restricted-syntax` — швейцарский нож: можно запретить конкретные паттерны (например, функции с 2+ позиционными параметрами).
- `import/no-cycle`, `import/no-mutable-exports`, `import/no-duplicates`, `unused-imports/no-unused-imports` — гигиена импортов.
- `no-restricted-imports` — механически запрещает импорт из запрещённых слоёв (например, `src/ui/**` не может импортировать `src/api/internal/**`).

### Готовые конфиги для агентов

- `eslint-config-agent` — специально заточен под AI-разработку: запрещает «умные» shortcuts (`??`, `?.`, неявные nullish), требует явных проверок, ограничивает длину функций, банит mutable exports.
- `eslint-plugin-ai-guardrails` — включает `max-function-lines` и другие правила для AI-генерированного кода.

---

## 4. Тесты: подходы

AI пишет тесты быстро, но легко пишет *плохие* тесты: они проходят, но не ловят реальные баги.

### Что работает

| Подход | Зачем |
|---|---|
| **TDD / test-first** | Агент сначала пишет failing test, потом код. Это лучше всего предотвращает «happy-path only» код. |
| **Behavior / scenario tests** | Тестируют сценарии и публичные API, а не внутренности. Переживают рефакторинг. |
| **Affected tests first** | Запускать только тесты изменённых файлов (`vitest --changed`, `jest --findRelatedTests`) — быстрый feedback. |
| **Property-based testing** (`fast-check`) | Проверяет инварианты на сотнях случайных входов. Ловит «plausible but wrong». |
| **Mutation testing** (`Stryker`) | Вносит мутации в код и проверяет, ловят ли их тесты. Защищает от фейкового coverage. |
| **Contract tests** (`Pact`) | Проверяют, что API не меняет форму ответа для потребителей. |
| **Snapshot tests** | Для UI/фикстур, но требуют человеческого review при обновлении. |
| **E2E / Playwright** | Для критических пользовательских путей. |

### Anti-patterns

- **100% coverage как цель** — coverage не гарантирует качество assertions.
- **Тесты, дублирующие реализацию** — ломаются при любом рефакторинге.
- **Только happy-path** — агенты систематически забывают ошибки и edge cases.

### Архитектурные тесты

```js
// dependency-cruiser
{
  forbidden: [
    {
      name: 'no-circular-dependencies',
      from: {}, to: { circular: true }
    },
    {
      name: 'ui-cannot-import-api-internals',
      from: { path: '^src/components' },
      to: { path: '^src/api/internal' }
    }
  ]
}
```

Такие тесты кодируют routing table из `AGENTS.md` и не дают агенту нарушать слои.

---

## 5. Остальной инструментальный арсенал

### Мёртвый код и зависимости

- **`knip`** — находит неиспользуемые файлы, экспорты, зависимости, enum members. Очень эффективен против AI-дрифта: агенты постоянно оставляют мёртвый код после правок. Интегрируется с Vitest, SvelteKit, Storybook.
- **`depcheck`** — проще, только зависимости.
- **`ts-prune`** — только неиспользуемые TS-экспорты.

### Форматирование

- **Prettier** — стандарт, но медленный.
- **Biome** — быстрее в 10–25×, почти совместим с Prettier, включает свой линтер.
- **Oxfmt** — новый Rust-форматер, стремится к 100% совместимости с Prettier.

### Git hooks и workflow

- **Lefthook** — один YAML-файл, параллельный запуск, заменяет Husky + lint-staged.
- **Husky + lint-staged** — стандарт Node.js.

Пример `lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx,svelte}'
      run: npx eslint --fix --max-warnings=0 {staged_files}
    format:
      glob: '*.{ts,tsx,svelte,json,md,yml,yaml}'
      run: npx prettier --write {staged_files}
    secrets:
      run: gitleaks git --staged --no-banner

pre-push:
  commands:
    checks:
      run: npm run typecheck && npm run test:unit && npx knip
```

### Безопасность и supply chain

- **Semgrep** / **CodeQL** — SAST, можно писать кастомные правила.
- **Snyk**, **Dependabot** — уязвимости зависимостей.
- **Gitleaks** — утечка секретов в pre-commit.
- **npm audit** / **`npm audit signatures`**.
- **FOSSA / REUSE** — проверка лицензий.
- **«Age gate»** — отклонять пакеты, опубликованные < 3 дней назад.

### Контекст и инструкции для агентов

- **`AGENTS.md`** / **`CLAUDE.md`** / **`GUARDRAILS.md`** / **`.cursorrules`** — машиночитаемые правила для агентов.
- **`GUARDRAILS.md`** — живой документ: каждый «Sign» = урок из реальной ошибки агента.
- **Skills** (`SKILL.md`) — для повторяющихся задач (тестирование, XState, Zod и т.д.).
- **Atlas Guardrails** — MCP-инструменты: `atlas_index`, `atlas_pack`, `atlas_find_duplicates`, `atlas check` — заставляют агента искать контекст и не дублировать код.
- **Project Spine** — генерирует `AGENTS.md`, архитектурную карту, guardrails из brief + репо.

### CI / review gates

- **Required status checks** + **branch rulesets** — единственная по-настоящему надёжная граница.
- **CODEOWNERS** на `eslint.config.*`, `tsconfig.*`, `.github/workflows/*`, `AGENTS.md` — конфигурация guardrails не должна меняться без review.
- **Вторичный review-агент** или человек — финальный gate.
- **Compact tool output** для агентов: если всё зелёное — одна строка `OK`; если красное — summary + stack trace.

---

## 6. Анализ проекта `flow-typing`

### 6.1. Что уже хорошо

| Проверка | Результат |
|---|---|
| `npx tsc --noEmit` | ✅ 0 ошибок |
| `npx eslint . --max-warnings=0` | ✅ 0 ошибок, 0 warnings |
| `npx svelte-check --tsconfig ./tsconfig.json` | ✅ 0 ошибок, 0 warnings |
| `npx vitest run --coverage` | ✅ 52 test files, 478 tests passed |
| Покрытие `src/lib` | 81% statements |
| Покрытие `shared/` | 100% statements |
| Покрытие `convex/` | 62.5% statements |
| Покрытие `auto-flow/` | 83.33% statements |
| Общее покрытие | 53.09% statements |

Базовый уровень качества уже высокий: типы и линтер не пускают код с очевидными ошибками, тесты проходят.

### 6.2. Что обнаружил анализ

#### 6.2.1. В `package.json` нет `scripts`

#### 6.2.1. Makefile — единая точка входа

В проекте `npm-скрипты намеренно вычищены`, вместо них используется `Makefile`:

```makefile
make check      # svelte-check
make test       # vitest run
make coverage   # vitest run --coverage
make lint       # eslint .
make lint-fix   # eslint . --fix
make spell      # cspell
make check-all  # lint --max-warnings 0 + check + test + spell
```

Это правильное решение: у агента есть одна точка входа для всех проверок.

**Что нужно добавить в Makefile:** цели для новых guardrails, чтобы они стали частью привычного workflow:

```makefile
knip: install
	npx knip

format: install
	npx prettier --write .

format-check: install
	npx prettier --check .

# В итоге check-all должен включать все gate'ы:
check-all: install
	npx eslint . --max-warnings 0
	npx svelte-kit sync
	npx svelte-check --tsconfig ./tsconfig.json
	npx vitest run
	npx cspell --no-progress ...
	npx knip
	npx prettier --check .
```

#### 6.2.2. Много мёртвого кода (Knip)

```bash
npx knip
```

Нашёл:

- **31 unused export**
- **42 unused exported types**
- **28 unused files**
- **1 unused dependency**: `@gorules/zen-engine`
- **3 потенциально неиспользуемых devDependency**: `@cspell/dict-ru_ru`, `svelte-check`, `svelte-eslint-parser`
- **80 unresolved imports** — в основном alias `@/...`, которые Knip не разрешает из коробки; лечится конфигурацией.

Примеры найденного:

```
Unused exports (31)
  DEFAULT_BUILD_OPTIONS                   auto-flow/corpus/pipeline.ts:27:14
  normalizeUnicodeForm                    auto-flow/string-normalization.ts:89:14
  createAuthStore               function  src/lib/auth/auth-store.svelte.ts:10:17
  ...

Unused exported types (42)
  FooterActionsContractToken       type   src/components/app/FooterActions.contract.ts:39:13
  MainContentContractToken         type   src/components/app/MainContent.contract.ts:15:13
  ...

Unused files (28)
  src/components/app/App.svelte
  src/components/app/FooterActions.svelte
  src/components/header/Header.svelte
  ...
```

**Почему это важно:** мёртвый код — это когнитивная нагрузка и риск, что агент будет использовать устаревшие функции вместо актуальных. Например, `createAuthStore` и `createSessionsStore` экспортированы, но, по данным Knip, нигде не используются. Агент может начать строить фичу поверх них, а проект уже перешёл на другой подход.

> **Что такое «baseline cleanup»?**
>
> Это не просто запуск `knip`. Это процесс:
> 1. Запустить `knip` и получить список находок.
> 2. Разобрать каждую находку: действительно ли она мёртвая, или Knip не видит использования (динамический импорт, alias, entry point, плагин).
> 3. Лишнее удалить; ложные срабатывания — задокументировать в `knip.json` (`ignore`, `ignoreDependencies`, `entry`).
> 4. Закоммитить чистое состояние, после которого `knip` запускается в CI с `--max-issues 0`.
>
> Иначе `knip` будет каждый раз показывать десятки находок, и агент (или человек) перестанет на него обращать внимание.

#### 6.2.3. Нет форматтера

В проекте отсутствуют:

- `.prettierrc`
- `biome.json`
- соответствующие devDependencies

Это значит, что diff от агента может содержать форматные правки, которые затрудняют review.

#### 6.2.4. Нет Git hooks

Нет `lefthook.yml`, `.husky/`, `.lintstagedrc`. Агент может закоммитить код, не прогнав `typecheck`, `lint`, `test`.

#### 6.2.5. Нет CI workflow

Нет `.github/workflows/*.yml` в корне проекта. Авторитетные проверки не запускаются автоматически.

#### 6.2.6. Нет проверки архитектурных границ

В проекте есть явные слои:

- `src/` — frontend (SvelteKit)
- `convex/` — backend
- `shared/` — shared domain logic
- `auto-flow/` — отдельный модуль генерации контента

Текущие зависимости между слоями:

- `src/lib/convex.ts` → `../../convex/_generated/api` (OK, generated API)
- `convex/drill.ts`, `convex/layoutData.ts`, `convex/selectionIndex.ts` → `../shared/...` (OK)
- `auto-flow/symbol-layout.ts` → `../shared/symbol-layout.ts` (OK)

Пока всё чисто, но нет инструмента, который **механически** запрещал бы:

- `src/components/**` импортировать `convex/**` напрямую (минуя `src/lib/convex.ts`)
- `auto-flow/**` импортировать `convex/**`
- циклические зависимости между `src/lib/*`

#### 6.2.7. Покрытие UI и routes близко к нулю

```
src/components/ui |       8 |        0 |       0 |    9.52 |
src/routes        |       0 |       0 |       0 |       0 |
src/lib/dev       |     2.4 |        0 |    5.71 |    2.94 |
```

Это ожидаемо для Svelte/UI, но означает, что агент может сломать пользовательский путь, не заметив этого.

---

## 7. Приоритизация внедрения

Оценка по двум осям: **польза в предотвращении дрифта** и **усилие внедрения**.

### 7.1. Максимальная польза при минимальном усилии

| Приоритет | Инструмент / действие | Почему максимальная польза | Усилие |
|---|---|---|---|
| **P0** | **Внедрить `knip` + baseline cleanup + Makefile target** | Уже найдено 31 unused export, 42 unused types, 28 unused files, 4 неиспользуемые зависимости. Очистит кодовую базу и предотвратит накопление мёртвого кода. | 1–2 часа |
| **P0** | **Добавить форматтер (Prettier или Biome) + Makefile target** | Убирает форматный шум из diff, ускоряет review, не даёт агенту тратить токены на отступы. | 30 минут |
| **P0** | **Добавить `lefthook` (pre-commit + pre-push)** | Механически заставляет агента проходить `make lint-fix/format-check` и `make check-all`/`make knip` перед коммитом/push. | 30 минут |
| **P1** | **Добавить GitHub Actions workflow** | Авторитетный CI gate: `make check-all` (lint, svelte-check, tests, spell) + `make knip` + `make format-check`. | 1 час |

### 7.2. Высокая польза при умеренном усилии

| Приоритет | Инструмент / действие | Почему полезно | Усилие |
|---|---|---|---|
| **P1** | **Усилить `tsconfig`**: `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch` | Ловят целый класс тихих ошибок, к которым агенты склонны. | 1–2 часа |
| **P1** | **Усилить ESLint**: `no-floating-promises`, `no-misused-promises`, `await-thenable` → `error`; добавить `import/no-cycle`, `unused-imports/no-unused-imports`, `sonarjs/cognitive-complexity` | Асинхронные сторы и Convex-вызовы — риск floating promises. Cycle detection защитит от будущих проблем. | 2–3 часа |
| **P2** | **`dependency-cruiser` для слоёв** | Закрепляет архитектуру `src → convex → shared`, `auto-flow → shared`. Предотвращает architectural drift. | 2–4 часа |
| **P2** | **Mutation testing (`Stryker`) для `shared/` и `src/lib/`** | `shared/` уже 100% покрыт, но coverage ≠ качество assertions. Stryker проверит, ловят ли тесты реальные баги. | 4–8 часов |
| **P2** | **Property-based tests (`fast-check`) для алгоритмов** | `key-ladder`, `repertoire/progress`, `drill-selection`, `difficulty-calculator`, `stats-calculator` — идеальные кандидаты. | 4–8 часов |
| **P2** | **AGENTS.md / CLAUDE.md с конкретными правилами** | Машиночитаемая карта проекта: слои, команды, запреты, workflow. Снижает риск, что агент пойдёт не туда. | 2–3 часа |

---

## 8. Вывод: что внедрять в первую очередь

Если нужно выбрать **одно действие с максимальным ROI**, это:

> **Внедрить `knip` и настроить его как обязательный gate в локальном hook и CI.**

Причины:

1. Анализ уже показал **значительный объём мёртвого кода** (31 экспорт, 42 типа, 28 файлов, 4 зависимости).
2. Мёртвый код — это классический симптом AI-дрифта: агенты оставляют после себя неиспользуемые артефакты, а затем строят поверх них.
3. `knip` легко интегрируется с существующим Vitest/SvelteKit-стеком.
4. После первичной чистки запуск занимает секунды и может быть автоматическим.

Но `knip` работает лучше всего в комплекте с базовой инфраструктурой:

```text
P0 (неделя 1):
  ├── Makefile targets: knip, format, format-check, depcruise
  ├── Prettier / Biome
  ├── knip + cleanup + knip.json
  ├── lefthook.yml (pre-commit: make lint-fix + make format-check; pre-push: make check-all + make knip)
  └── .github/workflows/ci.yml (make check-all && make knip && make format-check)

P1 (неделя 2):
  ├── tsconfig: exactOptionalPropertyTypes, noImplicitOverride, noFallthroughCasesInSwitch
  └── eslint: no-floating-promises, no-misused-promises, await-thenable, import/no-cycle, sonarjs

P2 (неделя 3+):
  ├── dependency-cruiser для слоёв
  ├── Stryker для shared/ и src/lib/
  ├── fast-check для алгоритмов
  └── AGENTS.md / CLAUDE.md
```

Без P0 все остальные инструменты останутся «рекомендациями», которые агент может проигнорировать. С P0 каждый guardrail становится **механически неизбежным**.

---

## 9. Дополнительные ESLint-настройки с максимальным эффектом для `flow-typing`

Текущий `eslint.config.mjs` уже хорош: flat config, `typescript-eslint` strict + stylistic, `projectService`, typed linting, Svelte-правила, кастомное `no-restricted-syntax` для object-literal параметров.

Чтобы найти наиболее эффективные дополнительные правила, были протестированы кандидаты на реальной кодовой базе.

### 9.1. Правила, которые стоит включить сразу

| Правило | Текущий статус | Результат на проекте | Почему эффективно |
|---|---|---|---|
| `no-console` (`allow: ['warn', 'error']`) | не включено | **1 warning** после исключения скриптов/dev | AI постоянно оставляет `console.log`. С `allow` для `warn/error` и выключением в `scripts/` — почти бесплатно. |
| `@typescript-eslint/no-explicit-any` | `warn` | 0 warnings | Можно смело поднять до `error`. |
| `@typescript-eslint/no-floating-promises` | не включено | 0 warnings | В проекте много async-сторов и Convex-вызовов. Правило не ловит ошибки сейчас, но защищает от будущего дрифта. |
| `@typescript-eslint/no-misused-promises` | не включено | 0 warnings | Защищает от передачи async-функции туда, где ожидается sync. |
| `@typescript-eslint/await-thenable` | не включено | 0 warnings | Ловит `await` на не-Promise. |
| `@typescript-eslint/switch-exhaustiveness-check` | не включено | 0 warnings | Критично для XState-машин и discriminated unions. |
| `@typescript-eslint/ban-ts-comment` | не включено | 0 warnings | Запрещает агенту «заткнуть» ошибку через `@ts-ignore`. |
| `eslint-plugin-sonarjs` (curated) | не установлен | 4 warnings при `cognitive-complexity: 15` | Ловит сложные/дублирующиеся функции. Полный preset даёт 699 шумных warnings, поэтому включено только подмножество. |

### 9.2. Правила с ощутимой пользой, но требующие cleanup

| Правило | Результат на проекте | Что потребуется |
|---|---|---|
| `@typescript-eslint/strict-boolean-expressions` | 27–32 warnings | Проверить `if (nullableString)`, `filter(Boolean)`, Svelte-условия. Возможно, включить с `allowNullableString: true` для начала. |
| `@typescript-eslint/promise-function-async` | 30 warnings | Большинство в Svelte-сторисах, роутах и тестах. Можно отключить для `*.test.ts` и `*.stories.svelte`. |
| `max-lines-per-function` / `sonarjs/cognitive-complexity` | 6 warnings (`max-lines` 100) | В основном в тестах. В production-коде почти не срабатывает — хороший guardrail против «расползания» функций от агента. |

### 9.3. Архитектурные guardrails

| Правило / плагин | Почему важно | Примечание |
|---|---|---|
| `import/no-cycle` | Предотвращает циклические зависимости в `src/lib/**` | `madge --circular` нашёл только циклы через `convex/_generated/api.d.ts` — их можно игнорировать. |
| `no-restricted-imports` | Запрещает `src/components/**` импортировать `convex/**` напрямую, `auto-flow/**` импортировать `convex/**` | Кодирует routing table из `AGENTS.md`. |
| `unused-imports/no-unused-imports` | Авто-удаляет неиспользуемые imports | Дополняет `@typescript-eslint/no-unused-vars`, который уже есть. |
| `eslint-plugin-sonarjs` (`cognitive-complexity`, `no-identical-functions`, `prefer-immediate-return`) | Ловит сложные/дублирующиеся функции, которые агенты часто генерируют | Нужно установить плагин. |

### 9.4. Реализованный блок rules в `eslint.config.mjs`

```js
import sonarjs from 'eslint-plugin-sonarjs';

// ...

{
  files: ['**/*.ts', '**/*.tsx', '**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
  plugins: { sonarjs },
  rules: {
    // AI-агенты часто оставляют отладочный console.log.
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Async guardrails — критично для Convex-вызовов и Svelte-сторов.
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // XState и discriminated unions.
    '@typescript-eslint/switch-exhaustiveness-check': 'error',

    // Не даём агенту "заткнуть" ошибку ts-игнором.
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-check': false,
        minimumDescriptionLength: 5,
      },
    ],

    // Подмножество sonarjs: только правила, которые ловят реальные проблемы
    // и не шумят на Svelte/TypeScript-идиомах проекта.
    // Порог 20 выбран потому, что текущий код имеет функции со сложностью 17–19;
    // после рефакторинга рекомендуется опустить до 15.
    'sonarjs/cognitive-complexity': ['warn', 20],
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-identical-expressions': 'warn',
    'sonarjs/no-all-duplicated-branches': 'warn',
    'sonarjs/no-gratuitous-expressions': 'warn',
    'sonarjs/no-inverted-boolean-check': 'warn',
    'sonarjs/no-redundant-jump': 'warn',
    'sonarjs/prefer-immediate-return': 'warn',
    'sonarjs/no-collection-size-mischeck': 'warn',
    'sonarjs/no-element-overwrite': 'warn',
    'sonarjs/non-existent-operator': 'warn',
    'sonarjs/no-extra-arguments': 'warn',
  },
},
{
  // В скриптах и dev-хелперах console.log — норма.
  files: [
    'src/scripts/**/*.ts',
    'scripts/**/*.ts',
    'src/lib/dev/**/*.ts',
    'auto-flow/scripts/**/*.ts',
  ],
  rules: {
    'no-console': 'off',
  },
},
```

### 9.5. Итог по ESLint

**Максимальный эффект с минимальными затратами:**

1. `no-console` с `allow: ['warn', 'error']` — **warn**, выключено в скриптах/dev.
2. Async guardrails: `no-floating-promises`, `no-misused-promises`, `await-thenable` — **error**.
3. `switch-exhaustiveness-check` — **error** (XState / discriminated unions).
4. `ban-ts-comment` — **error** (без `@ts-ignore`, `@ts-expect-error` только с описанием).
5. `eslint-plugin-sonarjs` — **warn**, но только курируемое подмножество правил. Полный preset дал 699 шумных warnings, поэтому включены `cognitive-complexity` (порог 20), `no-identical-functions`, `prefer-immediate-return` и др.

**Следующий уровень:** поднять `no-explicit-any` до `error`, `strict-boolean-expressions` (после cleanup), `import/no-cycle`, `no-restricted-imports` для архитектурных границ.

---

## 10. Ключевые источники

- [`typescript-eslint` rules](https://typescript-eslint.io/rules/)
- [`eslint-config-agent`](https://github.com/tupe12334/eslint-config-agent)
- [`eslint-plugin-ai-guardrails`](https://eslint-ai-guardrails.vercel.app/docs)
- [Guardrails for Agentic Coding — J. Van Eyck](https://jvaneyck.wordpress.com/2026/02/22/guardrails-for-agentic-coding-how-to-move-up-the-ladder-without-lowering-your-bar/)
- [Atlas Guardrails](https://github.com/marcusgoll/atlas-guardrails)
- [Knip](https://knip.dev)
- [dependency-cruiser](https://www.npmjs.com/package/dependency-cruiser)
- [Stryker Mutator](https://stryker-mutator.io/)
- [fast-check](https://dubzzz.github.io/fast-check.github.com/)
- [Lefthook](https://github.com/evilmartians/lefthook)
- [Self-Testing AI Agents — Steve Kinney](https://stevekinney.com/courses/self-testing-ai-agents)
- [How I Validate Quality When AI Agents Write My Code](https://dev.to/teppana88/how-i-validate-quality-when-ai-agents-write-my-code-481c)
