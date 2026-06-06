# Совместимость drill ↔ раскладка через язык текста

**Дата:** 2026-06-06
**Статус:** Согласован (дизайн), готов к плану реализации

## 1. Контекст и проблематика

### 1.1. Текущее состояние

В проекте есть символьная раскладка (`SymbolLayout`), которую пользователь выбирает в настройках (`UserPreferences.symbolLayoutId`). Сегодня доступны `qwerty` и `йцукен`.

Параллельно есть корпус упражнений: `src/data/drills/drills.json` (~500 KB, ~сотни записей со статистиками: `unique_symbols`, `bigrams`, `trigrams`, …). На рантайме этот корпус **не подключён**: в `app.machine.ts` action `startNewTrainingStream` (`src/machines/app.machine.ts:43-51`) берёт случайный текст из захардкоженного массива `defaultDrillTexts` (`src/lib/typing-stream.ts:4-9`, содержит одну русскую строку).

### 1.2. Главная проблема

Раскладка и текст drill никак не связаны. Если пользователь выбрал `qwerty`, а ему достался drill `"Привет, как дела?"`:

1. `createTypingStream` для каждого символа вызывает `getKeyCapIdsForChar` (`src/lib/symbol-utils.ts:114-123`).
2. Для русских букв при `qwerty` функция возвращает `undefined`.
3. Символ молча отбрасывается с `console.warn` (`src/lib/typing-stream.ts:27-29`).
4. Получается либо пустая тренировка, либо обрубок.

### 1.3. Цель этого инкремента

Гарантировать, что в тренировку попадают **только** те drills, символы которых можно физически набрать на выбранной раскладке. Drill хотя бы с одним нерасполагаемым символом не должен показываться вообще (не «частично», не «со скипами»).

### 1.4. Вне скоупа

- Категоризация drills по темам (литература / код / новости и т.п.).
- Двуязычные раскладки и тексты, требующие переключения языка посередине.
- Адаптивная сложность (`docs/05-adaptive-learning-system.md`) — этот инкремент готовит для неё фундамент, но саму систему не строит.
- Стриминг корпуса из БД (этап 2 из `docs/05`) — формат JSONL подготавливается для этого, но миграция на бэкенд не делается.

## 2. Принятые решения по ключевым развилкам

### 2.1. Поведение при несовместимом символе в drill

**Решение:** drill не попадает в тренировку. Отсев на уровне выбора, а не на уровне отображения.

**Отвергнуто:** «скипать несовместимые символы посередине» — это создаёт «дыры» в тексте (пользователь не видит закономерности, особенно при смешанных или экзотических раскладках, например украинский текст в кириллической раскладке без специфичных букв).

### 2.2. Как описывать совместимость drill ↔ раскладка в данных

**Решение:** через **язык текста**. У drill есть язык (`drill.textLanguage`), у раскладки — родной язык (`symbolLayout.textLanguage`). Совместимость — функция двух языков с правилом иерархии BCP 47.

**Отвергнуто:**
- Чистый `unique_symbols ⊆ supported_symbols` без языка — работает, но не даёт UI первичной оси выбора («какой язык я учу») и не различает диалекты (`en-GB` vs `en-US`) с одинаковым латинским алфавитом.
- Drill хранит список совместимых `symbolLayoutId` — каждая новая раскладка требует ручной миграции всего корпуса, не масштабируется.

### 2.3. Иерархия языков

**Решение:** язык — BCP 47 строка (`'en'`, `'en-GB'`, `'en-US'`, `'ru'`). Дерево неявное, выводится из строки через разделитель `-`. Drill принадлежит ровно одному узлу.

**Отвергнуто:**
- Drill хранит массив языков (`['en-GB', 'en-US']` для общих текстов) — добавление нового диалекта (`en-CA`) требует прохода по всему корпусу.
- Плоский набор языков без иерархии (`en`, `en-GB`, `en-US` равноправны) — общие тексты приходится дублировать.

### 2.4. Правило совместимости drill с раскладкой

