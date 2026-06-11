# Text Language ↔ Drill Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Гарантировать, что пользователь получает только те drill'ы, символы которых физически набираются на выбранной им раскладке, через явную связку «язык текста ↔ раскладка» с иерархией BCP 47.

**Architecture:** Вводится тип `TextLanguage` (BCP 47), отдельный от `InterfaceLanguage`. В `Drill` появляется поле `textLanguage`. В реестре раскладок каждая запись (`SymbolLayoutDescriptor`) хранит свой родной `textLanguage` и список языков, для которых она — выбор по умолчанию. Фильтр drill'ов идёт от языка раскладки (раскладка — ключевое физическое ограничение). Все валидируемые инварианты — Zod-схемы (`refine`/`superRefine`), используются и в production на старте, и в тестах.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript strict, XState v5, Vitest, Zod, JSONL для корпуса (через Vite `?raw` импорт).

**Spec:** `docs/superpowers/specs/2026-06-06-text-language-and-drill-compatibility-design.md`

---

## File Structure

### Создаются
- `src/lib/text-language-utils.ts` — функция совместимости drill ↔ раскладка
- `src/lib/text-language-utils.test.ts`
- `src/lib/drill-corpus.ts` — парс и экспорт `DRILL_CORPUS`
- `src/lib/drill-selection.ts` — фильтр и случайный выбор drill
- `src/lib/drill-selection.test.ts`
- `src/lib/integrity.ts` — `ApplicationDataSchema` + side-effect проверка на старте
- `src/lib/preferences.test.ts`
- `src/data/layouts/symbol-layout-registry.test.ts`
- `src/data/drills/drills.jsonl` — корпус в новом формате (заменяет `drills.json`)
- `src/interfaces/drill-data.types.test.ts` — unit-тесты `DrillSchema` на синтетике
- `scripts/migrate-drills-to-jsonl.ts` — одноразовый: JSON → JSONL + проставление `textLanguage`
- `scripts/seed-english-drills.ts` — одноразовый: добавление английских drill'ов в JSONL

### Изменяются
- `src/interfaces/types.ts` — `TEXT_LANGUAGES`, `TextLanguage`, `INTERFACE_LANGUAGES`, `InterfaceLanguage`, `SYMBOL_LAYOUT_IDS`, `SymbolLayoutDescriptorSchema`, `SymbolLayoutRegistrySchema`
- `src/interfaces/drill-data.types.ts` — поле `textLanguage` + `.refine()`
- `src/interfaces/user-preferences.ts` — `language` → `interfaceLanguage`, новое `textLanguage`
- `src/user-preferences/user-preferences.ts` — реестр метаданных
- `src/data/layouts/layouts.ts` — реестр descriptor'ов через `SymbolLayoutRegistrySchema.parse`, утилитные функции
- `src/lib/preferences.ts` — `normalizePreferences` вместо `deepMerge`
- `src/lib/typing-stream.ts` — удалить `defaultDrillTexts`
- `src/lib/i18n.ts` — `$p.language` → `$p.interfaceLanguage`
- `src/routes/+layout.svelte` — `$preferences.language` → `$preferences.interfaceLanguage`
- `src/machines/app.machine.ts` — `startNewTrainingStream` использует corpus + filter
- `src/machines/app.machine.test.ts` — детерминизировать через mock-corpus
- `src/machines/appActor.ts` — side-effect import `lib/integrity.ts`
- `src/components/ui/UserPreferencesPage.svelte` — три select'а с динамическими опциями
- `src/components/app/MainContent.svelte` (Props.dictionary) — расширить тип props под новые ключи
- `src/scripts/create-drills.ts` — append-логика JSONL
- `src/data/drills/drills.test.ts` — `parseCorpus` + проверка через `ApplicationDataSchema`
- `dictionaries/en.json`, `dictionaries/ru.json` — новые/переименованные ключи

### Удаляются
- `src/data/drills/drills.json`

---

## Task 1: Языковые типы и константа SYMBOL_LAYOUT_IDS

**Files:**
- Modify: `src/interfaces/types.ts:11-13, 186, 213`

Это фундамент, от которого зависят все остальные задачи. Только типы и константы — без тестов (типы не тестируются).

- [ ] **Step 1: Добавить языковые константы и типы в `interfaces/types.ts`**

Найти строку `export type KeyCapId = typeof KEY_CAP_IDS[number];` и сразу под ней добавить:

```ts
/** Языки, на которых пишутся тексты упражнений (BCP 47). */
export const TEXT_LANGUAGES = ['en', 'ru'] as const;
export type TextLanguage = typeof TEXT_LANGUAGES[number];

/** Языки интерфейса (UI). */
export const INTERFACE_LANGUAGES = ['en', 'ru'] as const;
export type InterfaceLanguage = typeof INTERFACE_LANGUAGES[number];
```

- [ ] **Step 2: Переписать `SymbolLayoutId` через константный массив**

Найти `export type SymbolLayoutId = 'qwerty' | 'йцукен';` (примерно строка 213) и заменить на:

```ts
/** Идентификатор символьного макета (то, что пользователь выбирает в настройках). */
export const SYMBOL_LAYOUT_IDS = ['qwerty', 'йцукен'] as const;
export type SymbolLayoutId = typeof SYMBOL_LAYOUT_IDS[number];
```

- [ ] **Step 3: Проверить компиляцию**

Run: `make check`
Expected: PASS (svelte-kit sync + svelte-check без ошибок)

- [ ] **Step 4: Commit**

```bash
git add src/interfaces/types.ts
git commit -m "feat(types): introduce TextLanguage, InterfaceLanguage, SYMBOL_LAYOUT_IDS constants"
```

---

## Task 2: Утилита `isDrillCompatibleWithSymbolLayout`

**Files:**
- Create: `src/lib/text-language-utils.ts`
- Test: `src/lib/text-language-utils.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `src/lib/text-language-utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isDrillCompatibleWithSymbolLayout } from './text-language-utils';

describe('isDrillCompatibleWithSymbolLayout', () => {
  it('равенство языков → совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en',
      symbolLayoutTextLanguage: 'en',
    })).toBe(true);
  });

  it('drill общее раскладки (drill=en, layout=en-US) → совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en' as never,
      symbolLayoutTextLanguage: 'en-US' as never,
    })).toBe(true);
  });

  it('drill специфичнее раскладки (drill=en-GB, layout=en) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en-GB' as never,
      symbolLayoutTextLanguage: 'en' as never,
    })).toBe(false);
  });

  it('разные ветки иерархии (drill=en-GB, layout=en-US) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en-GB' as never,
      symbolLayoutTextLanguage: 'en-US' as never,
    })).toBe(false);
  });

  it('разные языки (drill=en, layout=ru) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en',
      symbolLayoutTextLanguage: 'ru',
    })).toBe(false);
  });

  it('подстрока не считается префиксом (drill=en, layout=eng) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en' as never,
      symbolLayoutTextLanguage: 'eng' as never,
    })).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `npx vitest run src/lib/text-language-utils.test.ts`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать функцию**

Создать `src/lib/text-language-utils.ts`:

```ts
import type { TextLanguage } from '@/interfaces/types';

/**
 * Возвращает true, если drill можно показать пользователю на этой раскладке
 * с точки зрения языка текста. Drill подходит раскладке, если язык drill
 * равен языку раскладки или является его предком в иерархии BCP 47.
 *
 * Семантика: «раскладка набирает тексты на своём собственном языке и на
 * любых более общих».
 */
export function isDrillCompatibleWithSymbolLayout({
  drillTextLanguage,
  symbolLayoutTextLanguage,
}: {
  drillTextLanguage: TextLanguage;
  symbolLayoutTextLanguage: TextLanguage;
}): boolean {
  if (drillTextLanguage === symbolLayoutTextLanguage) return true;
  if (symbolLayoutTextLanguage.startsWith(drillTextLanguage + '-')) return true;
  return false;
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `npx vitest run src/lib/text-language-utils.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/text-language-utils.ts src/lib/text-language-utils.test.ts
git commit -m "feat(text-language): add isDrillCompatibleWithSymbolLayout utility"
```

---

## Task 3: Расширение `DrillSchema`

**Files:**
- Modify: `src/interfaces/drill-data.types.ts`
- Create: `src/interfaces/drill-data.types.test.ts`

В этой задаче только расширяется схема и пишутся unit-тесты на синтетических объектах. Реальный корпус не трогается — это Task 6.

- [ ] **Step 1: Написать падающий тест**

Создать `src/interfaces/drill-data.types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DrillSchema } from './drill-data.types';

const baseValidRu = {
  id: 'abc',
  text: 'Привет',
  textLanguage: 'ru',
  char_count: 6,
  word_count: 1,
  avg_word_length: 6,
  max_word_length: 6,
  unique_chars: ['п', 'р', 'и', 'в', 'е', 'т'],
  unique_symbols: ['П', 'р', 'и', 'в', 'е', 'т'],
  char_freq: { 'п': 1, 'р': 1, 'и': 1, 'в': 1, 'е': 1, 'т': 1 },
  symbol_freq: { 'П': 1, 'р': 1, 'и': 1, 'в': 1, 'е': 1, 'т': 1 },
  bigrams: ['Пр', 'ри', 'ив', 'ве', 'ет'],
  trigrams: ['При', 'рив', 'иве', 'вет'],
};

