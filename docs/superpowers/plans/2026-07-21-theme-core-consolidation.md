# Сведение ядра тем `light` / `dark` / `nord` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести смысл тем `light` / `dark` / `nord` из ядра в роли, доведя их до модели `sepia`, без незаявленных изменений цвета.

**Architecture:** Сначала строится вычислитель, разрешающий узкую грамматику `src/themes/*.css` в координаты OKLCH, и снапшот 4 тем × 73 роли — он фиксирует текущую истину до единой правки тем. Затем каждая тема переписывается: лестницы и ветки одного оттенка сворачиваются в базу с выводом в ролях, оставшиеся абсолюты получают имена по содержимому. Снапшот доказывает, что цвет не поехал нигде, кроме заявленных сведений.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), Vitest (project `src`, node environment), CSS custom properties с `oklch()` relative color syntax, Node 24 (нативный TS для скрипта отчёта).

## Global Constraints

- Спек: `docs/superpowers/specs/2026-07-21-theme-core-consolidation-design.md`. При расхождении плана со спеком — прав спек.
- Словарь ролей `ROLE_DICTIONARY` (73 имени) **не меняется**. Ни одного нового, переименованного или удалённого `--color-*`.
- `src/components/**` **не трогается** ни в одной задаче.
- Ядро (голое имя) — только абсолютные значения, без `var()`. Роль (`--color-*`) — только `var(…)` или `oklch(from var(…) …)`. Это уже держит `src/themes/contract.test.ts`.
- **Критерий честного вывода:** роль записывается как `oklch(from var(--ядро) …)`, только если (1) минимум один из трёх компонентов записан как `l` / `c` / `h` либо `calc(l …)` / `calc(c …)` / `calc(h …)`, и (2) источник — тот токен, чьей ступенью или отзвуком роль является по смыслу. Все три компонента литералами — запрещено.
- **Порог сведения:** ΔE ≤ 0.05 (евклидово расстояние в OKLab).
- **Вывод раньше сведения:** где точный вывод возможен, применяется он.
- **Разная альфа не сводится** (но честно выводится через `… / ‹α›`).
- **Контраст — жёсткий блокиратор:** если сведение уводит роль через границу WCAG вниз (4.5 текст / 3.0 крупное и не-текст) относительно любой роли-подложки — сведение отклоняется.
- **Защищённые пары** (не сводятся друг с другом ни при каком ΔE): лестница поверхностей `--color-background` / `--color-surface-raised` / `--color-surface` / `--color-surface-hover` / `--color-border` (попарно); `--color-surface-accent` / `--color-border-accent`; `--color-keycap-group-N-background` / `--color-keycap-group-N-border` для каждого N; `--color-keycap-correct-background` / `--color-keycap-correct-border`; `--color-keycap-error-background` / `--color-keycap-error-border`.
- Type-safety без escape-hatch'ей: никаких `any`, `!`, `@ts-ignore`. При `noUncheckedIndexedAccess` индексный доступ даёт `T | undefined` — разбирать явно.
- Параметры функций: 1 — позиционный, 2+ — одним объектом с деструктуризацией.
- Комментарии и документация — по-русски, как в существующих темах.
- Гейт каждой задачи: `make check-dev` зелёный **и** `src/themes/__snapshots__/resolved.test.ts.snap` изменился ровно так, как заявлено в задаче (в задачах 1–5 — не изменился вовсе).
- Коммиты — Conventional Commits, по одному на задачу.

---

### Task 1: Разбор CSS темы — вынести из контракт-теста в модуль

Разбор `:root[data-theme=…] { … }` сейчас живёт приватно внутри `contract.test.ts`. Его понадобятся ещё два потребителя (снапшот-тест и скрипт отчёта), поэтому он выносится в модуль. Чистый перенос: ни строки логики не меняется.

**Files:**
- Create: `src/themes/parse-theme-css.ts`
- Modify: `src/themes/contract.test.ts` (удалить перенесённые функции, добавить импорт)

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `parseRootTokens({ path, selector }: { path: string; selector: string }): Record<string, string>` — карта `имя свойства → значение` из тела селектора; последнее определение побеждает.
  - `parseRawDeclarations({ path, selector }: { path: string; selector: string }): [string, string][]` — те же объявления в исходном порядке, с сохранением дублей.

Сигнатуры переведены на объект-параметр (конвенция проекта: 2+ параметра — одним объектом). Вызовы в `contract.test.ts` правятся под неё.

- [ ] **Step 1: Создать модуль**

Создать `src/themes/parse-theme-css.ts`:

```ts
import { readFileSync } from 'node:fs';

/**
 * Разбор темы `src/themes/<id>.css`: тело блока `:root[data-theme="<id>"]`
 * в карту custom properties. Общая часть для contract.test.ts, resolved.test.ts
 * и скрипта отчёта `src/scripts/theme-report.ts`.
 */

/**
 * Убрать CSS-комментарии: их текст может содержать `имя: значение;` (пояснение
 * к роли), и жадное сопоставление проглотило бы соседнюю реальную декларацию.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Тело блока `<selector> { ... }` (без внешних фигурных скобок), учитывая вложенность. */
function selectorBody({
  source,
  selector,
  path,
}: {
  source: string;
  selector: string;
  path: string;
}): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const selectorRe = new RegExp(escaped + '\\s*\\{', 'g');
  const match = selectorRe.exec(source);
  if (!match) throw new Error(`Selector ${selector} { ... } not found in ${path}`);
  const open = match.index + match[0].length - 1;
  let depth = 1;
  let i = open + 1;
  while (depth > 0 && i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  return source.slice(open + 1, i - 1);
}

const DECLARATION = /([a-zA-Z-][\w-]*)\s*:\s*([^;]+);/g;

/** Карта `свойство → значение` (последнее определение побеждает). */
export function parseRootTokens({
  path,
  selector,
}: {
  path: string;
  selector: string;
}): Record<string, string> {
  const body = selectorBody({ source: stripComments(readFileSync(path, 'utf-8')), selector, path });
  const out: Record<string, string> = {};
  for (const match of body.matchAll(DECLARATION)) {
    const [, name, value] = match;
    if (name && value) out[name] = value.trim();
  }
  return out;
}

/** Пары `[имя, значение]` в исходном порядке, с сохранением дублей. */
export function parseRawDeclarations({
  path,
  selector,
}: {
  path: string;
  selector: string;
}): [string, string][] {
  const body = selectorBody({ source: stripComments(readFileSync(path, 'utf-8')), selector, path });
  const out: [string, string][] = [];
  for (const match of body.matchAll(DECLARATION)) {
    const [, name, value] = match;
    if (name && value) out.push([name, value.trim()]);
  }
  return out;
}
```

- [ ] **Step 2: Переключить контракт-тест на модуль**

В `src/themes/contract.test.ts`:

1. Удалить функции `stripComments`, `selectorBody`, `parseRootTokens`, `parseRawDeclarations` (блок от комментария `/** Тело блока …` и вокруг — весь диапазон объявлений этих четырёх функций) вместе с комментарием `// Убираем CSS-комментарии…`.
2. Добавить импорт после импорта `ROLE_DICTIONARY`:

```ts
import { parseRootTokens, parseRawDeclarations } from './parse-theme-css';
```

3. Заменить все вызовы на объектную форму. Их шесть:

```ts
// было: parseRootTokens(t.path, t.selector)
parseRootTokens({ path: t.path, selector: t.selector })

// было: parseRootTokens(themePath(t.id), themeSelector(t.id))
parseRootTokens({ path: themePath(t.id), selector: themeSelector(t.id) })

// было: parseRootTokens(themePath(id), themeSelector(id))
parseRootTokens({ path: themePath(id), selector: themeSelector(id) })

// было: parseRawDeclarations(themePath(id), themeSelector(id))
parseRawDeclarations({ path: themePath(id), selector: themeSelector(id) })
```

4. Проверить импорт `node:fs` в шапке теста: `readFileSync` там ещё нужен (скан компонентов и `app.html`), `readdirSync` и `statSync` тоже. Импорт остаётся как есть.

- [ ] **Step 3: Запустить контракт-тест**

Run: `npx vitest run src/themes/contract.test.ts`
Expected: PASS, число тестов то же, что до переноса.

- [ ] **Step 4: Проверить типы и линт**