**Решение:** ассиметричное в сторону раскладки. Drill подходит раскладке, если `drill.textLanguage` равен языку раскладки или является его **предком** в иерархии. Раскладка — ключевое физическое ограничение.

```
drill.textLanguage === layout.textLanguage
  ИЛИ layout.textLanguage.startsWith(drill.textLanguage + '-')
```

**Семантика:** «раскладка набирает тексты на своём собственном языке и на любых более общих». Пример:

| Раскладка (textLanguage) | Подходят drills с textLanguage |
|---|---|
| `en` | `en` |
| `en-US` | `en`, `en-US` |
| `en-GB` | `en`, `en-GB` |
| `ru` | `ru` |

**Отвергнуто:** симметричное правило (drill подходит, если он в той же ветке user.textLanguage в любую сторону) — оно бы выдавало пользователю с американским qwerty британские тексты с символом фунта, который физически не набирается.

### 2.5. UX-связка раскладки и языка

**Решение:** язык — первичная ось, раскладка — производная. Пользователь сначала выбирает «что учу», после этого видит список раскладок, поддерживающих этот язык. Дефолт раскладки вычисляется по языку.

**Отвергнуто:**
- Раскладка тянет язык за собой автоматически, отдельной настройки нет — лишает пользователя возможности выбрать диалект.
- Полностью раздельный выбор без связи — позволяет создать несовместимую пару (qwerty + ru), плохой UX.

### 2.6. Как хранить «дефолт раскладки для языка»

**Решение:** одна плоская таблица descriptor'ов раскладок. Каждая раскладка несёт поле `isDefaultForTextLanguages: TextLanguage[]` — массив языков, для которых она дефолт (включая свой собственный и опционально предков в иерархии). Никакого отдельного реестра языков.

**Отвергнуто:**
- Отдельный реестр языков с `defaultLayoutId` — лишняя сущность с межтабличными ссылками.
- Флаг `isDefaultForLanguage: boolean` в раскладке — не работает с иерархией (на корневом языке `en` нет своей раскладки, флаг повесить негде).
- Плоская мапа `language → layoutId` — превращается в «недо-реестр» при добавлении любого второго свойства языка.

Эта модель прямо переносится в БД: одна строка JSONL = одна строка таблицы.

### 2.7. Разнесение `language` на интерфейсный и текстовый

**Решение:** существующее поле `UserPreferences.language` переименовывается в `interfaceLanguage`. Добавляется отдельное `textLanguage`. Это симметрично трём типам раскладок в проекте (`PhysicalLayout` / `SymbolLayout` / `FingerLayout`).

Дефолт каскадный: `interfaceLanguage → textLanguage → symbolLayoutId`. Если поле отсутствует или невалидно — берётся из следующего по каскаду.

**Поведение для существующих пользователей:** legacy-чтение старого ключа `language` **не делается**. Пользователь получает каскад дефолтов как новый. (Решение пользователя: пишем как с нуля.)

### 2.8. Формат хранения корпуса

**Решение:** переход с `drills.json` на `drills.jsonl` (по одной записи на строку).

**Выгоды:**
- Прямой перенос в БД (этап 2 из `docs/05`).
- Читаемые git-diff'ы (изменение одной записи = одна строка в diff).
- Append-only при пополнении корпуса.

Zod в коде остаётся без изменений — он валидирует уже-распарсенные объекты независимо от формата файла.

### 2.9. Zod как единый движок инвариантов

**Решение:** все валидируемые инварианты (включая cross-record в одной коллекции и cross-collection между корпусом и реестром) описываются через Zod `.refine()` / `.superRefine()`. Эти же схемы используются и в проде (на старте), и в тестах.

## 3. Доменная модель