describe('DrillSchema', () => {
  it('валидный ru drill парсится', () => {
    expect(() => DrillSchema.parse(baseValidRu)).not.toThrow();
  });

  it('drill без textLanguage не парсится', () => {
    const { textLanguage: _t, ...withoutLang } = baseValidRu;
    expect(() => DrillSchema.parse(withoutLang)).toThrow();
  });

  it('drill с неизвестным textLanguage не парсится', () => {
    expect(() => DrillSchema.parse({ ...baseValidRu, textLanguage: 'de' })).toThrow();
  });

  it('ru drill с латиницей в unique_chars не парсится', () => {
    expect(() => DrillSchema.parse({
      ...baseValidRu,
      unique_chars: [...baseValidRu.unique_chars, 'a'],
    })).toThrow(/Latin/);
  });

  it('en drill с кириллицей в unique_chars не парсится', () => {
    expect(() => DrillSchema.parse({
      ...baseValidRu,
      textLanguage: 'en',
      unique_chars: ['h', 'e', 'l', 'o', 'и'],
    })).toThrow(/Cyrillic/);
  });

  it('en drill только с латиницей парсится', () => {
    expect(() => DrillSchema.parse({
      ...baseValidRu,
      text: 'hello',
      textLanguage: 'en',
      unique_chars: ['h', 'e', 'l', 'o'],
      unique_symbols: ['h', 'e', 'l', 'o'],
      char_freq: { 'h': 1, 'e': 1, 'l': 2, 'o': 1 },
      symbol_freq: { 'h': 1, 'e': 1, 'l': 2, 'o': 1 },
      bigrams: ['he', 'el', 'll', 'lo'],
      trigrams: ['hel', 'ell', 'llo'],
      char_count: 5,
      avg_word_length: 5,
      max_word_length: 5,
    })).not.toThrow();
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `npx vitest run src/interfaces/drill-data.types.test.ts`
Expected: FAIL (валидный ru drill сейчас будет валиден без textLanguage, тест «без textLanguage не парсится» упадёт; уточнения отсутствуют).

- [ ] **Step 3: Расширить `DrillSchema`**

Открыть `src/interfaces/drill-data.types.ts`. Заменить файл целиком:

```ts
/**
 * @file Определения типов для структур данных, получаемых из внешних источников
 * (JSONL-корпус, в будущем — БД).
 */
import { z } from 'zod';
import { TEXT_LANGUAGES } from '@/interfaces/types';

const CYRILLIC_RE = /[а-яё]/i;
const LATIN_RE = /[a-z]/i;

export const DrillSchema = z.object({
  id: z.string().min(1, 'ID cannot be empty').describe('Уникальный идентификатор упражнения (SHA-1 хеш текста).'),
  text: z.string().min(1, 'Drill text cannot be empty').describe('Текст упражнения.'),
  textLanguage: z.enum(TEXT_LANGUAGES).describe('Язык текста упражнения (BCP 47).'),
  char_count: z.number().int().min(0).describe('Количество алфавитных символов.'),
  word_count: z.number().int().min(0).describe('Количество слов.'),
  avg_word_length: z.number().min(0).describe('Средняя длина слова.'),
  max_word_length: z.number().int().min(0).describe('Максимальная длина слова.'),
  unique_chars: z.array(z.string().length(1)).min(1).describe('Уникальные алфавитные символы (lowercase).'),
  unique_symbols: z.array(z.string().length(1)).min(1).describe('Уникальные символы текста.'),
  char_freq: z.record(z.string().length(1), z.number().int().min(0)).describe('Частотность алфавитных символов.'),
  symbol_freq: z.record(z.string().length(1), z.number().int().min(0)).describe('Частотность всех символов.'),
  bigrams: z.array(z.string().length(2)).min(1).describe('Биграммы текста.'),
  trigrams: z.array(z.string().length(3)).min(1).describe('Триграммы текста.'),
})
.refine(
  (d) => d.textLanguage !== 'ru' || !d.unique_chars.some(c => LATIN_RE.test(c)),
  { message: "drill with textLanguage='ru' must not contain Latin letters" }
)
.refine(
  (d) => d.textLanguage !== 'en' || !d.unique_chars.some(c => CYRILLIC_RE.test(c)),
  { message: "drill with textLanguage='en' must not contain Cyrillic letters" }
);

export type Drill = z.infer<typeof DrillSchema>;
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `npx vitest run src/interfaces/drill-data.types.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Зафиксировать что старый `drills.test.ts` теперь падает**

Run: `npx vitest run src/data/drills/drills.test.ts`
Expected: FAIL (drills в `drills.json` не содержат `textLanguage` — это будет починено в Task 6).

Это ожидаемо. Не коммитим, пока не дойдём до Task 6, чтобы не оставлять красную сборку.

- [ ] **Step 6: Commit (атомарный с Task 6)**

**Не коммитим в одиночку.** Задача оставляется готовой к слиянию с Task 6 в одном коммите (схема и миграция данных должны попасть в один коммит, иначе сборка красная между ними).

Пометить эту задачу как «pending squash with Task 6» в чат-логе.

---

## Task 4: `SymbolLayoutDescriptor` и `SymbolLayoutRegistrySchema`

**Files:**
- Modify: `src/interfaces/types.ts` (добавить после `SymbolLayout` / `SymbolLayoutId`)

В этой задаче только добавляются схемы и типы. Тесты на синтетике — в Task 5 вместе с реестром.

- [ ] **Step 1: Добавить импорт zod и схемы в `interfaces/types.ts`**

В начало файла (рядом с другими импортами):

```ts
import { z } from 'zod';
```

И добавить в конец файла (но до i18n-секции `// --- i18n ---`):

```ts
// --- Symbol Layout Descriptor (запись реестра раскладок) ---

export const SymbolLayoutDescriptorSchema = z.object({
  symbolLayoutId: z.enum(SYMBOL_LAYOUT_IDS),
  textLanguage: z.enum(TEXT_LANGUAGES),
  isDefaultForTextLanguages: z.array(z.enum(TEXT_LANGUAGES)),
  symbolLayout: z.custom<SymbolLayout>(
    (val) => Array.isArray(val) && val.every(
      (e: unknown) =>
        typeof e === 'object' && e !== null &&
        typeof (e as { symbol: unknown }).symbol === 'string' &&
        Array.isArray((e as { keyCaps: unknown }).keyCaps)
    ),
    'symbolLayout must be SymbolLayout array'
  ),
})
.refine(
  (d) => d.isDefaultForTextLanguages.includes(d.textLanguage),
  { message: 'descriptor must be default for its own textLanguage' }
)
.refine(
  (d) => d.isDefaultForTextLanguages.every(
    lang => lang === d.textLanguage || d.textLanguage.startsWith(lang + '-')
  ),
  { message: 'isDefaultForTextLanguages must contain only textLanguage or its ancestors' }
);

export type SymbolLayoutDescriptor = z.infer<typeof SymbolLayoutDescriptorSchema>;

export const SymbolLayoutRegistrySchema = z.array(SymbolLayoutDescriptorSchema)
  .superRefine((registry, ctx) => {
    // Не больше одной дефолтной раскладки на язык
    const defaultCounts = new Map<TextLanguage, string[]>();
    for (const d of registry) {
      for (const lang of d.isDefaultForTextLanguages) {
        const list = defaultCounts.get(lang) ?? [];
        list.push(d.symbolLayoutId);
        defaultCounts.set(lang, list);
      }
    }
    for (const [lang, ids] of defaultCounts) {
      if (ids.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Multiple default layouts for textLanguage='${lang}': ${ids.join(', ')}`,
        });
      }
    }
    // Покрытие TEXT_LANGUAGES хотя бы одной раскладкой
    const covered = new Set(registry.flatMap(d => [
      d.textLanguage, ...d.isDefaultForTextLanguages
    ]));
    for (const lang of TEXT_LANGUAGES) {
      if (!covered.has(lang)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No layout covers textLanguage='${lang}'`,
        });
      }
    }
  });
```

- [ ] **Step 2: Проверить компиляцию**

Run: `make check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/interfaces/types.ts
git commit -m "feat(types): add SymbolLayoutDescriptor/RegistrySchema with Zod invariants"
```

---

## Task 5: Реестр раскладок и утилитные функции

**Files:**
- Modify: `src/data/layouts/layouts.ts`
- Create: `src/data/layouts/symbol-layout-registry.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `src/data/layouts/symbol-layout-registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TEXT_LANGUAGES, type TextLanguage } from '@/interfaces/types';
import {
  getSymbolLayoutDescriptor,
  getDefaultSymbolLayoutForTextLanguage,
  getCompatibleSymbolLayoutsForTextLanguage,
  getSymbolsSupportedBySymbolLayout,
} from './layouts';

describe('symbol layout registry', () => {
  it('getSymbolLayoutDescriptor возвращает descriptor для каждого SYMBOL_LAYOUT_ID', () => {
    expect(getSymbolLayoutDescriptor('qwerty').symbolLayoutId).toBe('qwerty');
    expect(getSymbolLayoutDescriptor('йцукен').symbolLayoutId).toBe('йцукен');
  });

  it('getDefaultSymbolLayoutForTextLanguage не падает для каждого TEXT_LANGUAGES', () => {
    for (const lang of TEXT_LANGUAGES) {
      expect(() => getDefaultSymbolLayoutForTextLanguage(lang)).not.toThrow();
    }
  });

  it('getDefault: en → qwerty, ru → йцукен', () => {
    expect(getDefaultSymbolLayoutForTextLanguage('en').symbolLayoutId).toBe('qwerty');
    expect(getDefaultSymbolLayoutForTextLanguage('ru').symbolLayoutId).toBe('йцукен');
  });

  it('getDefault для неизвестного диалекта откатывается к родителю', () => {
    // 'en-CA' нет в реестре — фолбэк к 'en' → qwerty
    expect(getDefaultSymbolLayoutForTextLanguage('en-CA' as TextLanguage).symbolLayoutId)
      .toBe('qwerty');
  });

  it('getCompatibleSymbolLayoutsForTextLanguage(en) включает qwerty', () => {
    const compatible = getCompatibleSymbolLayoutsForTextLanguage('en');
    expect(compatible.map(d => d.symbolLayoutId)).toContain('qwerty');
    expect(compatible.map(d => d.symbolLayoutId)).not.toContain('йцукен');
  });

  it('getSymbolsSupportedBySymbolLayout возвращает Set строк', () => {
    const qwerty = getSymbolLayoutDescriptor('qwerty').symbolLayout;
    const supported = getSymbolsSupportedBySymbolLayout(qwerty);
    expect(supported.has('a')).toBe(true);
    expect(supported.has('z')).toBe(true);
    expect(supported.has(' ')).toBe(true);
    expect(supported.has('я')).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `npx vitest run src/data/layouts/symbol-layout-registry.test.ts`
Expected: FAIL (новые функции не существуют).

- [ ] **Step 3: Переписать `data/layouts/layouts.ts`**

Заменить файл целиком:

```ts
import type {
  SymbolLayout,
  SymbolLayoutDescriptor,
  SymbolLayoutId,
  TextLanguage,
} from '@/interfaces/types';
import { SymbolLayoutRegistrySchema } from '@/interfaces/types';
import { symbolLayoutQwerty } from './symbol-layout-qwerty';
import { symbolLayoutJcuken } from './symbol-layout-jcuken';

/**
 * Плоская таблица descriptor'ов раскладок. Источник истины для:
 * - какие раскладки существуют (id),
 * - на каком языке каждая печатает (textLanguage),
 * - для каких языков каждая является дефолтным выбором.
 * Инварианты схемы проверяются на старте модуля.
 */
export const SYMBOL_LAYOUT_REGISTRY: SymbolLayoutDescriptor[] =
  SymbolLayoutRegistrySchema.parse([
    {
      symbolLayoutId: 'qwerty',
      textLanguage: 'en',
      isDefaultForTextLanguages: ['en'],
      symbolLayout: symbolLayoutQwerty,
    },
    {
      symbolLayoutId: 'йцукен',
      textLanguage: 'ru',
      isDefaultForTextLanguages: ['ru'],
      symbolLayout: symbolLayoutJcuken,
    },
  ]);

export const getSymbolLayout = (id: SymbolLayoutId): SymbolLayout =>
  SYMBOL_LAYOUT_REGISTRY.find(d => d.symbolLayoutId === id)!.symbolLayout;

export const getSymbolLayoutDescriptor = (
  id: SymbolLayoutId
): SymbolLayoutDescriptor =>
  SYMBOL_LAYOUT_REGISTRY.find(d => d.symbolLayoutId === id)!;

export const getDefaultSymbolLayoutForTextLanguage = (
  textLang: TextLanguage
): SymbolLayoutDescriptor => {
  const exact = SYMBOL_LAYOUT_REGISTRY.find(
    d => d.isDefaultForTextLanguages.includes(textLang)
  );
  if (exact) return exact;
  // Фолбэк по родителю (BCP 47): 'en-CA' → 'en'
  const parent = textLang.split('-').slice(0, -1).join('-');
  if (parent.length > 0) {
    return getDefaultSymbolLayoutForTextLanguage(parent as TextLanguage);
  }
  throw new Error(`No default symbol layout for textLanguage: ${textLang}`);
};

export const getCompatibleSymbolLayoutsForTextLanguage = (
  textLang: TextLanguage
): SymbolLayoutDescriptor[] =>
  SYMBOL_LAYOUT_REGISTRY.filter(
    d => d.textLanguage === textLang || d.textLanguage.startsWith(textLang + '-')
  );

export const getSymbolsSupportedBySymbolLayout = (
  symbolLayout: SymbolLayout
): Set<string> => new Set(symbolLayout.map(e => e.symbol));
```

- [ ] **Step 4: Запустить тесты — должны пройти**

Run: `npx vitest run src/data/layouts/symbol-layout-registry.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Проверить, что старый код, использующий `getSymbolLayout(id?)`, ещё компилируется**

Run: `make check`
Expected: PASS.

Если в каких-то местах вызывалось `getSymbolLayout()` без аргументов, потребуется поправить (теперь сигнатура требует `id`). Поиск:

```bash
grep -rn "getSymbolLayout(" /Users/belan/PROJECTS/flow-typing/src --include="*.ts" --include="*.svelte"
```

Каждый вызов без аргумента заменить на `getSymbolLayout('qwerty')` (это совпадает со старым дефолтом).

- [ ] **Step 6: Commit**

```bash
git add src/data/layouts/layouts.ts src/data/layouts/symbol-layout-registry.test.ts
git commit -m "feat(layouts): introduce SYMBOL_LAYOUT_REGISTRY with descriptor and utilities"
```

---

## Task 6: Миграция drills.json → drills.jsonl + seed английских drill'ов + Schema fix

**Files:**
- Create: `scripts/migrate-drills-to-jsonl.ts`
- Create: `scripts/seed-english-drills.ts`
- Create: `src/data/drills/drills.jsonl`
- Delete: `src/data/drills/drills.json`
- Modify: `src/data/drills/drills.test.ts`

Этот шаг объединяет миграционный скрипт, его прогон, добавление английских drill'ов (чтобы Инвариант 8 был выполнен для qwerty), и обновление существующего теста. Закрывается в одном коммите вместе с Task 3 (`DrillSchema`).

- [ ] **Step 1: Написать миграционный скрипт**

Создать `scripts/migrate-drills-to-jsonl.ts`:

```ts
#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';

const CYRILLIC = /[а-яё]/i;
const LATIN = /[a-z]/i;

function detect(uniqueChars: string[]): 'en' | 'ru' | 'mixed' | 'neutral' {
  const hasCyr = uniqueChars.some(c => CYRILLIC.test(c));
  const hasLat = uniqueChars.some(c => LATIN.test(c));
  if (hasCyr && hasLat) return 'mixed';
  if (hasCyr) return 'ru';
  if (hasLat) return 'en';
  return 'neutral';
}

const cwd = process.cwd();
const inputPath = path.join(cwd, 'src/data/drills/drills.json');
const outputPath = path.join(cwd, 'src/data/drills/drills.jsonl');

const drills: Array<{ id: string; unique_chars: string[] }> = JSON.parse(
  fs.readFileSync(inputPath, 'utf-8')
);

const migrated: string[] = [];
const dropped: Array<{ id: string; reason: string }> = [];

for (const d of drills) {
  const lang = detect(d.unique_chars);
  if (lang === 'mixed' || lang === 'neutral') {
    dropped.push({ id: d.id, reason: lang });
    continue;
  }
  migrated.push(JSON.stringify({ ...d, textLanguage: lang }));
}

fs.writeFileSync(outputPath, migrated.join('\n') + '\n');
console.log(`Migrated: ${migrated.length}`);
console.log(`Dropped:  ${dropped.length}`);
if (dropped.length > 0) console.log('Dropped drills:', dropped);
```

- [ ] **Step 2: Прогнать миграцию**

Run: `npx tsx scripts/migrate-drills-to-jsonl.ts`
Expected: вывод формата `Migrated: N` / `Dropped: M`. Файл `src/data/drills/drills.jsonl` создан.

- [ ] **Step 3: Удалить старый JSON**

```bash
rm src/data/drills/drills.json
```

- [ ] **Step 4: Написать seed-скрипт для английских drill'ов**

Создать `scripts/seed-english-drills.ts`:

```ts
#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const ENGLISH_SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'Hello, world!',
  'To be or not to be, that is the question.',
  'A journey of a thousand miles begins with a single step.',
  'Practice makes perfect.',
];

function sha1(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function extractWords(t: string): string[] {
  return t.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length > 0);
}

function analyze(text: string) {
  const chars = text.toLowerCase().match(/[a-z]/g) ?? [];
  const uniqueChars = [...new Set(chars)].sort();
  const uniqueSymbols = [...new Set(text.split(''))].sort();
  const charFreq: Record<string, number> = {};
  for (const c of chars) charFreq[c] = (charFreq[c] ?? 0) + 1;
  const symbolFreq: Record<string, number> = {};
  for (const c of text) symbolFreq[c] = (symbolFreq[c] ?? 0) + 1;
  const bigrams: string[] = [];
  for (let i = 0; i < text.length - 1; i++) bigrams.push(text.substring(i, i + 2));
  const trigrams: string[] = [];
  for (let i = 0; i < text.length - 2; i++) trigrams.push(text.substring(i, i + 3));
  const words = extractWords(text);
  return {
    char_count: chars.length,
    word_count: words.length,
    avg_word_length: words.length
      ? +(words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(2)
      : 0,
    max_word_length: words.length ? Math.max(...words.map(w => w.length)) : 0,
    unique_chars: uniqueChars,
    unique_symbols: uniqueSymbols,
    char_freq: charFreq,
    symbol_freq: symbolFreq,
    bigrams,
    trigrams,
  };
}

const outputPath = path.join(process.cwd(), 'src/data/drills/drills.jsonl');
const existing = fs.readFileSync(outputPath, 'utf-8').split('\n').filter(l => l.trim());
const existingIds = new Set(existing.map(l => JSON.parse(l).id));

const lines: string[] = [];
for (const text of ENGLISH_SENTENCES) {
  const id = sha1(text);
  if (existingIds.has(id)) continue;
  lines.push(JSON.stringify({ id, text, textLanguage: 'en', ...analyze(text) }));
}

if (lines.length > 0) {
  fs.appendFileSync(outputPath, lines.join('\n') + '\n');
}
console.log(`Seeded: ${lines.length} English drills`);
```

- [ ] **Step 5: Прогнать seed-скрипт**

Run: `npx tsx scripts/seed-english-drills.ts`
Expected: `Seeded: 5 English drills` (или меньше, если какие-то ID совпали).

- [ ] **Step 6: Обновить `src/data/drills/drills.test.ts`**

Заменить файл целиком:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import rawCorpus from './drills.jsonl?raw';
import { DrillSchema } from '../../interfaces/drill-data.types';

function parseCorpus(raw: string) {
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  return lines.map((line, i) => {
    try {
      return DrillSchema.parse(JSON.parse(line));
    } catch (e) {
      throw new Error(`Invalid drill at line ${i + 1}: ${e}`);
    }
  });
}

describe('drills.jsonl', () => {
  it('весь корпус успешно парсится через DrillSchema (инварианты 6, 7)', () => {
    expect(() => parseCorpus(rawCorpus)).not.toThrow();
  });

  it('корпус не пустой', () => {
    expect(parseCorpus(rawCorpus).length).toBeGreaterThan(0);
  });

  it('в корпусе есть и en, и ru drills', () => {
    const corpus = parseCorpus(rawCorpus);
    const langs = new Set(corpus.map(d => d.textLanguage));
    expect(langs.has('en')).toBe(true);
    expect(langs.has('ru')).toBe(true);
  });
});
```

- [ ] **Step 7: Запустить тест**

Run: `npx vitest run src/data/drills/drills.test.ts src/interfaces/drill-data.types.test.ts`
Expected: PASS оба файла.

- [ ] **Step 8: Финальная проверка**

Run: `make check-all`
Expected: PASS.

- [ ] **Step 9: Commit (squashed с Task 3)**

```bash
git add src/interfaces/drill-data.types.ts src/interfaces/drill-data.types.test.ts \
        scripts/migrate-drills-to-jsonl.ts scripts/seed-english-drills.ts \
        src/data/drills/drills.jsonl src/data/drills/drills.test.ts
git rm src/data/drills/drills.json
git commit -m "feat(drills): migrate corpus to JSONL, add textLanguage field, seed English drills

DrillSchema gets textLanguage (Zod enum) + two refinements (no Latin in 'ru', no Cyrillic in 'en'). Existing Russian drills auto-tagged via unique_chars detection. Five seed English drills added so the 'qwerty' layout has compatible content (required by Invariant 8 in spec)."
```

---

## Task 7: `drill-corpus.ts` — загрузка и парсинг JSONL в рантайме

**Files:**
- Create: `src/lib/drill-corpus.ts`

- [ ] **Step 1: Реализовать (без отдельного теста — функционал покрывается `drills.test.ts` через `parseCorpus`-аналог)**

Создать `src/lib/drill-corpus.ts`:

```ts
import rawCorpus from '@/data/drills/drills.jsonl?raw';
import { DrillSchema } from '@/interfaces/drill-data.types';
import type { Drill } from '@/interfaces/drill-data.types';

function parseCorpus(raw: string): Drill[] {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line, index) => {
    try {
      return DrillSchema.parse(JSON.parse(line));
    } catch (e) {
      throw new Error(`Invalid drill at line ${index + 1}: ${e}`);
    }
  });
}

/**
 * Корпус всех drill'ов, загруженный на старте модуля.
 * При нарушении схемы какой-либо записи модуль выбрасывает с точной строкой.
 */
export const DRILL_CORPUS: Drill[] = parseCorpus(rawCorpus);
```

- [ ] **Step 2: Sanity-check через `make check` + один прогон тестов**

Run: `make check && npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/drill-corpus.ts
git commit -m "feat(corpus): load drills.jsonl at module init via Vite ?raw import"
```

---

## Task 8: `drill-selection.ts` — фильтр и случайный выбор

**Files:**
- Create: `src/lib/drill-selection.ts`
- Test: `src/lib/drill-selection.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `src/lib/drill-selection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Drill } from '@/interfaces/drill-data.types';
import type { SymbolLayoutDescriptor } from '@/interfaces/types';
import { filterDrillsBySymbolLayout, selectRandomDrill } from './drill-selection';

const drillEn: Drill = {
  id: '1', text: 'hi', textLanguage: 'en',
  char_count: 2, word_count: 1, avg_word_length: 2, max_word_length: 2,
  unique_chars: ['h', 'i'], unique_symbols: ['h', 'i'],
  char_freq: { h: 1, i: 1 }, symbol_freq: { h: 1, i: 1 },
  bigrams: ['hi'], trigrams: ['hi '],
};
const drillRu: Drill = {
  id: '2', text: 'да', textLanguage: 'ru',
  char_count: 2, word_count: 1, avg_word_length: 2, max_word_length: 2,
  unique_chars: ['д', 'а'], unique_symbols: ['д', 'а'],
  char_freq: { д: 1, а: 1 }, symbol_freq: { д: 1, а: 1 },
  bigrams: ['да'], trigrams: ['да '],
};

const qwertyDescriptor: SymbolLayoutDescriptor = {
  symbolLayoutId: 'qwerty',
  textLanguage: 'en',
  isDefaultForTextLanguages: ['en'],
  symbolLayout: [
    { symbol: 'h', keyCaps: ['KeyH'] },
    { symbol: 'i', keyCaps: ['KeyI'] },
  ],
};

describe('filterDrillsBySymbolLayout', () => {
  it('пропускает drill с подходящим языком и символами', () => {
    const result = filterDrillsBySymbolLayout({
      allDrills: [drillEn],
      symbolLayoutDescriptor: qwertyDescriptor,
    });
    expect(result).toEqual([drillEn]);
  });

  it('отсекает drill с несовместимым языком', () => {
    expect(filterDrillsBySymbolLayout({
      allDrills: [drillRu],
      symbolLayoutDescriptor: qwertyDescriptor,
    })).toEqual([]);
  });

  it('отсекает drill, в котором есть символ, отсутствующий в раскладке', () => {
    const drillWithExtra: Drill = {
      ...drillEn,
      id: '3',
      unique_symbols: ['h', 'i', '£'],
    };
    expect(filterDrillsBySymbolLayout({
      allDrills: [drillWithExtra],
      symbolLayoutDescriptor: qwertyDescriptor,
    })).toEqual([]);
  });

  it('пустой массив на входе → пустой массив на выходе', () => {
    expect(filterDrillsBySymbolLayout({
      allDrills: [],
      symbolLayoutDescriptor: qwertyDescriptor,
    })).toEqual([]);
  });
});

describe('selectRandomDrill', () => {
  it('возвращает null на пустом массиве', () => {
    expect(selectRandomDrill({ drills: [] })).toBeNull();
  });

  it('возвращает элемент из непустого массива', () => {
    const result = selectRandomDrill({ drills: [drillEn] });
    expect(result).toBe(drillEn);
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `npx vitest run src/lib/drill-selection.test.ts`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать**

Создать `src/lib/drill-selection.ts`:

```ts
import type { Drill } from '@/interfaces/drill-data.types';
import type { SymbolLayoutDescriptor } from '@/interfaces/types';
import { getSymbolsSupportedBySymbolLayout } from '@/data/layouts/layouts';
import { isDrillCompatibleWithSymbolLayout } from '@/lib/text-language-utils';

/**
 * Возвращает подмножество drill'ов, совместимых с раскладкой:
 * - язык drill совместим с языком раскладки (правило префикса BCP 47);
 * - все символы текста физически набираются (страховка против битых тегов).
 */
export function filterDrillsBySymbolLayout({
  allDrills,
  symbolLayoutDescriptor,
}: {
  allDrills: Drill[];
  symbolLayoutDescriptor: SymbolLayoutDescriptor;
}): Drill[] {
  const supportedSymbols = getSymbolsSupportedBySymbolLayout(
    symbolLayoutDescriptor.symbolLayout
  );
  return allDrills.filter((drill) => {
    if (!isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: drill.textLanguage,
      symbolLayoutTextLanguage: symbolLayoutDescriptor.textLanguage,
    })) return false;
    return drill.unique_symbols.every((sym) => supportedSymbols.has(sym));
  });
}

/** Возвращает случайный drill из массива или null, если массив пуст. */
export function selectRandomDrill({ drills }: { drills: Drill[] }): Drill | null {
  if (drills.length === 0) return null;
  return drills[Math.floor(Math.random() * drills.length)]!;
}
```

- [ ] **Step 4: Запустить тесты — должны пройти**

Run: `npx vitest run src/lib/drill-selection.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/drill-selection.ts src/lib/drill-selection.test.ts
git commit -m "feat(drills): add filterDrillsBySymbolLayout and selectRandomDrill"
```

---

## Task 9: `integrity.ts` — cross-collection инвариант

**Files:**
- Create: `src/lib/integrity.ts`
- Modify: `src/machines/appActor.ts` (импорт ради side-effect)

- [ ] **Step 1: Реализовать integrity.ts**

Создать `src/lib/integrity.ts`:

```ts
import { z } from 'zod';
import { SymbolLayoutRegistrySchema } from '@/interfaces/types';
import { DrillSchema } from '@/interfaces/drill-data.types';
import { SYMBOL_LAYOUT_REGISTRY } from '@/data/layouts/layouts';
import { DRILL_CORPUS } from '@/lib/drill-corpus';
import { filterDrillsBySymbolLayout } from '@/lib/drill-selection';

/**
 * Cross-collection инвариант: для каждой раскладки в реестре в корпусе должен
 * быть хотя бы один совместимый drill. Без этой проверки `startNewTrainingStream`
 * мог бы выбросить в рантайме «no drills for layout=X» — ловим раньше, при загрузке.
 */
const ApplicationDataSchema = z.object({
  registry: SymbolLayoutRegistrySchema,
  corpus: z.array(DrillSchema),
}).superRefine(({ registry, corpus }, ctx) => {
  for (const d of registry) {
    const compatible = filterDrillsBySymbolLayout({
      allDrills: corpus,
      symbolLayoutDescriptor: d,
    });
    if (compatible.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `No drills in corpus for layout '${d.symbolLayoutId}'`,
      });
    }
  }
});

// Side-effect: упадёт на загрузке модуля при нарушении.
ApplicationDataSchema.parse({
  registry: SYMBOL_LAYOUT_REGISTRY,
  corpus: DRILL_CORPUS,
});
```

- [ ] **Step 2: Подключить через side-effect импорт в `appActor.ts`**

Открыть `src/machines/appActor.ts` и добавить **первым** импортом (он не должен оптимизироваться компилятором):

```ts
import '@/lib/integrity'; // side-effect: ApplicationDataSchema.parse на старте
```

- [ ] **Step 3: Sanity-check**

Run: `make check && npx vitest run`
Expected: PASS.

- [ ] **Step 4: Дополнительный сценарий-тест на симметрию (опционально, если есть запас времени)**

В `drills.test.ts` добавить:

```ts
it('инвариант 8: для каждой раскладки в реестре есть >0 совместимых drills', async () => {
  const { SYMBOL_LAYOUT_REGISTRY } = await import('@/data/layouts/layouts');
  const { DRILL_CORPUS } = await import('@/lib/drill-corpus');
  const { filterDrillsBySymbolLayout } = await import('@/lib/drill-selection');
  for (const d of SYMBOL_LAYOUT_REGISTRY) {
    const compatible = filterDrillsBySymbolLayout({
      allDrills: DRILL_CORPUS,
      symbolLayoutDescriptor: d,
    });
    expect(compatible.length, `no drills for ${d.symbolLayoutId}`).toBeGreaterThan(0);
  }
});
```

(Дублирует то, что делает `ApplicationDataSchema`, но даёт явный тест-кейс в Vitest-отчёте.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/integrity.ts src/machines/appActor.ts src/data/drills/drills.test.ts
git commit -m "feat(integrity): add ApplicationDataSchema for cross-collection invariant"
```

---

## Task 10: `UserPreferences` interface + DEFAULT_USER_PREFERENCES

**Files:**
- Modify: `src/interfaces/user-preferences.ts`
- Modify: `src/user-preferences/user-preferences.ts`

- [ ] **Step 1: Обновить интерфейс**

Заменить `src/interfaces/user-preferences.ts` целиком:

```ts
import type {
  InterfaceLanguage,
  SymbolLayoutId,
  TextLanguage,
} from '@/interfaces/types';

/**
 * Структура пользовательских предпочтений.
 * - `interfaceLanguage` — язык UI (меню, словари).
 * - `textLanguage` — язык упражнений (первичная ось выбора в настройках,
 *   определяет какие drill'ы попадают в тренировку, какие раскладки доступны).
 * - `symbolLayoutId` — выбранная пользователем раскладка (производное от textLanguage).
 */
export interface UserPreferences {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  shared: {
    exerciseId?: string;
  };
}
```

- [ ] **Step 2: Обновить реестр метаданных и `DEFAULT_USER_PREFERENCES`**

Заменить `src/user-preferences/user-preferences.ts` целиком:

```ts
import type { UserPreferences } from '@/interfaces/user-preferences';
import type { SettingMetadata, SettingOption } from '@/interfaces/types';

const INTERFACE_LANGUAGE_OPTIONS: SettingOption<UserPreferences['interfaceLanguage']>[] = [
  { value: 'en', labelCode: 'options.interfaceLanguages.en' },
  { value: 'ru', labelCode: 'options.interfaceLanguages.ru' },
];

const TEXT_LANGUAGE_OPTIONS: SettingOption<UserPreferences['textLanguage']>[] = [
  { value: 'en', labelCode: 'options.textLanguages.en' },
  { value: 'ru', labelCode: 'options.textLanguages.ru' },
];

const USER_PREFERENCE_METADATA: Array<
  | SettingMetadata<UserPreferences['interfaceLanguage']>
  | SettingMetadata<UserPreferences['textLanguage']>
  | SettingMetadata<UserPreferences['symbolLayoutId']>
> = [
  {
    key: 'interfaceLanguage',
    storageKey: 'userInterfaceLanguage',
    labelCode: 'user_preferences.interface_language_label',
    descriptionCode: 'user_preferences.interface_language_description',
    type: 'enum',
    defaultValue: 'en',
    options: INTERFACE_LANGUAGE_OPTIONS,
    categoryCode: 'user_preferences.category.general',
    componentType: 'select',
  },
  {
    key: 'textLanguage',
    storageKey: 'userTextLanguage',
    labelCode: 'user_preferences.text_language_label',
    descriptionCode: 'user_preferences.text_language_description',
    type: 'enum',
    defaultValue: 'en',
    options: TEXT_LANGUAGE_OPTIONS,
    categoryCode: 'user_preferences.category.general',
    componentType: 'select',
  },
  {
    key: 'symbolLayoutId',
    storageKey: 'userSymbolLayoutId',
    labelCode: 'user_preferences.symbol_layout_label',
    descriptionCode: 'user_preferences.symbol_layout_description',
    type: 'enum',
    defaultValue: 'qwerty',
    // Опции для symbolLayoutId — динамические, рендерятся в UserPreferencesPage напрямую
    // из getCompatibleSymbolLayoutsForTextLanguage(prefs.textLanguage).
    options: [],
    categoryCode: 'user_preferences.category.general',
    componentType: 'select',
  },
];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  shared: {},
};
```

- [ ] **Step 3: Зафиксировать что некоторые места теперь падают на компиляции**

Run: `make check`
Expected: FAIL (UserPreferencesPage.svelte, lib/i18n.ts, lib/preferences.ts, +layout.svelte ссылаются на `.language`).

Это ожидаемо — починим в Task 11–14.

- [ ] **Step 4: НЕ коммитить отдельно**

Эта задача оставляется готовой к слиянию с Task 11 (preferences.ts) в одном коммите, чтобы избежать промежуточно красной сборки.

---

## Task 11: `preferences.ts` — нормализация и type-guards

**Files:**
- Modify: `src/lib/preferences.ts`
- Create: `src/lib/preferences.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `src/lib/preferences.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizePreferences } from './preferences';

describe('normalizePreferences', () => {
  it('пустой объект → каскад дефолтов', () => {
    const result = normalizePreferences({});
    expect(result).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      shared: {},
    });
  });

  it('null → каскад дефолтов', () => {
    expect(normalizePreferences(null)).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      shared: {},
    });
  });

  it('частичный: только textLanguage → подставляется дефолтная раскладка', () => {
    const result = normalizePreferences({ textLanguage: 'ru' });
    expect(result.interfaceLanguage).toBe('en');
    expect(result.textLanguage).toBe('ru');
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('полный совместимый → как есть', () => {
    const input = {
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      shared: { exerciseId: 'x' },
    };
    expect(normalizePreferences(input)).toEqual(input);
  });

  it('несовместимая пара textLanguage=ru + symbolLayoutId=qwerty → сброс раскладки', () => {
    const result = normalizePreferences({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'qwerty',
    });
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('legacy `language` поле игнорируется (не читается как interfaceLanguage)', () => {
    const result = normalizePreferences({
      language: 'ru',
      symbolLayoutId: 'йцукен',
    });
    // language не должен быть прочитан, interfaceLanguage берётся дефолт 'en'
    expect(result.interfaceLanguage).toBe('en');
    // textLanguage = interfaceLanguage = 'en'
    expect(result.textLanguage).toBe('en');
    // symbolLayoutId='йцукен' несовместим с en → сброс на qwerty
    expect(result.symbolLayoutId).toBe('qwerty');
  });

  it('мусор в textLanguage игнорируется и подставляется дефолт', () => {
    const result = normalizePreferences({ textLanguage: 'de' });
    expect(result.textLanguage).toBe('en');
  });
});
```

- [ ] **Step 2: Запустить тест — упадёт**

Run: `npx vitest run src/lib/preferences.test.ts`
Expected: FAIL (`normalizePreferences` не экспортирован).

- [ ] **Step 3: Переписать `src/lib/preferences.ts`**

Заменить файл целиком:

```ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import {
  INTERFACE_LANGUAGES,
  SYMBOL_LAYOUT_IDS,
  TEXT_LANGUAGES,
  type InterfaceLanguage,
  type SymbolLayoutId,
  type TextLanguage,
} from '@/interfaces/types';
import type { UserPreferences } from '@/interfaces/user-preferences';
import { DEFAULT_USER_PREFERENCES } from '@/user-preferences/user-preferences';
import {
  getCompatibleSymbolLayoutsForTextLanguage,
  getDefaultSymbolLayoutForTextLanguage,
} from '@/data/layouts/layouts';

const STORAGE_KEY = 'flow-typing-user-preferences';

function isInterfaceLanguage(v: unknown): v is InterfaceLanguage {
  return typeof v === 'string' && (INTERFACE_LANGUAGES as readonly string[]).includes(v);
}
function isTextLanguage(v: unknown): v is TextLanguage {
  return typeof v === 'string' && (TEXT_LANGUAGES as readonly string[]).includes(v);
}
function isSymbolLayoutId(v: unknown): v is SymbolLayoutId {
  return typeof v === 'string' && (SYMBOL_LAYOUT_IDS as readonly string[]).includes(v);
}

function isSymbolLayoutCompatibleWithTextLanguage({
  symbolLayoutId,
  textLanguage,
}: {
  symbolLayoutId: SymbolLayoutId;
  textLanguage: TextLanguage;
}): boolean {
  return getCompatibleSymbolLayoutsForTextLanguage(textLanguage)
    .some(d => d.symbolLayoutId === symbolLayoutId);
}

/**
 * Приводит произвольное содержимое localStorage к валидному UserPreferences,
 * заполняя пропуски по каскаду interfaceLanguage → textLanguage → symbolLayoutId.
 * Legacy ключи (например, старый `language`) игнорируются.
 */
export function normalizePreferences(raw: unknown): UserPreferences {
  const stored = (raw ?? {}) as Record<string, unknown>;

  const interfaceLanguage = isInterfaceLanguage(stored.interfaceLanguage)
    ? stored.interfaceLanguage
    : DEFAULT_USER_PREFERENCES.interfaceLanguage;

  const textLanguage: TextLanguage = isTextLanguage(stored.textLanguage)
    ? stored.textLanguage
    : (interfaceLanguage as TextLanguage);

  const candidate = isSymbolLayoutId(stored.symbolLayoutId) ? stored.symbolLayoutId : undefined;
  const symbolLayoutId: SymbolLayoutId =
    candidate &&
    isSymbolLayoutCompatibleWithTextLanguage({ symbolLayoutId: candidate, textLanguage })
      ? candidate
      : getDefaultSymbolLayoutForTextLanguage(textLanguage).symbolLayoutId;

  const shared =
    typeof stored.shared === 'object' && stored.shared !== null
      ? (stored.shared as UserPreferences['shared'])
      : {};

  return { interfaceLanguage, textLanguage, symbolLayoutId, shared };
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function createPreferencesStore() {
  const load = (): UserPreferences => {
    if (!browser) return { ...DEFAULT_USER_PREFERENCES };
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeJsonParse(raw) : null;
    return normalizePreferences(parsed);
  };

  const store = writable<UserPreferences>(load());

  store.subscribe((value) => {
    if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });

  return {
    subscribe: store.subscribe,
    update: (fn: (current: UserPreferences) => UserPreferences) =>
      store.update(current => normalizePreferences(fn(current))),
    set: (value: UserPreferences) => store.set(normalizePreferences(value)),
  };
}

export const preferences = createPreferencesStore();
export const symbolLayoutId = derived(preferences, ($p) => $p.symbolLayoutId);

export function updatePreferences(partial: Partial<UserPreferences>) {
  preferences.update((current) => ({ ...current, ...partial }));
}
```

- [ ] **Step 4: Запустить preferences-тест — должен пройти**

Run: `npx vitest run src/lib/preferences.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 5: НЕ коммитить отдельно**

Сборка всё ещё красная (другие файлы используют `$p.language`). Сольём в общий коммит после Task 14.

---

## Task 12: `app.machine.ts` — выбор drill из корпуса

**Files:**
- Modify: `src/machines/app.machine.ts`
- Modify: `src/lib/typing-stream.ts`
- Modify: `src/machines/app.machine.test.ts`

- [ ] **Step 1: Удалить `defaultDrillTexts` из `lib/typing-stream.ts`**

Заменить файл целиком:

```ts
import type { SymbolLayout, TypingStream } from "@/interfaces/types";
import { getKeyCapIdsForChar } from "@/lib/symbol-utils";

/**
 * Builds a TypingStream from a given drill text.
 * For each character, pre-calculates the `targetKeyCaps` via the symbolLayout.
 */
export function createTypingStream({
  drillText,
  symbolLayout,
}: {
  drillText: string;
  symbolLayout: SymbolLayout;
}): TypingStream {
  return drillText
    .split('')
    .map((targetSymbol): TypingStream[number] | null => {
      const targetKeyCaps = getKeyCapIdsForChar({ char: targetSymbol, symbolLayout });
      if (!targetKeyCaps) {
        console.warn(`Character "${targetSymbol}" not found in symbol layout.`);
        return null;
      }
      return { targetSymbol, targetKeyCaps, attempts: [] };
    })
    .filter((item): item is TypingStream[number] => item !== null);
}
```

- [ ] **Step 2: Переписать action `startNewTrainingStream` в `app.machine.ts`**

Открыть `src/machines/app.machine.ts`. Заменить импорты в начале файла:

```ts
import { assign, sendTo, setup } from "xstate";

import type { KeyCapId } from "@/interfaces/key-cap-id";
import type { SymbolLayoutId, TypingStream } from "@/interfaces/types";
import { physicalLayoutANSI } from '@/data/layouts/physical-layout-ansi';
import { getSymbolLayoutDescriptor } from "@/data/layouts/layouts";
import { createTypingStream } from "@/lib/typing-stream";
import { DRILL_CORPUS } from "@/lib/drill-corpus";
import { filterDrillsBySymbolLayout, selectRandomDrill } from "@/lib/drill-selection";

import { keyboardMachine } from "./keyboard.machine";
import { trainingMachine } from "./training.machine";
```

Найти action `startNewTrainingStream` (строки ~43-51) и заменить его на:

```ts
startNewTrainingStream: assign((_, params: { symbolLayoutId: SymbolLayoutId }) => {
  const descriptor = getSymbolLayoutDescriptor(params.symbolLayoutId);
  const compatible = filterDrillsBySymbolLayout({
    allDrills: DRILL_CORPUS,
    symbolLayoutDescriptor: descriptor,
  });
  const drill = selectRandomDrill({ drills: compatible });
  // Защищено ApplicationDataSchema на старте — сюда мы не должны попасть с пустым массивом.
  if (!drill) {
    throw new Error(`No compatible drills for layout=${params.symbolLayoutId}`);
  }
  return {
    lastTrainingStream: createTypingStream({
      drillText: drill.text,
      symbolLayout: descriptor.symbolLayout,
    }),
    currentSymbolLayoutId: params.symbolLayoutId,
  };
}),
```

(Сама структура AppContext и AppEvent остаются — `currentSymbolLayoutId` уже есть, `START_TRAINING` уже несёт только `symbolLayoutId`.)

- [ ] **Step 3: Прогнать существующие тесты машины**

Run: `npx vitest run src/machines/app.machine.test.ts`
Expected: PASS (тесты уже отправляют `START_TRAINING; symbolLayoutId: 'qwerty'` и `'йцукен'`; корпус после Task 6 содержит drill'ы для обеих раскладок).

Если падает «no compatible drills for qwerty» — значит seed-скрипт из Task 6 не был выполнен; вернуться и прогнать его.

- [ ] **Step 4: НЕ коммитить отдельно**

UI ещё не починен — оставляем для общего коммита после Task 14.

---

## Task 13: `UserPreferencesPage.svelte` — три select'а с динамическими опциями

**Files:**
- Modify: `src/components/ui/UserPreferencesPage.svelte`
- Modify: `src/components/app/MainContent.svelte` (если там определяется `Props.dictionary` со старыми ключами)

- [ ] **Step 1: Переписать `UserPreferencesPage.svelte`**

Заменить `<script>` блок целиком:

```svelte
<script lang="ts">
  import { preferences, updatePreferences } from '@/lib/preferences';
  import Select from './Select.svelte';
  import type { UserPreferences } from '@/interfaces/user-preferences';
  import { getCompatibleSymbolLayoutsForTextLanguage } from '@/data/layouts/layouts';

  interface Props {
    onBack: () => void;
    dictionary: {
      user_preferences: {
        title: string;
        interface_language_label: string;
        text_language_label: string;
        symbol_layout_label: string;
        back_button: string;
      };
      options: {
        interfaceLanguages: Record<UserPreferences['interfaceLanguage'], string>;
        textLanguages: Record<UserPreferences['textLanguage'], string>;
        layouts: Record<UserPreferences['symbolLayoutId'], string>;
      };
    };
  }

  const { onBack, dictionary }: Props = $props();

  const interfaceLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.interfaceLanguages.en },
    { value: 'ru' as const, label: dictionary.options.interfaceLanguages.ru },
  ]);

  const textLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.textLanguages.en },
    { value: 'ru' as const, label: dictionary.options.textLanguages.ru },
  ]);

  // Опции раскладок зависят от выбранного textLanguage.
  const layoutOptions = $derived(
    getCompatibleSymbolLayoutsForTextLanguage($preferences.textLanguage)
      .map(d => ({
        value: d.symbolLayoutId,
        label: dictionary.options.layouts[d.symbolLayoutId],
      }))
  );
</script>
```

И тело `<div class="preferences-page">` целиком:

```svelte
<div class="preferences-page">
  <h2>{dictionary.user_preferences.title}</h2>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.interface_language_label}</span>
    <Select
      value={$preferences.interfaceLanguage}
      options={interfaceLanguages}
      onChange={(v) => updatePreferences({ interfaceLanguage: v as UserPreferences['interfaceLanguage'] })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.text_language_label}</span>
    <Select
      value={$preferences.textLanguage}
      options={textLanguages}
      onChange={(v) => updatePreferences({ textLanguage: v as UserPreferences['textLanguage'] })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.symbol_layout_label}</span>
    <Select
      value={$preferences.symbolLayoutId}
      options={layoutOptions}
      onChange={(v) => updatePreferences({ symbolLayoutId: v as UserPreferences['symbolLayoutId'] })}
    />
  </label>

  <button type="button" class="btn" onclick={onBack}>
    {dictionary.user_preferences.back_button}
  </button>
</div>
```

(Блок `<style>` не трогать.)

- [ ] **Step 2: Проверить компиляцию**

Run: `make check`
Expected: ошибки только в местах, читающих `$preferences.language` (i18n.ts, +layout.svelte). UserPreferencesPage.svelte — чисто.

- [ ] **Step 3: НЕ коммитить отдельно**

Готовим один большой коммит после Task 14.

---

## Task 14: Переименование `language → interfaceLanguage` в i18n + словари

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/routes/+layout.svelte`
- Modify: `dictionaries/en.json`, `dictionaries/ru.json`

- [ ] **Step 1: Обновить `src/lib/i18n.ts`**

Найти строку:

```ts
export const dictionary = derived(preferences, ($p) => dictionaries[$p.language]);
```

Заменить на:

```ts
export const dictionary = derived(preferences, ($p) => dictionaries[$p.interfaceLanguage]);
```

- [ ] **Step 2: Обновить `src/routes/+layout.svelte`**

Найти строку (около `$preferences.language`) и заменить `$preferences.language` на `$preferences.interfaceLanguage`. Использовать grep если непонятно где:

```bash
grep -n "preferences.*\.language" /Users/belan/PROJECTS/flow-typing/src/routes/+layout.svelte
```

- [ ] **Step 3: Обновить `dictionaries/en.json`**

Открыть файл и:

1. В блоке `user_preferences` заменить `language_label` и `symbol_layout_label` на расширенный набор, добавив описания:

```json
"user_preferences": {
  "title": "User Preferences",
  "interface_language_label": "Interface Language",
  "interface_language_description": "Language of the UI (menus, hints).",
  "text_language_label": "Text Language",
  "text_language_description": "Language of typing exercises.",
  "symbol_layout_label": "Keyboard Layout",
  "symbol_layout_description": "Physical keyboard mapping.",
  "language_placeholder": "Select language",
  "symbol_layout_placeholder": "Select layout",
  "back_button": "Back"
},
```

2. В блоке `options` заменить `languages` на `interfaceLanguages` и добавить `textLanguages` (с теми же значениями для совместимости):

```json
"options": {
  "interfaceLanguages": {
    "en": "English",
    "ru": "Русский"
  },
  "textLanguages": {
    "en": "English",
    "ru": "Russian"
  },
  "layouts": {
    "qwerty": "QWERTY (English)",
    "йцукен": "ЙЦУКЕН (Русская)"
  }
}
```

- [ ] **Step 4: Обновить `dictionaries/ru.json` аналогично**

```json
"user_preferences": {
  "title": "Пользовательские Предпочтения",
  "interface_language_label": "Язык интерфейса",
  "interface_language_description": "Язык меню и подсказок UI.",
  "text_language_label": "Язык упражнений",
  "text_language_description": "Язык текстов для тренировки.",
  "symbol_layout_label": "Раскладка клавиатуры",
  "symbol_layout_description": "Физическое отображение клавиш.",
  "language_placeholder": "Выберите язык",
  "symbol_layout_placeholder": "Выберите раскладку",
  "back_button": "Назад"
},
```

```json
"options": {
  "interfaceLanguages": {
    "en": "Английский",
    "ru": "Русский"
  },
  "textLanguages": {
    "en": "Английский",
    "ru": "Русский"
  },
  "layouts": {
    "qwerty": "QWERTY (Английская)",
    "йцукен": "ЙЦУКЕН (Русская)"
  }
}
```

- [ ] **Step 5: Проверить, что в проекте не осталось ссылок на `$preferences.language`**

Run:
```bash
grep -rn "preferences[^.]*\.language\b\|\$p\.language\b" /Users/belan/PROJECTS/flow-typing/src --include="*.ts" --include="*.svelte"
```

Expected: пусто.

- [ ] **Step 6: Финальная проверка**

Run: `make check-all`
Expected: PASS.

Если падает unit-test, прогнать конкретно:

```bash
make test
```

- [ ] **Step 7: Объединённый коммит (Tasks 10–14)**

Это большой коммит, охватывающий разрыв обратной совместимости и связанные правки:

```bash
git add src/interfaces/user-preferences.ts \
        src/user-preferences/user-preferences.ts \
        src/lib/preferences.ts src/lib/preferences.test.ts \
        src/lib/typing-stream.ts \
        src/machines/app.machine.ts \
        src/components/ui/UserPreferencesPage.svelte \
        src/lib/i18n.ts src/routes/+layout.svelte \
        dictionaries/en.json dictionaries/ru.json
git commit -m "feat(preferences): split language into interfaceLanguage + textLanguage; wire drill selection

UserPreferences.language is replaced by interfaceLanguage (UI) and textLanguage (drills, primary axis of choice). normalizePreferences enforces the cascade interfaceLanguage → textLanguage → symbolLayoutId, dropping legacy 'language' silently. UserPreferencesPage shows three selects, layout options derived from current textLanguage. appMachine selects drill from DRILL_CORPUS via filterDrillsBySymbolLayout. i18n dictionaries restructured (interfaceLanguages + textLanguages + descriptions)."
```

---

## Task 15: `create-drills.ts` — append-логика JSONL

**Files:**
- Modify: `src/scripts/create-drills.ts`

Этот скрипт — CLI-инструмент для пополнения корпуса. Изолирован от рантайма.

- [ ] **Step 1: Переписать скрипт**

Заменить `src/scripts/create-drills.ts` целиком:

```ts
#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DrillSchema } from '../interfaces/drill-data.types';
import {
  createDrillId,
  getCharCount,
  getWordCount,
  getAverageWordLength,
  getMaxWordLength,
  getUniqueChars,
  getUniqueSymbols,
  getCharFrequency,
  getSymbolFrequency,
  getBigrams,
  getTrigrams,
} from '../lib/drill-utils';

const CYRILLIC = /[а-яё]/i;
const LATIN = /[a-z]/i;

function detectTextLanguage(text: string): 'en' | 'ru' | null {
  const hasCyr = CYRILLIC.test(text);
  const hasLat = LATIN.test(text);
  if (hasCyr && !hasLat) return 'ru';
  if (hasLat && !hasCyr) return 'en';
  return null;
}

const cwd = process.cwd();
const inputPath = path.join(cwd, 'tmp/input-sentences.txt');
const outputPath = path.join(cwd, 'src/data/drills/drills.jsonl');

async function main() {
  const raw = await fs.promises.readFile(inputPath, 'utf-8');
  const sentences = raw.split('\n').map(s => s.trim()).filter(s => s.length > 0);

  // Существующие ID — читаем построчно
  const existingIds = new Set<string>();
  if (fs.existsSync(outputPath)) {
    const existing = await fs.promises.readFile(outputPath, 'utf-8');
    for (const line of existing.split('\n')) {
      if (line.trim()) existingIds.add(JSON.parse(line).id);
    }
  }

  const newLines: string[] = [];
  for (const sentence of sentences) {
    const id = createDrillId(sentence);
    if (existingIds.has(id)) continue;

    const textLanguage = detectTextLanguage(sentence);
    if (!textLanguage) {
      console.warn(`Skipped (mixed or neutral): "${sentence}"`);
      continue;
    }

    const drill = {
      id,
      text: sentence,
      textLanguage,
      char_count: getCharCount(sentence),
      word_count: getWordCount(sentence),
      avg_word_length: getAverageWordLength(sentence),
      max_word_length: getMaxWordLength(sentence),
      unique_chars: getUniqueChars(sentence),
      unique_symbols: getUniqueSymbols(sentence),
      char_freq: getCharFrequency(sentence),
      symbol_freq: getSymbolFrequency(sentence),
      bigrams: getBigrams(sentence),
      trigrams: getTrigrams(sentence),
    };

    try {
      DrillSchema.parse(drill);
      newLines.push(JSON.stringify(drill));
    } catch (e) {
      console.error(`Validation failed for "${sentence}":`, e);
    }
  }

  if (newLines.length === 0) {
    console.log('No new drills to append.');
    return;
  }

  await fs.promises.appendFile(outputPath, newLines.join('\n') + '\n');
  console.log(`Appended ${newLines.length} new drills to ${outputPath}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

(Старая логика читала `tmp/ru/input-sentences.txt`. После рефакторинга путь `tmp/input-sentences.txt` — единый, язык определяется автоматически. Если на проекте есть Makefile-цель `create-drills`, она продолжает работать, потому что входной путь учтён.)

- [ ] **Step 2: Прогнать tsc (не нужно прогонять сам скрипт, ему нужен tmp-файл)**

Run: `make check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/create-drills.ts
git commit -m "chore(scripts): rewrite create-drills for JSONL append + auto-detect textLanguage"
```

---

## Task 16: Финальная проверка и очистка одноразовых скриптов

**Files:**
- Optionally delete: `scripts/migrate-drills-to-jsonl.ts`, `scripts/seed-english-drills.ts`

Миграционные скрипты больше не нужны (drills.jsonl уже в репозиторий в правильном формате). Можно либо удалить, либо оставить как историческое свидетельство.

- [ ] **Step 1: Финальный прогон всего**

```bash
make check-all
```

Expected: PASS (lint, check, test, build).

- [ ] **Step 2: Ручная проверка приложения**

Запустить `make dev` и проверить в браузере:

1. Открыть `http://localhost:5173` в чистом профиле (или вычистить `localStorage`).
2. Убедиться, что приложение запускается без ошибок в консоли — особенно от `ApplicationDataSchema.parse(...)`.
3. Нажать «Старт» — тренировка стартует с английским текстом (потому что дефолт `qwerty` + `textLanguage='en'`).
4. Зайти в настройки, переключить `Text Language` на `Русский` — заметить, что `Symbol Layout` автоматически переключился на `ЙЦУКЕН`.
5. Снова «Старт» — тренировка с русским текстом.

- [ ] **Step 3: Удалить одноразовые миграционные скрипты (опционально)**

```bash
git rm scripts/migrate-drills-to-jsonl.ts scripts/seed-english-drills.ts
git commit -m "chore: remove one-shot migration scripts"
```

Либо оставить — на ваше усмотрение.

---

## Self-Review

### 1. Spec coverage

Прохожу по секциям спеки:

- §2.1 «Drill не попадает при несовместимом символе» → Task 8 (`filterDrillsBySymbolLayout`, правило 2 — символьная страховка).
- §2.2 «Совместимость через язык текста» → Task 1, 3, 4.
- §2.3 «Иерархия BCP 47» → Task 1 (типы), Task 2 (правило префикса).
- §2.4 «Асимметричное правило в сторону раскладки» → Task 2.
- §2.5 «Язык → раскладка как UX-каскад» → Task 13 (UserPreferencesPage), Task 11 (нормализация делает сброс).
- §2.6 «Плоская таблица descriptor'ов с `isDefaultFor`» → Task 4, 5.
- §2.7 «Разнос language → interfaceLanguage + textLanguage, без legacy» → Task 10, 11 (тест явно проверяет, что legacy `language` игнорируется).
- §2.8 «JSONL для корпуса» → Task 6, 7.
- §2.9 «Zod как единый движок инвариантов» → Tasks 3 (`DrillSchema.refine`), 4 (`SymbolLayoutDescriptorSchema.refine`, `SymbolLayoutRegistrySchema.superRefine`), 9 (`ApplicationDataSchema.superRefine`).
- §3 (доменная модель) → реализована через типы из §4 спеки.
- §4.1–4.6 → Tasks 1, 3, 4, 5.
- §4.7 (утилита совместимости) → Task 2.
- §5.1 (загрузка корпуса) → Task 7.
- §5.2 (фильтр/выбор) → Task 8.
- §5.3 (integrity) → Task 9.
- §5.4 (app.machine) → Task 12.
- §5.5 (UI отправка) → проверено: `FooterActions.svelte` отправляет уже только `symbolLayoutId`, изменений не требуется.
- §5.6 (удалить `defaultDrillTexts`) → Task 12 step 1.
- §6.1 (миграция корпуса) → Task 6.
- §6.2 (`normalizePreferences`) → Task 11.
- §6.3 (таблица поведения нормализации) → проверяется в `preferences.test.ts` (Task 11).
- §6.4 (нормализация при каждом update) → Task 11 step 3 (обёртки `update`/`set` прогоняют через `normalizePreferences`).
- §7.1 (три select'а) → Task 13.
- §7.2 (динамические `options`) → решено иначе: вместо расширения `SettingMetadata.options` функцией, `UserPreferencesPage` напрямую использует `getCompatibleSymbolLayoutsForTextLanguage`, потому что текущий UI не рендерится автоматически из реестра. Это упрощение, реализованное в Task 13. Реестр метаданных всё равно обновлён (Task 10) для дисциплины — если в будущем появится auto-render, он будет правильным.
- §7.3 (первая загрузка) → бесплатно из `normalizePreferences` (Task 11).
- §7.4 (i18n) → Task 14.
- §8 (инварианты) → все 8 закрыты соответствующими Tasks (см. spec § 8.1).
- §9 (сводка файлов) → согласовано с разделом «File Structure» этого плана.
- §10 (долгосрочное видение) — это контекст, не задача.

**Гэп:** §7.2 в спецификации предполагает расширение типа `SettingMetadata.options` функцией. В плане я этого **не делаю** — `UserPreferencesPage.svelte` напрямую дёргает `getCompatibleSymbolLayoutsForTextLanguage`. Причина: текущий UI настроек не использует реестр метаданных для рендера. Решение зафиксировано в Task 13 и в этом self-review.

### 2. Placeholder scan

Прошёл по плану — никаких «TBD», «TODO», «adjust as needed». Все шаги содержат полный код.

Единственное «опционально» — Task 16 step 3 (удаление миграционных скриптов): это про политику репозитория, не блокирует функцию.

### 3. Type consistency

- `TextLanguage` / `InterfaceLanguage` — введены в Task 1, используются в Tasks 2, 3, 4, 5, 10, 11.
- `SymbolLayoutDescriptor` / `SymbolLayoutRegistrySchema` — введены в Task 4, используются в Tasks 5, 8, 9.
- `Drill` — расширен в Task 3, используется в Tasks 7, 8.
- Функции — имена согласованы:
  - `isDrillCompatibleWithSymbolLayout` (Task 2) ← вызывается в Task 8.
  - `filterDrillsBySymbolLayout` / `selectRandomDrill` (Task 8) ← вызываются в Tasks 9, 12.
  - `getSymbolLayoutDescriptor` / `getDefaultSymbolLayoutForTextLanguage` / `getCompatibleSymbolLayoutsForTextLanguage` / `getSymbolsSupportedBySymbolLayout` (Task 5) ← используются в Tasks 8, 11, 12, 13.
  - `normalizePreferences` (Task 11) ← применяется в самом store, тестируется напрямую.
  - `parseCorpus` — внутренний в `drill-corpus.ts` (Task 7), не экспортируется; в тесте `drills.test.ts` Task 6 имеет свою копию (так корректнее — тест не должен зависеть от внутренних деталей `drill-corpus`).

Несогласований не обнаружено.

---

Plan complete and saved to `docs/superpowers/plans/2026-06-06-text-language-and-drill-compatibility.md`. Two execution options:

**1. Subagent-Driven (recommended)** — отправка свежего подагента на каждую задачу, ревью между задачами, быстрая итерация.

**2. Inline Execution** — выполнить задачи в этой сессии через `executing-plans`, пакетами с чекпоинтами для ревью.

Какой подход берём?