Run: `make check-dev`
Expected: eslint без ошибок, svelte-check 0 errors / 0 warnings, все тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add src/themes/parse-theme-css.ts src/themes/contract.test.ts
git commit -m "refactor(themes): вынести разбор CSS темы в parse-theme-css"
```

---

### Task 2: Вычислитель ролей

Модуль, разрешающий значения токенов темы в координаты OKLCH, плюс ΔE и контраст для правила сведения.

**Files:**
- Create: `src/themes/resolve-color.ts`
- Test: `src/themes/resolve-color.test.ts`

**Interfaces:**
- Consumes: ничего (модуль чистый, файлы не читает).
- Produces:
  - `type Oklch = { l: number; c: number; h: number; alpha: number }`
  - `resolveTokens(tokens: Record<string, string>): Record<string, Oklch>`
  - `formatOklch(color: Oklch): string`
  - `deltaE({ first, second }: { first: Oklch; second: Oklch }): number`
  - `contrastRatio({ first, second }: { first: Oklch; second: Oklch }): number`
  - `relativeLuminance(color: Oklch): number`
  - `toLinearSrgb(color: Oklch): { r: number; g: number; b: number }`

- [ ] **Step 1: Написать падающий тест**

Создать `src/themes/resolve-color.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

import {
  resolveTokens,
  formatOklch,
  deltaE,
  contrastRatio,
  relativeLuminance,
} from './resolve-color';

describe('resolveTokens — грамматика тем', () => {
  it('разрешает абсолютное ядровое значение', () => {
    const resolved = resolveTokens({ '--parchment': 'oklch(0.93 0.04 80)' });
    expect(resolved['--parchment']).toEqual({ l: 0.93, c: 0.04, h: 80, alpha: 1 });
  });

  it('разрешает абсолютное значение с альфой', () => {
    const resolved = resolveTokens({ '--tint': 'oklch(0.95 0 0 / 0.7)' });
    expect(resolved['--tint']).toEqual({ l: 0.95, c: 0, h: 0, alpha: 0.7 });
  });

  it('разрешает плоскую пересылку var()', () => {
    const resolved = resolveTokens({
      '--ink': 'oklch(0.30 0.04 60)',
      '--color-text-primary': 'var(--ink)',
    });
    expect(resolved['--color-text-primary']).toEqual({ l: 0.3, c: 0.04, h: 60, alpha: 1 });
  });

  it('разрешает вывод с наследованием всех трёх компонентов', () => {
    const resolved = resolveTokens({
      '--parchment': 'oklch(0.93 0.04 80)',
      '--color-surface': 'oklch(from var(--parchment) calc(l - 0.04) c h)',
    });
    expect(resolved['--color-surface']).toEqual({ l: 0.89, c: 0.04, h: 80, alpha: 1 });
  });

  it('разрешает умножение и деление в calc', () => {
    const resolved = resolveTokens({
      '--ink': 'oklch(0.30 0.04 60)',
      '--color-link': 'oklch(from var(--ink) calc(l * .90) calc(c * 2) calc(h / 2))',
    });
    expect(resolved['--color-link']).toEqual({ l: 0.27, c: 0.08, h: 30, alpha: 1 });
  });

  it('разрешает вывод с литеральными светлотой и хромой и наследованным оттенком', () => {
    const resolved = resolveTokens({
      '--finger-3': 'oklch(0.70 0.135 250)',
      '--color-target-3': 'oklch(from var(--finger-3) 0.47 0.09 h)',
    });
    expect(resolved['--color-target-3']).toEqual({ l: 0.47, c: 0.09, h: 250, alpha: 1 });
  });

  it('берёт альфу из слота, когда он задан', () => {
    const resolved = resolveTokens({
      '--red': 'oklch(0.55 0.14 30)',
      '--color-error-dim': 'oklch(from var(--red) l c h / 0.16)',
    });
    expect(resolved['--color-error-dim']).toEqual({ l: 0.55, c: 0.14, h: 30, alpha: 0.16 });
  });

  it('наследует альфу базы, когда слот не задан', () => {
    const resolved = resolveTokens({
      '--dim': 'oklch(0.65 0.13 25 / 0.2)',
      '--color-error-dim': 'oklch(from var(--dim) l c h)',
    });
    expect(resolved['--color-error-dim']?.alpha).toBe(0.2);
  });

  it('разрешает цепочку роль → роль', () => {
    const resolved = resolveTokens({
      '--snow': 'oklch(0.96 0 0)',
      '--color-text-primary': 'var(--snow)',
      '--color-primary-background': 'var(--color-text-primary)',
    });
    expect(resolved['--color-primary-background']).toEqual({ l: 0.96, c: 0, h: 0, alpha: 1 });
  });

  it('нормализует оттенок в диапазон [0, 360)', () => {
    const resolved = resolveTokens({
      '--pink': 'oklch(0.55 0.17 355)',
      '--color-x': 'oklch(from var(--pink) l c calc(h + 10))',
    });
    expect(resolved['--color-x']?.h).toBe(5);
  });

  it('снимает шум плавающей точки округлением', () => {
    const resolved = resolveTokens({
      '--parchment': 'oklch(0.93 0.04 80)',
      '--color-surface-raised': 'oklch(from var(--parchment) calc(l - 0.01) c h)',
    });
    expect(resolved['--color-surface-raised']?.l).toBe(0.92);
  });

  it('пропускает не-custom-property (color-scheme)', () => {
    const resolved = resolveTokens({ 'color-scheme': 'light', '--ink': 'oklch(0.3 0 0)' });
    expect(Object.keys(resolved)).toEqual(['--ink']);
  });

  it('падает на цикле var()', () => {
    expect(() => resolveTokens({ '--a': 'var(--b)', '--b': 'var(--a)' })).toThrow(/cycle/i);
  });

  it('падает на необъявленной ссылке', () => {
    expect(() => resolveTokens({ '--a': 'var(--missing)' })).toThrow(/--missing/);
  });

  it('падает на неподдержанном значении', () => {
    expect(() => resolveTokens({ '--a': 'rgb(1 2 3)' })).toThrow(/rgb\(1 2 3\)/);
  });
});

describe('formatOklch', () => {
  it('печатает без альфы, когда она равна 1', () => {
    expect(formatOklch({ l: 0.93, c: 0.04, h: 80, alpha: 1 })).toBe('oklch(0.93 0.04 80)');
  });

  it('печатает альфу, когда она меньше 1', () => {
    expect(formatOklch({ l: 0.93, c: 0.04, h: 80, alpha: 0.16 })).toBe('oklch(0.93 0.04 80 / 0.16)');
  });
});

describe('deltaE — евклидово расстояние в OKLab', () => {
  it('на противоположных оттенках равен удвоенной хроме', () => {
    const first = { l: 0.5, c: 0.1, h: 0, alpha: 1 };
    const second = { l: 0.5, c: 0.1, h: 180, alpha: 1 };
    expect(deltaE({ first, second })).toBeCloseTo(0.2, 6);
  });

  it('при нулевой хроме сводится к разнице светлот, оттенок не влияет', () => {
    const first = { l: 0.98, c: 0, h: 0, alpha: 1 };
    const second = { l: 0.97, c: 0, h: 20, alpha: 1 };
    expect(deltaE({ first, second })).toBeCloseTo(0.01, 6);
  });

  it('не зависит от альфы', () => {
    const first = { l: 0.5, c: 0.1, h: 30, alpha: 1 };
    const second = { l: 0.5, c: 0.1, h: 30, alpha: 0.2 };
    expect(deltaE({ first, second })).toBe(0);
  });
});