```
┌─────────────────────────────────────────────────────────────┐
│ TextLanguage = BCP 47 строка ('en', 'en-GB', 'en-US', 'ru') │
│ — не сущность, просто литеральная строка                    │
│ — иерархия через '-'                                         │
│ — i18n-имена в dictionaries/{en,ru}.json                    │
└─────────────────────────────────────────────────────────────┘
         ▲                                  ▲
         │ принадлежит                      │ написан на
         │                                  │
┌────────┴────────────┐              ┌──────┴──────────────┐
│ SymbolLayoutDescr   │              │ Drill               │
│                     │              │                     │
│ symbolLayoutId      │              │ id, text            │
│ textLanguage        │              │ textLanguage        │
│ isDefaultForText…   │              │ unique_chars        │
│ symbolLayout        │              │ unique_symbols      │
│                     │              │ ... (статистика)    │
└─────────────────────┘              └─────────────────────┘
         ▲                                  ▲
         │ выбирает                         │ фильтруется
         │                                  │
┌────────┴──────────────────────────────────┴──────────────┐
│ UserPreferences                                          │
│                                                          │
│ interfaceLanguage: 'en' | 'ru'   (бывшее `language`)     │
│ textLanguage:      TextLanguage  (новое)                 │
│ symbolLayoutId:    SymbolLayoutId                        │
│ shared:            ...                                   │
└──────────────────────────────────────────────────────────┘
```

### Каскад дефолтов

```
interfaceLanguage (всегда задан, хардкоженый дефолт)
       │
       └──► textLanguage (если не задан/невалиден, равен interfaceLanguage)
                  │
                  └──► symbolLayoutId (если не задан/несовместим,
                                       дефолт для textLanguage из реестра)
```

### Главное правило фильтрации drill

Drill попадает в тренировку, если выполнены **оба** условия:

1. **Языковое:** `drill.textLanguage` равен `symbolLayout.textLanguage` или является его предком в иерархии BCP 47.
2. **Символьное (страховка):** `drill.unique_symbols ⊆ symbols(symbolLayout)` — все символы текста физически набираются.

Второе условие почти всегда выполняется автоматически благодаря первому. Оно ловит только рассогласование (битый импорт drill с неправильным тегом).

## 4. Изменения в типах и данных

### 4.1. Новые типы

```ts
// src/interfaces/types.ts

export const TEXT_LANGUAGES = ['en', 'ru'] as const;
export type TextLanguage = typeof TEXT_LANGUAGES[number];

export const INTERFACE_LANGUAGES = ['en', 'ru'] as const;
export type InterfaceLanguage = typeof INTERFACE_LANGUAGES[number];
```

### 4.2. `SymbolLayout` — без изменений

JSDoc определяет его как «слой краски» — таблицу соответствий символ↔клавиши. Это техническая структура, метаданные раскладки сюда не приклеиваются.

```ts
// src/interfaces/types.ts (БЕЗ ИЗМЕНЕНИЙ)
export type SymbolLayout = {
  symbol: string;
  keyCaps: KeyCapId[];
}[];
```

### 4.3. `SymbolLayoutDescriptor` — новый Zod-валидируемый тип

```ts
// src/interfaces/types.ts

export const SymbolLayoutDescriptorSchema = z.object({
  symbolLayoutId: z.enum(SYMBOL_LAYOUT_IDS),
  textLanguage: z.enum(TEXT_LANGUAGES),
  isDefaultForTextLanguages: z.array(z.enum(TEXT_LANGUAGES)),
  symbolLayout: z.custom<SymbolLayout>(),
})
.refine(
  (d) => d.isDefaultForTextLanguages.includes(d.textLanguage),
  { message: "descriptor must be default for its own textLanguage" }
)
.refine(
  (d) => d.isDefaultForTextLanguages.every(
    lang => lang === d.textLanguage || d.textLanguage.startsWith(lang + '-')
  ),
  { message: "isDefaultForTextLanguages must contain only textLanguage or its ancestors" }
);

export type SymbolLayoutDescriptor = z.infer<typeof SymbolLayoutDescriptorSchema>;

export const SymbolLayoutRegistrySchema = z.array(SymbolLayoutDescriptorSchema)
  .superRefine((registry, ctx) => {
    // Инвариант: ≤1 дефолтной раскладки на язык
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
    // Инвариант: каждый язык из TEXT_LANGUAGES покрыт хотя бы одной раскладкой
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

### 4.4. `Drill` — расширение схемы

```ts
// src/interfaces/drill-data.types.ts