describe('contrastRatio / relativeLuminance', () => {
  it('белый даёт яркость 1', () => {
    expect(relativeLuminance({ l: 1, c: 0, h: 0, alpha: 1 })).toBeCloseTo(1, 6);
  });

  it('чёрный даёт яркость 0', () => {
    expect(relativeLuminance({ l: 0, c: 0, h: 0, alpha: 1 })).toBeCloseTo(0, 6);
  });

  it('чёрный к белому даёт 21:1', () => {
    const first = { l: 1, c: 0, h: 0, alpha: 1 };
    const second = { l: 0, c: 0, h: 0, alpha: 1 };
    expect(contrastRatio({ first, second })).toBeCloseTo(21, 6);
  });

  it('симметричен по порядку аргументов', () => {
    const first = { l: 0.93, c: 0.04, h: 80, alpha: 1 };
    const second = { l: 0.3, c: 0.04, h: 60, alpha: 1 };
    expect(contrastRatio({ first, second })).toBeCloseTo(contrastRatio({ first: second, second: first }), 12);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run src/themes/resolve-color.test.ts`
Expected: FAIL — `Failed to resolve import "./resolve-color"`.

- [ ] **Step 3: Написать модуль**

Создать `src/themes/resolve-color.ts`:

```ts
/**
 * Вычислитель ролей темы: разрешает грамматику `src/themes/*.css` в конкретные
 * координаты OKLCH. Нужен как гейт цветового равенства при сведении ядра тем —
 * сравниваются координаты, ровно то, что вычисляет браузер из `oklch(from …)`.
 *
 * Грамматика узкая и закрытая; всё, что в неё не попадает, роняет разбор.
 * Молчаливое значение по умолчанию здесь опаснее падения: оно дало бы
 * одинаково неверный результат до и после правки и показало бы ложную зелень.
 */

export type Oklch = { l: number; c: number; h: number; alpha: number };

/** Округление до 6 знаков: снимает шум плавающей точки (0.93 - 0.01 = 0.9199999999999999). */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function normalizeHue(hue: number): number {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** `oklch(L C H)` / `oklch(L C H / A)` — абсолютное значение ядрового токена. */
const ABSOLUTE = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/;
/** `var(--x)` — плоская пересылка. */
const PLAIN_VAR = /^var\(\s*(--[a-z0-9-]+)\s*\)$/;
/** `oklch(from var(--x) ‹c1› ‹c2› ‹c3› [/ ‹a›])` — вывод от базы. */
const RELATIVE = /^oklch\(\s*from\s+var\(\s*(--[a-z0-9-]+)\s*\)\s+(.+?)\s*\)$/;
/** `calc(l - 0.08)` / `calc(c * 2)` / `calc(h + 10)`. */
const CALC = /^calc\(\s*([lch])\s*([+\-*/])\s*([\d.]+)\s*\)$/;

/**
 * Разбить список компонентов по пробелам верхнего уровня: `calc(...)` не режется,
 * `/` перед альфой выделяется отдельной лексемой.
 */
function splitComponents(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  const flush = () => {
    if (current) parts.push(current);
    current = '';
  };
  for (const char of source) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth === 0 && /\s/.test(char)) {
      flush();
      continue;
    }
    if (depth === 0 && char === '/') {
      flush();
      parts.push('/');
      continue;
    }
    current += char;
  }
  flush();
  return parts;
}

function channelOf({ channel, base }: { channel: string; base: Oklch }): number {
  if (channel === 'l') return base.l;
  if (channel === 'c') return base.c;
  if (channel === 'h') return base.h;
  throw new Error(`Unsupported channel: ${channel}`);
}

function componentValue({ token, base }: { token: string; base: Oklch }): number {
  if (token === 'l' || token === 'c' || token === 'h') return channelOf({ channel: token, base });

  const literal = Number(token);
  if (token !== '' && !Number.isNaN(literal)) return literal;

  const calc = CALC.exec(token);
  if (!calc) throw new Error(`Unsupported component: ${token}`);
  const [, channel, operator, operandText] = calc;
  if (!channel || !operator || !operandText) throw new Error(`Malformed calc: ${token}`);
  const left = channelOf({ channel, base });
  const operand = Number(operandText);
  switch (operator) {
    case '+':
      return left + operand;
    case '-':
      return left - operand;
    case '*':
      return left * operand;
    case '/':
      return left / operand;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function resolveValue({
  value,
  lookup,
}: {
  value: string;
  lookup: (name: string) => Oklch;
}): Oklch {
  const plain = PLAIN_VAR.exec(value);
  if (plain) {
    const [, name] = plain;
    if (!name) throw new Error(`Malformed var(): ${value}`);
    return lookup(name);
  }

  const absolute = ABSOLUTE.exec(value);
  if (absolute) {
    const [, lightness, chroma, hue, alpha] = absolute;
    if (!lightness || !chroma || !hue) throw new Error(`Malformed oklch(): ${value}`);
    return {
      l: round(Number(lightness)),
      c: round(Number(chroma)),
      h: round(normalizeHue(Number(hue))),
      alpha: alpha === undefined ? 1 : round(Number(alpha)),
    };
  }

  const relative = RELATIVE.exec(value);
  if (relative) {
    const [, baseName, componentText] = relative;
    if (!baseName || !componentText) throw new Error(`Malformed relative color: ${value}`);
    const base = lookup(baseName);
    const parts = splitComponents(componentText);
    const slash = parts.indexOf('/');
    const channels = slash === -1 ? parts : parts.slice(0, slash);
    const alphaToken = slash === -1 ? undefined : parts[slash + 1];
    const [first, second, third] = channels;
    if (channels.length !== 3 || !first || !second || !third) {
      throw new Error(`Expected three channels in: ${value}`);
    }
    return {
      l: round(componentValue({ token: first, base })),
      c: round(componentValue({ token: second, base })),
      h: round(normalizeHue(componentValue({ token: third, base }))),
      alpha: alphaToken === undefined ? base.alpha : round(Number(alphaToken)),
    };
  }

  throw new Error(`Unsupported value: ${value}`);
}

/**
 * Разрешить все custom properties темы в координаты. Не-custom-properties
 * (`color-scheme`) пропускаются. Циклы и висячие ссылки — исключение.
 */
export function resolveTokens(tokens: Record<string, string>): Record<string, Oklch> {
  const resolved: Record<string, Oklch> = {};
  const inProgress = new Set<string>();

  function resolveName(name: string): Oklch {
    const cached = resolved[name];
    if (cached) return cached;
    if (inProgress.has(name)) throw new Error(`var() cycle at ${name}`);
    const value = tokens[name];
    if (value === undefined) throw new Error(`Undeclared token ${name}`);
    inProgress.add(name);
    const color = resolveValue({ value, lookup: resolveName });
    inProgress.delete(name);
    resolved[name] = color;
    return color;
  }

  for (const name of Object.keys(tokens)) {
    if (!name.startsWith('--')) continue;
    resolveName(name);
  }
  return resolved;
}

export function formatOklch({ l, c, h, alpha }: Oklch): string {
  return alpha === 1 ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${alpha})`;
}

function toLab({ l, c, h }: Oklch): { l: number; a: number; b: number } {
  const radians = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}

/** Евклидово расстояние в OKLab. Альфа не участвует. */
export function deltaE({ first, second }: { first: Oklch; second: Oklch }): number {
  const one = toLab(first);
  const two = toLab(second);
  return Math.hypot(one.l - two.l, one.a - two.a, one.b - two.b);
}

/**
 * OKLCH → линейный sRGB с отсечением в [0, 1]. Отсечение грубее реального
 * gamut mapping браузера, но для оценки контраста этого достаточно: значения
 * тем и так подобраны в охвате.
 */
export function toLinearSrgb(color: Oklch): { r: number; g: number; b: number } {
  const { l: lightness, a, b: blue } = toLab(color);

  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * blue;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * blue;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * blue;

  const long = lRoot ** 3;
  const medium = mRoot ** 3;
  const short = sRoot ** 3;

  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    r: clamp(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    g: clamp(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    b: clamp(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short),
  };
}

/** Относительная яркость WCAG. Альфа игнорируется — цвет считается плотным. */
export function relativeLuminance(color: Oklch): number {
  const { r, g, b } = toLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio({ first, second }: { first: Oklch; second: Oklch }): number {
  const one = relativeLuminance(first);
  const two = relativeLuminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run src/themes/resolve-color.test.ts`
Expected: PASS, все тесты зелёные.

- [ ] **Step 5: Проверить типы и линт**

Run: `make check-dev`
Expected: чисто.

- [ ] **Step 6: Commit**

```bash
git add src/themes/resolve-color.ts src/themes/resolve-color.test.ts
git commit -m "feat(themes): вычислитель ролей — координаты OKLCH, ΔE, контраст"
```

---

### Task 3: Снапшот разрешённых ролей — зафиксировать текущую истину

Снапшот берётся **до** любой правки тем. Дальше он работает журналом: коммит точного перевода его не трогает, коммит сведения меняет ровно заявленные строки.

**Files:**
- Create: `src/themes/resolved.test.ts`
- Create (автоматически): `src/themes/__snapshots__/resolved.test.ts.snap`

**Interfaces:**
- Consumes: `parseRootTokens` (Task 1), `resolveTokens` / `formatOklch` (Task 2), `THEMES` из `./registry`, `ROLE_DICTIONARY` из `./roles`.
- Produces: снапшот-файл — гейт для задач 5–8.

- [ ] **Step 1: Написать тест**

Создать `src/themes/resolved.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';

import { THEMES } from './registry';
import { ROLE_DICTIONARY } from './roles';
import { parseRootTokens } from './parse-theme-css';
import { resolveTokens, formatOklch } from './resolve-color';

/**
 * Гейт цветового равенства при работе с ядром тем.
 *
 * Контракт-тест держит ФОРМУ слоёв, но не значение: перестановка значения из
 * ядра в вывод роли для него неотличима от подмены цвета. Здесь каждая роль
 * каждой темы разрешается в конкретные координаты OKLCH и попадает в снапшот.
 * Переписывание темы обязано оставить снапшот нетронутым; изменение снапшота —
 * это заявленное изменение цвета, и оно должно быть обосновано в коммите.
 *
 * `_template.css` не участвует: там роли заданы как `unset`, цветов нет.
 */
describe('разрешённые цвета ролей', () => {
  it('каждая тема разрешает все роли словаря в координаты OKLCH', () => {
    const report: Record<string, Record<string, string>> = {};

    for (const theme of THEMES) {
      const tokens = parseRootTokens({
        path: resolve(__dirname, `${theme.id}.css`),
        selector: `:root[data-theme="${theme.id}"]`,
      });
      const resolved = resolveTokens(tokens);

      const roles: Record<string, string> = {};
      for (const role of [...ROLE_DICTIONARY].sort()) {
        const color = resolved[role];
        if (!color) throw new Error(`${theme.id}: роль ${role} не разрешилась`);
        roles[role] = formatOklch(color);
      }
      report[theme.id] = roles;
    }

    expect(report).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Создать снапшот**

Run: `npx vitest run src/themes/resolved.test.ts`
Expected: PASS, `1 snapshot written`.

- [ ] **Step 3: Сверить снапшот с исходниками вручную**

Открыть `src/themes/__snapshots__/resolved.test.ts.snap` и проверить **по три плоские роли на тему** — их разрешённое значение обязано совпасть с литералом ядрового токена дословно. Это единственная проверка самого вычислителя против исходника; дальше ему доверяют.

Опорные пары (значение в снапшоте слева, литерал ядра справа):

| тема | роль | ожидаемое значение |
| --- | --- | --- |
| `sepia` | `--color-background` | `oklch(0.93 0.04 80)` (`--parchment`) |
| `sepia` | `--color-text-primary` | `oklch(0.3 0.04 60)` (`--ink`) |
| `sepia` | `--color-error` | `oklch(0.55 0.14 30)` (`--red`) |
| `light` | `--color-background` | `oklch(1 0 0)` (`--paper`) |
| `light` | `--color-finger-3` | `oklch(0.7 0.135 250)` (`--finger-3`) |
| `light` | `--color-symbol-pending` | `oklch(0.45 0.03 257)` (`--slate`) |
| `dark` | `--color-background` | `oklch(0.14 0 0)` (`--slate`) |
| `dark` | `--color-marker-core` | `oklch(0.88 0 0)` (`--bead`) |
| `dark` | `--color-symbol-one-error` | `oklch(0.82 0.13 95)` (`--ochre`) |
| `nord` | `--color-background` | `oklch(0.32 0.02 254)` (`--polar-night-1`) |
| `nord` | `--color-error-dim` | `oklch(0.65 0.13 25 / 0.2)` (`--aurora-red-dim`) |
| `nord` | `--color-keycap-label` | `oklch(0.87 0.01 240)` (`--keycap-label`) |

Проверить также одно выведенное значение: `sepia --color-surface` = `oklch(from var(--parchment) calc(l - 0.04) c h)` при `--parchment: oklch(0.93 0.04 80)` даёт `oklch(0.89 0.04 80)`.

Если хоть одна пара не сошлась — вычислитель неверен, вернуться к Task 2. Не подгонять снапшот.

- [ ] **Step 4: Проверить полный набор**

Run: `make check-dev`
Expected: чисто, снапшот стабилен при повторном прогоне.

- [ ] **Step 5: Commit**

```bash
git add src/themes/resolved.test.ts src/themes/__snapshots__/resolved.test.ts.snap
git commit -m "test(themes): снапшот разрешённых координат ролей как гейт цвета"
```

---

### Task 4: Скрипт отчёта по теме

Инструмент для задач 6–8: печатает разрешённые значения, близкие пары ядра и контраст ролей к подложкам. Исполнитель снимает отчёт до правки и после и сравнивает.

**Files:**
- Create: `src/scripts/theme-report.ts`
- Modify: `Makefile` (цель `theme-report`)

**Interfaces:**
- Consumes: `parseRootTokens` (Task 1), `resolveTokens` / `formatOklch` / `deltaE` / `contrastRatio` (Task 2), `THEMES`, `ROLE_DICTIONARY`.
- Produces: детерминированный текстовый вывод в stdout, пригодный для `diff`.

Путь `src/scripts/*.ts` уже учтён: `knip.json` считает его точкой входа, `eslint.config.mjs` снимает там `no-console`. Node запускает TS нативно (как `auto-flow/scripts/build-corpus.ts`) — относительные импорты **обязаны** нести расширение `.ts`.

- [ ] **Step 1: Создать скрипт**

Создать `src/scripts/theme-report.ts`:

```ts
#!/usr/bin/env node
/**
 * @file Отчёт по теме для работы с ядром: разрешённые координаты, близкие пары
 * ядровых токенов (кандидаты на сведение) и контраст ролей к подложкам.
 *
 * Запуск (Node ≥ 22, нативный TS): `make theme-report` или
 *   node src/scripts/theme-report.ts [themeId …]
 *
 * Вывод детерминирован и предназначен для сравнения: снять отчёт до правки
 * темы, снять после, сравнить `diff`. Относительные импорты с расширением
 * `.ts` — требование Node-ESM.
 */
import { resolve } from 'node:path';

import { THEMES } from '../themes/registry.ts';
import { ROLE_DICTIONARY } from '../themes/roles.ts';
import { parseRootTokens } from '../themes/parse-theme-css.ts';
import { resolveTokens, formatOklch, deltaE, contrastRatio, type Oklch } from '../themes/resolve-color.ts';

/** Порог сведения близких значений (спек: ΔE ≤ 0.05). */
const COLLAPSE_THRESHOLD = 0.05;

/** Роли-подложки: к ним считается контраст (спек, правило контраста). */
const BACKDROPS = [
  '--color-background',
  '--color-surface',
  '--color-surface-raised',
  '--color-surface-hover',
  '--color-surface-accent',
  '--color-primary-background',
  '--color-error',
  '--color-success',
  '--color-target-1',
  '--color-target-2',
  '--color-target-3',
  '--color-target-4',
  '--color-target-5',
  '--color-cursor-background',
] as const;

function fixed(value: number, digits: number): string {
  return value.toFixed(digits);
}

function reportTheme(themeId: string): void {
  const tokens = parseRootTokens({
    path: resolve(import.meta.dirname, '..', 'themes', `${themeId}.css`),
    selector: `:root[data-theme="${themeId}"]`,
  });
  const resolved = resolveTokens(tokens);

  const coreNames = Object.keys(tokens)
    .filter((name) => name.startsWith('--') && !name.startsWith('--color-'))
    .sort();
  const roleNames = [...ROLE_DICTIONARY].sort();

  console.log(`\n${'='.repeat(72)}\nТЕМА ${themeId}\n${'='.repeat(72)}`);

  console.log(`\n-- ЯДРО (${coreNames.length}) ---------------------------------------------`);
  for (const name of coreNames) {
    const color = resolved[name];
    if (color) console.log(`${name.padEnd(24)} ${formatOklch(color)}`);
  }

  console.log(`\n-- РОЛИ (${roleNames.length}) ---------------------------------------------`);
  for (const name of roleNames) {
    const color = resolved[name];
    if (color) console.log(`${name.padEnd(36)} ${formatOklch(color)}`);
  }

  console.log(`\n-- БЛИЗКИЕ ЗНАЧЕНИЯ (ΔE ≤ ${COLLAPSE_THRESHOLD}) ------------------------`);
  /*
   * Сравниваются не имена, а РАЗРЕШЁННЫЕ ЗНАЧЕНИЯ: все токены (ядро и роли)
   * группируются по координатам. Так псевдонимы (роль = var(ядро), ΔE 0)
   * схлопываются в одну группу и не засоряют вывод, а близкая пара видна
   * вместе со всеми носителями — в том числе когда одна сторона уже стала
   * выведенной ролью, а не ядровым токеном.
   */
  const groups = new Map<string, { color: Oklch; names: string[] }>();
  for (const name of [...coreNames, ...roleNames]) {
    const color = resolved[name];
    if (!color) continue;
    const key = formatOklch(color);
    const group = groups.get(key);
    if (group) group.names.push(name);
    else groups.set(key, { color, names: [name] });
  }
  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  const pairs: { first: string; second: string; distance: number; sameAlpha: boolean }[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const left = entries[i];
      const right = entries[j];
      if (!left || !right) continue;
      const [leftKey, leftGroup] = left;
      const [rightKey, rightGroup] = right;
      const distance = deltaE({ first: leftGroup.color, second: rightGroup.color });
      if (distance > COLLAPSE_THRESHOLD) continue;
      pairs.push({
        first: `${leftKey}  ← ${leftGroup.names.join(', ')}`,
        second: `${rightKey}  ← ${rightGroup.names.join(', ')}`,
        distance,
        sameAlpha: leftGroup.color.alpha === rightGroup.color.alpha,
      });
    }
  }
  pairs.sort((a, b) => a.distance - b.distance || a.first.localeCompare(b.first));
  if (pairs.length === 0) console.log('(нет)');
  for (const pair of pairs) {
    const alphaNote = pair.sameAlpha ? '' : '   [разная альфа — сведение запрещено]';
    console.log(`\nΔE ${fixed(pair.distance, 4)}${alphaNote}\n  ${pair.first}\n  ${pair.second}`);
  }

  console.log('\n-- КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ -----------------------------------');
  const backdrops: { name: string; color: Oklch }[] = [];
  for (const name of BACKDROPS) {
    const color = resolved[name];
    if (color) backdrops.push({ name, color });
  }
  for (const roleName of roleNames) {
    const color = resolved[roleName];
    if (!color) continue;
    const ratios = backdrops.map(
      (backdrop) => `${backdrop.name.replace('--color-', '')}=${fixed(contrastRatio({ first: color, second: backdrop.color }), 2)}`
    );
    console.log(`${roleName.padEnd(36)} ${ratios.join(' ')}`);
  }
}

const requested = process.argv.slice(2);
const themeIds = requested.length > 0 ? requested : THEMES.map((theme) => theme.id);
for (const themeId of themeIds) reportTheme(themeId);
```

- [ ] **Step 2: Добавить цель в Makefile**

Найти в `Makefile` цель `ladder-report` и добавить **после** её блока:

```makefile
# Отчёт по теме: разрешённые координаты ролей, близкие пары ядра (ΔE ≤ 0.05)
# и контраст ролей к подложкам. Инструмент сведения ядра тем.
# Одна тема: make theme-report THEME=light
theme-report:
	@node src/scripts/theme-report.ts $(THEME)
```

- [ ] **Step 3: Запустить отчёт**

Run: `make theme-report THEME=light`
Expected: печатается блок `ТЕМА light` с ядром (35 токенов), ролями (73), списком близких значений и матрицей контраста.

В разделе «БЛИЗКИЕ ЗНАЧЕНИЯ» должна быть пара с ΔE `0.0100`, где одна группа — `oklch(0.97 0 20) ← --error-ink, --color-keycap-error-foreground`, а другая — `oklch(0.98 0 0) ← --paper-raised, --color-on-dense, --color-surface-raised`. Если её нет — группировка или ΔE считаются неверно, чинить до перехода дальше.

- [ ] **Step 4: Проверить, что все темы проходят**

Run: `make theme-report`
Expected: четыре блока, без исключений разбора.

- [ ] **Step 5: Проверить типы и линт**

Run: `make check-dev`
Expected: чисто. Снапшот из Task 3 не изменился.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/theme-report.ts Makefile
git commit -m "chore(themes): скрипт отчёта — ΔE ядра и контраст ролей"
```

---

### Task 5: `sepia` — выровнять имя источника оттенка пальца

Чистое переименование, значения не меняются. Снапшот обязан остаться нетронутым.

**Files:**
- Modify: `src/themes/sepia.css`

**Interfaces:**
- Consumes: снапшот (Task 3) как гейт.
- Produces: имя `--finger-N` как единое во всех темах.

- [ ] **Step 1: Переименовать токены ядра**

В `src/themes/sepia.css` заменить `--route-1` … `--route-5` на `--finger-1` … `--finger-5`. Затрагиваются: пять объявлений ядра (строки блока «Маршруты — по одному на палец»), пять ролей `--color-finger-N`, пять ролей `--color-route-N`, пять ролей `--color-target-N`.

```bash
sed -i '' 's/--route-\([1-5]\)/--finger-\1/g' src/themes/sepia.css
```

- [ ] **Step 2: Поправить комментарий блока ядра**

Комментарий над пятёркой начинается со слова «Маршруты» — теперь имя говорит о пальце, а не о маршруте. Заменить первую фразу:

```css
  /* Пальцы — по одному оттенку на палец (ADR 0028 · 0031): движение и цель несут
     оттенок пальца-владельца, различает форма (путь — кольцо, цель — заливка).
```

Остальной текст комментария (про ΔE, охват sRGB и явную хрому) не трогать.

- [ ] **Step 3: Проверить, что имя `--route-` в теме не осталось**

Run: `grep -n -- '--route-' src/themes/sepia.css`
Expected: ничего не найдено (роли `--color-route-N` остаются — у них другой префикс, `grep` их не покажет).

Run: `grep -c -- '--color-route-' src/themes/sepia.css`
Expected: `5`

- [ ] **Step 4: Проверить гейт**

Run: `npx vitest run src/themes/`
Expected: PASS, снапшот **не** обновлён (никакого `snapshot written` / `obsolete`).

- [ ] **Step 5: Полный прогон**

Run: `make check-dev`
Expected: чисто.

- [ ] **Step 6: Commit**

```bash
git add src/themes/sepia.css
git commit -m "refactor(themes): sepia — переименовать ядро --route-N в --finger-N"
```

---

### Task 6: `light` — свести ядро

Ядро 35 → ожидаемо 16–18 токенов. Значения ролей не меняются нигде, кроме одного заявленного сведения.

**Files:**
- Modify: `src/themes/light.css`

**Interfaces:**
- Consumes: `make theme-report THEME=light`, снапшот (Task 3).
- Produces: изменение снапшота ровно в одной строке (`light` → `--color-keycap-error-foreground`), если сведение прошло проверку контраста.

- [ ] **Step 1: Снять отчёт до правки**

```bash
make theme-report THEME=light > /tmp/light-before.txt
```

- [ ] **Step 2: Применить точные выводы**

Все пересчёты ниже проверены арифметически и дают **ровно** исходные координаты. Ядровый токен удаляется, роль, которая на него ссылалась, начинает выводиться от базы.

**База поверхностей `--paper: oklch(1 0 0)`** — остаётся; удаляются `--paper-raised`, `--paper-dim`, `--paper-deep`, `--paper-border`:

```css
  --color-background    : var(--paper);
  --color-surface-raised: oklch(from var(--paper) calc(l - 0.02) c h); /* выпуклая: меню поверх фона */
  --color-surface       : oklch(from var(--paper) calc(l - 0.05) c h);
  --color-surface-hover : oklch(from var(--paper) calc(l - 0.10) c h);
  --color-border        : oklch(from var(--paper) calc(l - 0.10) c h); /* исторически совпадает с hover */
  --color-on-dense      : oklch(from var(--paper) calc(l - 0.02) c h);
  --color-border-accent : oklch(from var(--paper) calc(l - 0.15) c h); /* была граница avatar/menu */
```

**База текста `--ink: oklch(0.14 0 0)`** — остаётся; удаляются `--ink-soft`, `--ink-faint`:

```css
  --color-text-primary  : var(--ink);
  --color-text-secondary: oklch(from var(--ink) calc(l + 0.30) c h);
  --color-text-muted    : oklch(from var(--ink) calc(l + 0.42) c h);
```

**Холодная ветка 280°** — вводится один ядровый токен `--iris: oklch(0.40 0.05 280)` (значение бывшего `--link-ink`); удаляются `--primary-hover`, `--link-ink`, `--link-ink-hover`, `--avatar-fill`, `--avatar-ink`:

```css
  --color-primary-hover : oklch(from var(--iris) 0.30 0.03 h);
  --color-link          : var(--iris);
  --color-link-hover    : oklch(from var(--iris) 0.30 0.1 h);
  --color-surface-accent: oklch(from var(--iris) 0.90 0.03 h);  /* была плашка аватара */
  --color-ink-strong    : oklch(from var(--iris) 0.35 0.1 h);   /* был цвет инициалов аватара */
```

Так снимается токен `--primary-hover`, названный по роли, — ровно тот дефект, ради которого затевалась грань.

**Акцент и исходы** — удаляются `--amber-hover`, `--red-deep`:

```css
  --color-brand-accent-hover: oklch(from var(--amber) calc(l - 0.06) c h);
  --color-finger-error      : oklch(from var(--red) calc(l - 0.04) calc(c - 0.01) calc(h - 5));
```

**Статусы символов** — удаляются `--pine`, `--brick`, `--crimson` (выводятся от исходов; `--slate` и `--ochre` остаются в ядре, честного источника у них нет):

```css
  --color-symbol-correct    : oklch(from var(--green) 0.45 0.11 calc(h + 1));
  --color-symbol-corrected  : oklch(from var(--red) 0.41 0.15 calc(h - 15));
  --color-symbol-many-errors: oklch(from var(--red) 0.51 0.2 calc(h - 8));
```

**Покой пальца** — удаляется `--mist` (холодный близнец той же светлоты, как и сказано в комментарии):

```css
  --color-finger-idle: oklch(from var(--cream) l c 260);
```

**Тон группы 1** — удаляется `--keycap-tint-1`. Пара «значение и оно же под альфой» — это вывод, не сведение:

```css
  --color-keycap-group-1-background: oklch(from var(--paper) calc(l - 0.05) c h / 0.7);
  --color-keycap-group-1-border    : oklch(from var(--paper) calc(l - 0.15) c h);
```

Остальные роли `light` не трогать — они уже выводятся или ссылаются на остающиеся токены ядра (`--paper`, `--ink`, `--iris`, `--amber`, `--green`, `--red`, `--clay`, `--cream`, `--slate`, `--ochre`, `--navy`, `--navy-deep`, `--finger-1..5`).

- [ ] **Step 3: Проверить, что снапшот не дрогнул**

Run: `npx vitest run src/themes/resolved.test.ts`
Expected: PASS без обновления снапшота. Если снапшот разошёлся — арифметика вывода неверна, чинить запись роли, **не** обновлять снапшот.

- [ ] **Step 4: Переснять отчёт и разобрать кандидата на сведение**

```bash
make theme-report THEME=light > /tmp/light-derived.txt
```

Разбирать кандидатов нужно по этому отчёту, а не по `/tmp/light-before.txt`: точные выводы уже удалили часть ядра, и список близких пар стал другим. Раздел «КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ» в обоих отчётах одинаков (выводы цвет не меняют) — им можно пользоваться из любого.

В разделе «БЛИЗКИЕ ЗНАЧЕНИЯ» есть `--error-ink` (`oklch(0.97 0 20)`) против значения выпуклой поверхности (`oklch(0.98 0 0)`), ΔE 0.0100. Комментарий в теме прямо называет их унификацию «осознанным следующим шагом». Защищённой парой они не связаны: `--color-keycap-error-foreground` и `--color-on-dense` — не «заливка и её граница».

Проверить контраст по разделу «КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ» в `/tmp/light-before.txt`: взять строку `--color-keycap-error-foreground` и запомнить её отношения. После сведения роль примет значение `--color-on-dense` — сравнить с его строкой в том же отчёте.

Класс роли — крупный символ на клавише, порог 3.0. Свести можно, только если ни одно отношение не падает с ≥3.0 ниже 3.0 и ни одно с ≥4.5 ниже 4.5.

Если проверка пройдена — удалить `--error-ink` из ядра и записать:

```css
  --color-keycap-error-foreground  : var(--color-on-dense);
```

Если не пройдена — оставить `--error-ink` в ядре как есть и отметить это в сообщении коммита.

- [ ] **Step 5: Обновить снапшот заявленным изменением**

Run: `npx vitest run src/themes/resolved.test.ts -u`
Expected: обновлена ровно одна строка — `light` → `--color-keycap-error-foreground` с `oklch(0.97 0 20)` на `oklch(0.98 0 0)`.

Run: `git diff --stat src/themes/__snapshots__/resolved.test.ts.snap`
Expected: `1 insertion(+), 1 deletion(-)`. Больше одной пары строк — значит поехало что-то незаявленное; разобраться до коммита.

- [ ] **Step 6: Обновить шапку файла**

В шапке `light.css` заменить абзац про слой 1 — фраза «Палитра перенесена из прежнего light 1:1 (механика, без пересмотра значений) — отсюда её размер; сокращение — отдельная задача» больше не соответствует коду:

```
 *   1. ЯДРО — приватная палитра темы. Имена и количество произвольны, значения
 *      ТОЛЬКО абсолютные. Это единственное место, где в теме появляется новый
 *      цвет. Палитра сведена к базам (ADR 0034): лестницы поверхностей и текста
 *      выводятся в ролях, холодная ветка 280° сведена к --iris.
```

Также убрать из шапки строку «ТРИ СЛОЯ» → она осталась от растворённого слоя контракта; заменить на «ДВА СЛОЯ» и удалить пункт 3. То же самое делается в задачах 7 и 8 для своих файлов.

- [ ] **Step 7: Полный прогон**

Run: `make check-dev`
Expected: чисто.

- [ ] **Step 8: Commit**

```bash
git add src/themes/light.css src/themes/__snapshots__/resolved.test.ts.snap
git commit -m "refactor(themes): light — свести ядро к базам, вывод в ролях"
```

Тело сообщения обязано перечислить заявленные изменения цвета (или их отсутствие) с числами: `--color-keycap-error-foreground: oklch(0.97 0 20) → oklch(0.98 0 0), ΔE 0.01, контраст …`.

---

### Task 7: `dark` — свести ядро

Ядро 40 → ожидаемо 16–18 токенов. Самая большая тема из четырёх.

**Files:**
- Modify: `src/themes/dark.css`

**Interfaces:**
- Consumes: `make theme-report THEME=dark`, снапшот (Task 3).
- Produces: изменения снапшота только по заявленным сведениям.

- [ ] **Step 1: Снять отчёт до правки**

```bash
make theme-report THEME=dark > /tmp/dark-before.txt
```

- [ ] **Step 2: Применить точные выводы**

Пересчёты проверены арифметически и дают ровно исходные координаты.

**База поверхностей `--slate: oklch(0.14 0 0)`** — остаётся; удаляются `--slate-surface`, `--slate-hover`, `--slate-border-base`:

```css
  --color-background   : var(--slate);
  --color-surface      : oklch(from var(--slate) calc(l + 0.06) c h);
  --color-surface-hover: oklch(from var(--slate) calc(l + 0.11) c h);
  --color-border       : oklch(from var(--slate) calc(l + 0.16) c h);
```

**База текста `--snow: oklch(0.96 0 0)`** — остаётся; удаляются `--snow-soft`, `--snow-faint`, `--bead`, `--primary-hover`:

```css
  --color-text-secondary: oklch(from var(--snow) calc(l - 0.24) c h);
  --color-text-muted    : oklch(from var(--snow) calc(l - 0.34) c h);
  --color-marker-core   : oklch(from var(--snow) calc(l - 0.08) c h);
  --color-primary-hover : oklch(from var(--snow) calc(l - 0.08) c h);
```

`--bead` и `--primary-hover` несли одно и то же значение `oklch(0.88 0 0)` — это не сведение, а устранение дубля: координаты не меняются. Здесь же снимается токен, названный по роли.

**Холодная ветка 280°** — вводится `--iris: oklch(0.35 0.04 280)` (значение бывшего `--avatar-fill`); удаляются `--slate-border`, `--menu-fill`, `--avatar-fill`, `--link-ink`, `--link-ink-hover`, `--avatar-ink`:

```css
  --color-surface-raised: oklch(from var(--iris) 0.18 0.01 h); /* выпуклая: меню поверх фона */
  --color-border-accent : oklch(from var(--iris) 0.35 0.01 h); /* была граница user-menu */
  --color-surface-accent: var(--iris);                         /* была плашка аватара */
  --color-link          : oklch(from var(--iris) 0.70 0.08 h);
  --color-link-hover    : oklch(from var(--iris) 0.85 0.1 h);
  --color-ink-strong    : oklch(from var(--iris) 0.92 0.05 h);
```

Сводить `--slate-border` с `--avatar-fill` **нельзя**, хотя ΔE ≈ 0.03: они питают `--color-border-accent` и `--color-surface-accent` — защищённая пара, сведение стёрло бы границу аватара.

**Тёмный текст на плотном** — удаляются `--on-dense-ink` (0.15 0 0) и `--cursor-ink` (0.14 0 0):

```css
  --color-on-dense         : oklch(from var(--slate) calc(l + 0.01) c h);
  --color-cursor-foreground: var(--slate);
```

Оба — точный вывод, не сведение. Правило «вывод раньше сведения»: различие в 0.01 сохраняется даром.

**Акцент и исходы** — удаляются `--amber-hover`, `--red-deep`:

```css
  --color-brand-accent-hover: oklch(from var(--amber) calc(l - 0.06) c h);
  --color-finger-error      : oklch(from var(--red) calc(l - 0.05) calc(c - 0.01) calc(h - 5));
```

**Статусы символов** — удаляются `--pine`, `--brick`, `--crimson` (`--steel` и `--ochre` остаются в ядре):

```css
  --color-symbol-correct    : oklch(from var(--green) 0.78 0.11 calc(h + 1));
  --color-symbol-corrected  : oklch(from var(--red) 0.75 0.15 calc(h - 15));
  --color-symbol-many-errors: oklch(from var(--red) 0.72 0.2 calc(h - 8));
```

**Покой пальца** — удаляется `--mist`:

```css
  --color-finger-idle: oklch(from var(--cream) calc(l - 0.05) c 260);
```

**Тон и кромка группы 1** — удаляются `--keycap-tint-1`, `--keycap-edge-1`:

```css
  --color-keycap-group-1-background: oklch(from var(--slate) calc(l + 0.08) c h / 0.7);
  --color-keycap-group-1-border    : oklch(from var(--slate) calc(l + 0.26) c h);
```

Остающееся ядро: `--slate`, `--snow`, `--iris`, `--amber`, `--green`, `--red`, `--clay`, `--cream`, `--steel`, `--ochre`, `--navy`, `--navy-deep`, `--error-ink`, `--finger-1..5`.

- [ ] **Step 3: Проверить, что снапшот не дрогнул**

Run: `npx vitest run src/themes/resolved.test.ts`
Expected: PASS без обновления снапшота.

- [ ] **Step 4: Переснять отчёт и разобрать кандидатов на сведение**

```bash
make theme-report THEME=dark > /tmp/dark-derived.txt
```

Разбирать по этому отчёту, а не по `/tmp/dark-before.txt`: точные выводы уже удалили часть ядра, и список близких значений стал другим. Раздел «КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ» в обоих отчётах одинаков (выводы цвет не меняют).

Открыть раздел «БЛИЗКИЕ ЗНАЧЕНИЯ» и разобрать каждую пару с ΔE ≤ 0.05 по правилам из Global Constraints. Известный кандидат: `--error-ink` (`oklch(0.97 0 20)`) против группы `--snow` / `--color-text-primary` (`oklch(0.96 0 0)`), ΔE 0.0100 — защищённой парой не связаны.

Для каждой пары, прошедшей ΔE, альфу и защищённые пары, сверить контраст по разделу «КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ»: ни одно отношение затронутой роли не должно упасть с ≥4.5 ниже 4.5 или с ≥3.0 ниже 3.0. Прошедшие — свести, удалив лишний ядровый токен; не прошедшие — оставить и записать причину в сообщении коммита.

- [ ] **Step 5: Снять отчёт после правки и сравнить**

```bash
make theme-report THEME=dark > /tmp/dark-after.txt
diff /tmp/dark-before.txt /tmp/dark-after.txt
```

Expected: различия только в разделе «ЯДРО» (токенов стало меньше), в разделе «БЛИЗКИЕ ЗНАЧЕНИЯ» и в строках ролей, затронутых заявленными сведениями. Любая другая изменившаяся строка роли — незаявленный сдвиг, разобраться до коммита.

- [ ] **Step 6: Обновить снапшот заявленными изменениями**

Run: `npx vitest run src/themes/resolved.test.ts -u`

Run: `git diff src/themes/__snapshots__/resolved.test.ts.snap`
Expected: изменены только строки темы `dark`, и ровно те роли, что заявлены в шаге 4.

- [ ] **Step 7: Обновить шапку файла**

Заменить «ТРИ СЛОЯ» на «ДВА СЛОЯ», удалить пункт 3 (слой контракта растворён, ADR 0029) и переписать пункт 1, убрав фразу «Значения перенесены из прежнего dark 1:1 … — отсюда её размер; сокращение — отдельная задача».

- [ ] **Step 8: Полный прогон**

Run: `make check-dev`
Expected: чисто.

- [ ] **Step 9: Commit**

```bash
git add src/themes/dark.css src/themes/__snapshots__/resolved.test.ts.snap
git commit -m "refactor(themes): dark — свести ядро к базам, вывод в ролях"
```

Тело сообщения перечисляет каждое заявленное изменение цвета с ΔE и контрастом.

---

### Task 8: `nord` — свести ядро

Ядро 35 → ожидаемо 13–15 токенов. Здесь больше всего токенов, названных по роли: пять сверх общего `--primary-hover`.

**Files:**
- Modify: `src/themes/nord.css`

**Interfaces:**
- Consumes: `make theme-report THEME=nord`, снапшот (Task 3).
- Produces: изменения снапшота только по заявленным сведениям.

- [ ] **Step 1: Снять отчёт до правки**

```bash
make theme-report THEME=nord > /tmp/nord-before.txt
```

- [ ] **Step 2: Применить точные выводы**

**База Polar Night `--polar-night: oklch(0.32 0.02 254)`** (переименование `--polar-night-1`) — удаляются `--polar-night-2`, `--polar-night-3`, `--polar-night-4`, `--menu-fill`, `--on-dense-ink`, `--keycap-tint-1`, `--keycap-edge-1`, `--avatar-fill`, `--link-ink`, `--link-ink-hover`:

```css
  --color-background    : var(--polar-night);
  --color-surface-raised: oklch(from var(--polar-night) calc(l + 0.01) c h); /* выпуклая: меню поверх фона */
  --color-surface       : oklch(from var(--polar-night) calc(l + 0.06) c h);
  --color-surface-hover : oklch(from var(--polar-night) calc(l + 0.12) c h);
  --color-border        : oklch(from var(--polar-night) calc(l + 0.18) c h);
  --color-border-accent : oklch(from var(--polar-night) calc(l + 0.18) c h); /* совпадает с базовой границей в nord */
  --color-on-dense      : var(--polar-night);
  --color-finger-base   : oklch(from var(--polar-night) calc(l + 0.18) c h);
  --color-finger-inactive: oklch(from var(--polar-night) calc(l + 0.18) c h);
  --color-finger-idle   : oklch(from var(--polar-night) calc(l + 0.12) c h);
  --color-surface-accent: oklch(from var(--polar-night) 0.45 0.04 h);
  --color-link          : oklch(from var(--polar-night) 0.75 0.06 h);
  --color-link-hover    : oklch(from var(--polar-night) 0.88 0.08 calc(h - 4));
  --color-keycap-group-1-background: oklch(from var(--polar-night) calc(l + 0.08) c h / 0.7);
  --color-keycap-group-1-border    : oklch(from var(--polar-night) calc(l + 0.23) c h);
```

`--menu-fill` **не сводится** с `--polar-night`, хотя ΔE 0.01: `--color-surface-raised` и `--color-background` — защищённая пара, сведение убрало бы выпуклость меню. Оно выводится с дельтой `+0.01`.

**База Snow Storm `--snow-storm: oklch(0.95 0.01 234)`** (переименование `--snow-storm-1`) — удаляются `--snow-storm-2`, `--snow-storm-3`, `--primary-hover`, `--keycap-marker`:

```css
  --color-text-primary  : var(--snow-storm);
  --color-text-secondary: oklch(from var(--snow-storm) calc(l - 0.10) c h);
  --color-text-muted    : oklch(from var(--snow-storm) calc(l - 0.20) c calc(h + 6));
  --color-primary-hover : oklch(from var(--snow-storm) calc(l - 0.07) c h);
  --color-keycap-marker : var(--snow-storm);
```

**Aurora** — удаляются `--aurora-red-dim`, `--aurora-green-dim`, `--aurora-orange-hover` (пары «то же значение под альфой» и ступень hover — это вывод, не сведение):

```css
  --color-error-dim         : oklch(from var(--aurora-red) l c h / 0.2);
  --color-success-dim       : oklch(from var(--aurora-green) l c h / 0.2);
  --color-brand-accent-hover: oklch(from var(--aurora-orange) calc(l - 0.06) c h);
```

**Токены, названные по роли** — `--cursor-background` и `--cursor-foreground` честно ни из чего не выводятся, поэтому остаются абсолютами, но переименовываются по содержимому:

```css
  --amber: oklch(0.77 0.16 70);  /* янтарь бренда: курсор потока */
  --ink  : oklch(0.14 0 0);      /* тёмные чернила на янтаре */
```

```css
  --color-cursor-background: var(--amber);
  --color-cursor-foreground: var(--ink);
```

**Проверить остальные ссылки на переименованные базы.** `--polar-night-1` → `--polar-night` и `--snow-storm-1` → `--snow-storm` затрагивают не только роли, перечисленные выше: на `--snow-storm-1` ссылаются ещё `--color-guide` (`oklch(from var(--snow-storm-1) 0.66 c h)`) и `--color-keycap-error-foreground` (`oklch(from var(--snow-storm-1) 0.97 c h)`). Их тоже перевести на новое имя, значения не трогая.

Убедиться, что старых имён не осталось:

```bash
grep -n -- '--polar-night-[0-9]\|--snow-storm-[0-9]' src/themes/nord.css
```

Expected: ничего не найдено. Висячая ссылка иначе упадёт в `contract.test.ts` («dangling») либо в вычислителе («Undeclared token»).

Остающееся ядро: `--polar-night`, `--snow-storm`, `--aurora-red`, `--aurora-orange`, `--aurora-green`, `--amber`, `--ink`, `--gold`, `--clay`, `--bead`, `--finger-1..5`.

- [ ] **Step 3: Проверить, что снапшот не дрогнул**

Run: `npx vitest run src/themes/resolved.test.ts`
Expected: PASS без обновления снапшота.

- [ ] **Step 4: Переснять отчёт и разобрать кандидатов на сведение**

```bash
make theme-report THEME=nord > /tmp/nord-derived.txt
```

Разбирать по этому отчёту, а не по `/tmp/nord-before.txt`: точные выводы уже удалили часть ядра. Раздел «КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ» в обоих одинаков (выводы цвет не меняют).

Оставшиеся токены, названные по роли, — `--symbol-pending` и `--keycap-label` — как раз кандидаты на сведение с базой Snow Storm:

| пара | ΔE | роли |
| --- | --- | --- |
| `--keycap-marker` ↔ `--snow-storm-1` | 0.0000 | уже снято точным выводом в шаге 2 |
| `--avatar-ink` (0.94 0.02 234) ↔ `--snow-storm-1` (0.95 0.01 234) | ≈ 0.0141 | `--color-ink-strong` ↔ `--color-text-primary` |
| `--keycap-label` (0.87 0.01 240) ↔ `--snow-storm-2` (0.85 0.01 234) | ≈ 0.0201 | `--color-keycap-label` ↔ `--color-text-secondary` |
| `--symbol-pending` (0.78 0.01 240) ↔ `--snow-storm-3` (0.75 0.01 240) | 0.0300 | `--color-symbol-pending` ↔ `--color-text-muted` |

Сверить каждую по полному списку из `/tmp/nord-derived.txt`, раздел «БЛИЗКИЕ ЗНАЧЕНИЯ» — таблица выше не заменяет отчёт, а называет ожидаемое (и записана в исходных именах, до переименования баз из шага 2). Ни одна из пар не входит в защищённые. Для каждой проверить контраст по разделу «КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ»: класс `--color-keycap-label` и `--color-symbol-pending` — текст, порог 4.5.

Прошедшие свести, удалив ядровый токен и записав роль выводом от `--snow-storm`. Например при прошедшем `--symbol-pending`:

```css
  --color-symbol-pending: oklch(from var(--snow-storm) calc(l - 0.20) c calc(h + 6));
```

(то есть то же значение, что `--color-text-muted`). Не прошедшие — оставить абсолютом в ядре под именем по содержимому (`--symbol-pending` → например `--frost-pale`), потому что имя по роли в ядре запрещено независимо от исхода сведения.

- [ ] **Step 5: Снять отчёт после правки и сравнить**

```bash
make theme-report THEME=nord > /tmp/nord-after.txt
diff /tmp/nord-before.txt /tmp/nord-after.txt
```

Expected: изменения только в «ЯДРЕ», «БЛИЗКИХ ЗНАЧЕНИЯХ» и в строках ролей, затронутых заявленными сведениями.

- [ ] **Step 6: Обновить снапшот заявленными изменениями**

Run: `npx vitest run src/themes/resolved.test.ts -u`

Run: `git diff src/themes/__snapshots__/resolved.test.ts.snap`
Expected: изменены только строки темы `nord`, ровно заявленные роли.

- [ ] **Step 7: Обновить шапку файла**

Заменить «ТРИ СЛОЯ» на «ДВА СЛОЯ», удалить пункт 3 и переписать пункт 1, убрав «Значения перенесены из прежнего nord 1:1 … (механика, без пересмотра значений)».

- [ ] **Step 8: Полный прогон**

Run: `make check-dev`
Expected: чисто.

- [ ] **Step 9: Commit**

```bash
git add src/themes/nord.css src/themes/__snapshots__/resolved.test.ts.snap
git commit -m "refactor(themes): nord — свести ядро к базам, вывод в ролях"
```

---

### Task 9: Документация и ADR 0034

**Files:**
- Create: `docs/adr/0034-honest-role-derivation-and-color-parity-gate.md`
- Modify: `docs/adr/README.md` (индекс)
- Modify: `src/themes/CLAUDE.md`
- Modify: `docs/backlog.md` (запись «Темизация — визуальная доводка»)

**Interfaces:**
- Consumes: результаты задач 5–8 (фактические размеры ядра, список сведённых значений).
- Produces: зафиксированное решение.

- [ ] **Step 1: Прочитать политику ведения ADR**

Run: `cat docs/adr/README.md`

Взять из неё принятый формат (структура разделов, статус, нумерация) и оформить 0034 по нему. Тело принятых ADR не переписывать; 0029 остаётся как есть — 0034 его продолжает.

- [ ] **Step 2: Написать ADR 0034**

Создать `docs/adr/0034-honest-role-derivation-and-color-parity-gate.md` по формату из README. Содержание:

- **Контекст.** ADR 0029 ввёл два слоя, но не сказал, что делает вывод роли законным. `light` / `dark` / `nord` были перенесены на схему механически: смысл остался в ядре (35–40 токенов), роли выродились в переименование, часть ядровых токенов названа по роли.
- **Решение.** (1) Критерий честного вывода: минимум один компонент наследуется фактически, и источник — тот, чьей ступенью или отзвуком роль является по смыслу; все три компонента литералами запрещены. (2) Не прошедшее критерий значение остаётся в ядре, но с именем по содержимому. (3) Порог сведения близких значений ΔE ≤ 0.05 при трёх блокираторах: разная альфа, защищённые пары, падение через границу WCAG. (4) Вывод раньше сведения. (5) Гейт цветового равенства — `src/themes/resolved.test.ts`: координаты всех ролей всех тем в снапшоте.
- **Последствия.** Ядро тем — фактические числа после задач 6–8. Перекраска темы становится правкой базы, а не двух сотен строк. Контракт-тест держит форму, снапшот — значение; вместе они закрывают обе половины. Цена: вывод читается хуже абсолюта, поэтому обоснования остаются в комментариях.
- **Альтернативы.** Оставить как есть (расхождение с `sepia` как принятый долг); сжимать ядро до 11 токенов любой ценой (даёт фиктивные связи — «перекрашиваемость» становится иллюзией).

- [ ] **Step 3: Внести ADR в индекс**

Добавить строку про 0034 в таблицу/список `docs/adr/README.md` рядом с 0033, по образцу соседних записей.

- [ ] **Step 4: Обновить `src/themes/CLAUDE.md`**

1. В пункте про двухслойную схему — добавить критерий честного вывода и правило «вывод раньше сведения» со ссылкой на ADR 0034.
2. Добавить пункт про гейт: `resolved.test.ts` держит координаты, `contract.test.ts` — форму; при работе с ядром снимать отчёт `make theme-report THEME=<id>`.
3. Пункт «Идиома правки светлоты» — оговорка «существующие значения здесь не переписываются задним числом» устарела для трёх тем; переписать под фактическое состояние.
4. Заменить строку «Структурная миграция завершена» на утверждение о завершённом сведении ядра с фактическими числами.
5. Зафиксировать имя `--finger-N` как единое во всех темах и объяснить, почему совпадение с `--color-finger-N` допустимо: `finger` — слово предметной области (`FingerId`), а не роль CSS.

- [ ] **Step 5: Обновить бэклог**

В `docs/backlog.md`, запись «Темизация — визуальная доводка»: снять то, что закрыто гранью #6, и дописать найденные, но не сведённые пары (те, что упёрлись в контраст или в защищённые пары) — чтобы находки не потерялись.

- [ ] **Step 6: Проверить орфографию**

Run: `make spell`
Expected: `Issues found: 0 in 0 files.`

При падении — навык `/fix-spell`, whitelist держать узким.

- [ ] **Step 7: Полная проверка перед завершением**

Run: `make check-all`
Expected: lint, check, test, spell, build, convex — всё зелёное.

- [ ] **Step 8: Commit**

```bash
git add docs/adr/0034-honest-role-derivation-and-color-parity-gate.md docs/adr/README.md src/themes/CLAUDE.md docs/backlog.md
git commit -m "docs(themes): ADR 0034 — критерий честного вывода и гейт цветового равенства"
```

---

## Проверка результата

После Task 9 работа считается сделанной, когда одновременно:

1. `make check-all` зелёный.
2. `grep -c` по ядру каждой темы даёт числа порядка `sepia` — то есть ни одна тема не держит 35–40 токенов ядра.
3. Ни в одной теме нет ядрового токена, чьё имя совпадает с именем роли, кроме `--finger-N` (осознанное исключение).
4. История коммитов задач 5–8 показывает: у задачи 5 снапшот не менялся, у 6–8 менялись только заявленные строки, и каждое изменение объяснено в теле коммита числами.