const CYRILLIC = /[а-яё]/i;
const LATIN = /[a-z]/i;

export const DrillSchema = z.object({
  id: z.string().min(1, ...),
  text: z.string().min(1, ...),
  textLanguage: z.enum(TEXT_LANGUAGES).describe("Язык текста (BCP 47)."),  // ← новое
  // ... остальные поля без изменений (char_count, unique_symbols, bigrams, ...)
})
.refine(
  (d) => d.textLanguage !== 'ru' || !d.unique_chars.some(c => LATIN.test(c)),
  { message: "drill with textLanguage='ru' must not contain Latin letters" }
)
.refine(
  (d) => d.textLanguage !== 'en' || !d.unique_chars.some(c => CYRILLIC.test(c)),
  { message: "drill with textLanguage='en' must not contain Cyrillic letters" }
);

export type Drill = z.infer<typeof DrillSchema>;
```

### 4.5. `UserPreferences`

```ts
// src/interfaces/user-preferences.ts

export interface UserPreferences {
  interfaceLanguage: InterfaceLanguage;   // переименовано из `language`
  textLanguage: TextLanguage;              // новое
  symbolLayoutId: SymbolLayoutId;          // как было
  shared: { ... };
}
```

### 4.6. Реестр раскладок

Файлы `data/layouts/symbol-layout-qwerty.ts` и `data/layouts/symbol-layout-jcuken.ts` **не трогаются**.

```ts
// src/data/layouts/layouts.ts

const SYMBOL_LAYOUT_REGISTRY = SymbolLayoutRegistrySchema.parse([
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

export const getSymbolLayoutDescriptor = (id: SymbolLayoutId): SymbolLayoutDescriptor =>
  SYMBOL_LAYOUT_REGISTRY.find(d => d.symbolLayoutId === id)!;

export const getDefaultSymbolLayoutForTextLanguage = (
  textLang: TextLanguage
): SymbolLayoutDescriptor => {
  const exact = SYMBOL_LAYOUT_REGISTRY.find(d => d.isDefaultForTextLanguages.includes(textLang));
  if (exact) return exact;
  // Фолбэк по родителю BCP 47 (для неизвестных диалектов вроде 'en-CA')
  const parent = textLang.split('-').slice(0, -1).join('-') as TextLanguage;
  if (parent) return getDefaultSymbolLayoutForTextLanguage(parent);
  throw new Error(`No default symbol layout for textLanguage: ${textLang}`);
};

export const getCompatibleSymbolLayoutsForTextLanguage = (
  textLang: TextLanguage
): SymbolLayoutDescriptor[] =>
  SYMBOL_LAYOUT_REGISTRY.filter(d =>
    d.textLanguage === textLang || d.textLanguage.startsWith(textLang + '-')
  );

export const getSymbolsSupportedBySymbolLayout = (symbolLayout: SymbolLayout): Set<string> =>
  new Set(symbolLayout.map(e => e.symbol));
```

### 4.7. Утилита совместимости

```ts
// src/lib/text-language-utils.ts (новый файл)

export function isDrillCompatibleWithSymbolLayout({
  drillTextLanguage,
  symbolLayoutTextLanguage,
}: {
  drillTextLanguage: TextLanguage;
  symbolLayoutTextLanguage: TextLanguage;
}): boolean {
  if (drillTextLanguage === symbolLayoutTextLanguage) return true;
  // drill общее, раскладка специфичнее (drill='en', layout='en-US')
  if (symbolLayoutTextLanguage.startsWith(drillTextLanguage + '-')) return true;
  return false;
}
```

## 5. Изменения в коде рантайма

### 5.1. Загрузка корпуса через JSONL

```ts
// src/lib/drill-corpus.ts (новый файл)

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

export const DRILL_CORPUS: Drill[] = parseCorpus(rawCorpus);
```

### 5.2. Фильтр и выбор drill

```ts
// src/lib/drill-selection.ts (новый файл)

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

export function selectRandomDrill({ drills }: { drills: Drill[] }): Drill | null {
  if (drills.length === 0) return null;
  return drills[Math.floor(Math.random() * drills.length)]!;
}
```

### 5.3. Интеграционная схема (cross-collection инвариант)

```ts
// src/lib/integrity.ts (новый файл)

import { SymbolLayoutRegistrySchema } from '@/interfaces/types';
import { DrillSchema } from '@/interfaces/drill-data.types';
import { SYMBOL_LAYOUT_REGISTRY } from '@/data/layouts/layouts';
import { DRILL_CORPUS } from '@/lib/drill-corpus';
import { filterDrillsBySymbolLayout } from '@/lib/drill-selection';

const ApplicationDataSchema = z.object({
  registry: SymbolLayoutRegistrySchema,
  corpus: z.array(DrillSchema),
}).superRefine(({ registry, corpus }, ctx) => {
  for (const d of registry) {
    const compatible = filterDrillsBySymbolLayout({ allDrills: corpus, symbolLayoutDescriptor: d });
    if (compatible.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `No drills in corpus for layout '${d.symbolLayoutId}'`,
      });
    }
  }
});

// Side-effect import — падает на старте при нарушении.
ApplicationDataSchema.parse({
  registry: SYMBOL_LAYOUT_REGISTRY,
  corpus: DRILL_CORPUS,
});
```

`lib/integrity.ts` импортируется в точке инициализации приложения (`appActor.ts` или эквивалент) ради side-effect — чтобы сбой данных проявлялся на старте.

### 5.4. `app.machine.ts`

```ts
// Контекст
export interface AppContext {
  lastTrainingStream: TypingStream | null;
  currentSymbolLayoutId: SymbolLayoutId;
}
// ↑ `currentTextLanguage` НЕ нужен — язык вытаскивается из descriptor'а раскладки

// Эвент
{ type: 'START_TRAINING'; symbolLayoutId: SymbolLayoutId }
// ↑ без `textLanguage` — фильтр работает по языку раскладки, не пользователя

// Action
startNewTrainingStream: assign((_, params: { symbolLayoutId: SymbolLayoutId }) => {
  const descriptor = getSymbolLayoutDescriptor(params.symbolLayoutId);

  const compatible = filterDrillsBySymbolLayout({
    allDrills: DRILL_CORPUS,
    symbolLayoutDescriptor: descriptor,
  });

  const drill = selectRandomDrill({ drills: compatible });

  // Корпус гарантированно содержит совместимые drills для каждой раскладки
  // — это проверяется ApplicationDataSchema на старте.
  if (!drill) {
    throw new Error(`No drills for layout=${params.symbolLayoutId}`);
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

### 5.5. UI

В `src/components/app/App.svelte` (или эквивалентной точке) кнопка «Старт» отправляет:

```ts
appActor.send({
  type: 'START_TRAINING',
  symbolLayoutId: $preferences.symbolLayoutId,
});
```

### 5.6. Что удаляется

- `defaultDrillTexts` в `src/lib/typing-stream.ts:4-9` — больше не нужен.

## 6. Миграция данных и preferences

### 6.1. Корпус drills: переход на JSONL и проставление `textLanguage`

Одноразовый скрипт `scripts/migrate-drills-add-text-language.ts`:

1. Читает существующий `drills.json`.
2. Для каждого drill определяет язык по `unique_chars`:
   - есть кириллица, нет латиницы → `'ru'`
   - есть латиница, нет кириллицы → `'en'`
   - оба → mixed → drill выбрасывается из корпуса (двуязычных текстов быть не должно по продуктовому решению)
   - ни тех, ни других → neutral → drill выбрасывается с логом для ручного разбора
3. Записывает результат в `drills.jsonl` (одна запись на строку, компактный `JSON.stringify`).

После прогона:
- `drills.json` удаляется из репо.
- `drills.jsonl` коммитится.
- Лог скрипта (сколько мигрировано, сколько выброшено и какие) включается в PR.

Скрипт `scripts/create-drills.ts` адаптируется:
- Читает существующий JSONL построчно для сбора `existingIds`.
- Дописывает только новые drills в конец файла (append, не rewrite).
- Каждая новая запись содержит `textLanguage` (определяемый автодетектором или передаваемый параметром).

### 6.2. Нормализация preferences

В `src/lib/preferences.ts` заменяется `deepMerge`-логика на функцию `normalizePreferences(raw)`, реализующую каскад дефолтов:

```ts
function normalizePreferences(raw: unknown): UserPreferences {
  const stored = (raw ?? {}) as Record<string, unknown>;

  const interfaceLanguage = isInterfaceLanguage(stored.interfaceLanguage)
    ? stored.interfaceLanguage
    : DEFAULT_USER_PREFERENCES.interfaceLanguage;

  const textLanguage: TextLanguage = isTextLanguage(stored.textLanguage)
    ? stored.textLanguage
    : (interfaceLanguage as TextLanguage);

  const candidate = isSymbolLayoutId(stored.symbolLayoutId) ? stored.symbolLayoutId : undefined;
  const symbolLayoutId =
    candidate &&
    isSymbolLayoutCompatibleWithTextLanguage({ symbolLayoutId: candidate, textLanguage })
      ? candidate
      : getDefaultSymbolLayoutForTextLanguage(textLanguage).symbolLayoutId;

  return {
    interfaceLanguage,
    textLanguage,
    symbolLayoutId,
    shared: (stored.shared as object) ?? {},
  };
}
```

Type-guards (`isTextLanguage`, `isInterfaceLanguage`, `isSymbolLayoutId`) валидируют против соответствующих констант-кортежей.

**Никакого legacy-чтения старого поля `language`** — все существующие пользователи получают каскадные дефолты как новый пользователь.

При первой загрузке: если результат нормализации отличается от прочитанного `localStorage`, нормализованное сразу записывается обратно — старый формат пропадает за один тик.

### 6.3. Таблица поведения нормализации

| Что в `localStorage` | Что становится |
|---|---|
| Ничего, битый JSON, мусор | каскад дефолтов: `{ interfaceLanguage: 'en', textLanguage: 'en', symbolLayoutId: 'qwerty' }` |
| Частичный новый формат, например `{ textLanguage: 'ru' }` | дефолт `interfaceLanguage`, заданное `textLanguage`, дефолтная раскладка для `ru` → `йцукен` |
| Полный новый формат с совместимой парой | как есть |
| Полный новый формат с несовместимой парой `{ textLanguage: 'ru', symbolLayoutId: 'qwerty' }` | `symbolLayoutId` сброшен на дефолт для `ru` → `йцукен` |
| Старый формат `{ language: 'en', symbolLayoutId: 'qwerty' }` | `language` **игнорируется**, дальше каскад дефолтов |

### 6.4. Нормализация — это не только миграция

`normalizePreferences` вызывается и при каждом `update`. Если пользователь сменил `textLanguage` в настройках, а текущая раскладка оказалась несовместима — раскладка автоматически сбрасывается на дефолт нового языка. Никакого специального обработчика в UI не нужно.

## 7. UX-изменения

### 7.1. Экран настроек

Три настройки, упорядоченные по причинной зависимости:

```
Interface Language     [ English ▾    ]  ← язык UI (бывший `language`)

Text Language          [ English ▾    ]  ← новое: язык упражнений (первичная ось)
Symbol Layout          [ QWERTY  ▾    ]  ← опции фильтруются под Text Language
```

**Symbol Layout** — единственная настройка с динамическими опциями: список зависит от текущего `textLanguage`. Сегодня:

- `textLanguage = 'en'` → `qwerty`
- `textLanguage = 'ru'` → `йцукен`

Когда добавятся новые раскладки, они появятся в списке автоматически.

### 7.2. Расширение реестра метаданных настроек

`src/interfaces/types.ts`:

```ts
export interface SettingMetadata<T> {
  // ...
  options?: SettingOption<T>[] | ((prefs: UserPreferences) => SettingOption<T>[]);
}
```

Запись для `symbolLayoutId` в `src/user-preferences/user-preferences.ts`:

```ts
{
  key: 'symbolLayoutId',
  options: (prefs) =>
    getCompatibleSymbolLayoutsForTextLanguage(prefs.textLanguage)
      .map(d => ({ value: d.symbolLayoutId, labelCode: `symbolLayoutId.${d.symbolLayoutId}` })),
  // ...
}
```

Рендерер настройки разрешает функцию-источник, передавая ей актуальные preferences.

### 7.3. Первая загрузка нового пользователя

Без онбординга, без модалок. `localStorage` пуст → `normalizePreferences` возвращает каскад дефолтов. Главный экран открывается сразу, пользователь жмёт «Старт» и попадает в совместимую тренировку.

### 7.4. i18n словари

Новые ключи в `dictionaries/{en,ru}.json`:

```
user_preferences.text_language_label
user_preferences.text_language_description
user_preferences.interface_language_label
user_preferences.interface_language_description
textLanguageId.en
textLanguageId.ru
```

Существующие `language.en`/`language.ru` (если есть) переименовываются в `interfaceLanguageId.en`/`interfaceLanguageId.ru` для симметрии с `textLanguageId.*` и `symbolLayoutId.*`.

## 8. Инварианты, edge cases, тесты

### 8.1. Сводка инвариантов

| # | Инвариант | Реализация |
|---|---|---|
| 1 | Раскладка дефолт для своего собственного `textLanguage` | `SymbolLayoutDescriptorSchema.refine()` |
| 2 | `isDefaultForTextLanguages` ⊆ {textLanguage + предки} | `SymbolLayoutDescriptorSchema.refine()` |
| 3 | Не больше одной дефолтной раскладки на язык | `SymbolLayoutRegistrySchema.superRefine()` |
| 4 | Каждый `TEXT_LANGUAGES` покрыт хотя бы одной раскладкой | `SymbolLayoutRegistrySchema.superRefine()` |
| 5 | `getDefaultSymbolLayoutForTextLanguage(lang)` не падает | unit-тест функции |
| 6 | Валидный `textLanguage` ∈ `TEXT_LANGUAGES` | `DrillSchema` (z.enum) |
| 7 | `textLanguage` согласован с `unique_chars` | `DrillSchema.refine()` |
| 8 | Для каждой раскладки в реестре есть ≥1 совместимый drill | `ApplicationDataSchema.superRefine()` в `lib/integrity.ts` |

Инварианты 1–4, 6–8 проверяются и в проде (при загрузке модуля), и в тестах (через те же схемы), без дублирования.

### 8.2. Edge cases

- **Битый JSON в localStorage** — `safeJsonParse → null → normalizePreferences` возвращает каскад дефолтов.
- **Неизвестный диалект в `textLanguage`** — type-guard вернёт `false`, сработает дефолт.
- **Drill с неизвестным `textLanguage` при загрузке** — `DrillSchema.parse` падает с локализованным сообщением (номер строки JSONL).
- **Пустой результат фильтра в `startNewTrainingStream`** — защищено инвариантом 8, не должно происходить; явный throw как защита от багов.
- **`unique_chars` пустой** — уже запрещён `DrillSchema` (`.min(1)`).

### 8.3. Новые и расширенные тестовые файлы

| Файл | Покрывает |
|---|---|
| `src/lib/text-language-utils.test.ts` (новый) | `isDrillCompatibleWithSymbolLayout` — таблица сочетаний с диалектами и без, оба направления (drill общее/равно/специфичнее раскладки, разные ветки) |
| `src/lib/drill-selection.test.ts` (новый) | `filterDrillsBySymbolLayout` — язык подходит + все символы; язык не подходит; язык подходит, но символ отсутствует; пустой корпус. `selectRandomDrill` — null на пустом, элемент из непустого |
| `src/lib/preferences.test.ts` (новый или расширение) | Таблица 6.3: пустой store, частичный новый формат, полный совместимый, полный несовместимый, старый формат (игнорируется) |
| `src/data/layouts/symbol-layout-registry.test.ts` (новый) | Тонкий — парс реестра через `SymbolLayoutRegistrySchema` (значит, инварианты 1–4 ок), вызов `getDefaultSymbolLayoutForTextLanguage` для каждого `TEXT_LANGUAGES` без throw, фолбэк по родителю для неизвестного диалекта |
| `src/data/drills/drills.test.ts` (расширение) | Тонкий — парс корпуса через `parseCorpus` (инварианты 6, 7 ок) + парс через `ApplicationDataSchema` (инвариант 8) |
| `src/machines/app.machine.test.ts` (расширение, если есть) | `startNewTrainingStream` выбирает совместимый drill; `currentSymbolLayoutId` обновляется; `lastTrainingStream` непустой |

### 8.4. Команда проверки

`make check-all` (lint + check + test + build) — единая точка как в проекте. Vitest автоматически подбирает `**/*.test.ts`.

## 9. Сводка по затронутым файлам

### Новые файлы

- `src/lib/text-language-utils.ts`
- `src/lib/drill-corpus.ts`
- `src/lib/drill-selection.ts`
- `src/lib/integrity.ts`
- `src/lib/text-language-utils.test.ts`
- `src/lib/drill-selection.test.ts`
- `src/lib/preferences.test.ts` (если ещё не было)
- `src/data/layouts/symbol-layout-registry.test.ts`
- `src/data/drills/drills.jsonl` (замена `drills.json`)
- `scripts/migrate-drills-add-text-language.ts` (одноразовый)

### Изменяемые файлы

- `src/interfaces/types.ts` — новые `TEXT_LANGUAGES`/`TextLanguage`, `INTERFACE_LANGUAGES`/`InterfaceLanguage`, `SymbolLayoutDescriptorSchema`, `SymbolLayoutRegistrySchema`; расширение `SettingMetadata.options` функцией
- `src/interfaces/drill-data.types.ts` — поле `textLanguage` в `DrillSchema` + два `.refine()`
- `src/interfaces/user-preferences.ts` — переименование `language → interfaceLanguage`, добавлено `textLanguage`, типы уточнены
- `src/user-preferences/user-preferences.ts` — обновление реестра метаданных; динамические `options` для `symbolLayoutId`
- `src/data/layouts/layouts.ts` — реестр descriptor'ов через `SymbolLayoutRegistrySchema.parse(...)` + утилитные функции
- `src/lib/preferences.ts` — замена `deepMerge` на `normalizePreferences`; type-guards
- `src/lib/typing-stream.ts` — удалить `defaultDrillTexts`
- `src/machines/app.machine.ts` — переписать `startNewTrainingStream`; убрать `currentTextLanguage` (никогда не добавлялся в код, только в промежуточный дизайн)
- `src/components/app/App.svelte` — `START_TRAINING` без `textLanguage` (текущее поведение уже такое, только если есть промежуточные правки)
- `src/scripts/create-drills.ts` — переписать на append-логику JSONL
- `src/data/drills/drills.test.ts` — заменить загрузчик на `parseCorpus`, инвариант 8 через `ApplicationDataSchema`
- `dictionaries/en.json`, `dictionaries/ru.json` — новые ключи (см. 7.4)
- Точка инициализации (например, `src/app/appActor.ts`) — side-effect импорт `lib/integrity.ts`

### Удаляемые файлы

- `src/data/drills/drills.json` (заменён на `.jsonl`)

## 10. Связь с долгосрочным видением

- **Этап 2 из `docs/05` (Hybrid Local-First с бэкендом):** формат JSONL подготавливает корпус для прямого `COPY FROM` в БД; `SymbolLayoutDescriptor` как Zod-валидируемая сущность — для прямого маппинга на таблицу.
- **Адаптивная сложность (Dynamic Flow):** `Drill.textLanguage` плюс уже существующие `bigrams`/`trigrams`/`char_freq` дают всю информацию для интеллектуального подбора. Эта задача не реализует Dynamic Flow, но снимает блок «корпус не подключён к рантайму».
- **Категоризация контента (отдельная задача):** легко наращивается добавлением поля `topic` или `tags` в `DrillSchema` без затрагивания текущей фильтрации.
