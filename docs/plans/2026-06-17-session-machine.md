# sessionMachine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ввести промежуточную машину `sessionMachine` между `appMachine` и `trainingMachine`, превратив одноразовую «один drill = один поток» в таймерную сессию над непрерывным `TypingStream` с дозагрузкой и чекпоинт-сводкой.

**Architecture:** Три слоя по двум осям. `appMachine` — долгоживущая оболочка (навигация, клавиатура, singleton); `sessionMachine` (новая) — одноразовый прогон (таймер, очередь, склейка в поток, чекпоинт `drillSummarize → drillRecord`, конец сессии); `trainingMachine` — чистый классификатор печати и **единственный писатель** потока. Связь: `KEY_PRESS` спускается вниз по одному уровню; `trainingMachine` шлёт вверх `TYPING.ADVANCED` с завершённым символом; `sessionMachine` накапливает проекцию `completed[]` и дописывает хвост через `APPEND_SYMBOLS`. Конец решает таймер сессии, не длина потока.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), XState v5 (`setup`, `invoke`, `fromPromise`, `fromCallback`, `sendTo`), Convex (`drillNext`/`drillRecord`), Vitest (project `src`, node env), TypeScript strict.

---

## Контекст и зафиксированные решения

Это реализация согласованного дизайна (обсуждение в этой ветке):

- **Владение потоком — вариант (б):** `trainingMachine` остаётся отдельным ребёнком-писателем; `sessionMachine` — читатель/дирижёр. Причина — правило одного писателя и чистота/тестируемость классификатора (нельзя мешать сеть+таймер в классификацию).
- **`appMachine` ≠ `sessionMachine`** по **времени жизни**: оболочка долговечна (singleton, переживает навигацию/HMR), сессия одноразова (родится на входе в `training`, умрёт на выходе, унеся таймер/очередь/`previousCheckpoint`).
- **`previousCheckpoint`** (вместо «watermark») — индекс в проекции `completed[]`, докуда уже сведено. Чекпоинт сводит `[previousCheckpoint .. completed.length)` и двигает границу.
- **`completed[]` — event-sourced проекция, не второй писатель.** Канонический поток пишет только `trainingMachine`; `completed` строится из событий `TYPING.ADVANCED` и нужен, чтобы тестировать `sessionMachine` без живого ребёнка и без Convex.
- **Refill разбивается на этапы:** первый fetch под бюджет окна уже даёт текста ~на сессию. Задачи 1–6 дают рабочую таймерную сессию **без** refill; задача 7 добавляет добор + адаптацию mid-session.
- **Контракт в символах (ADR 0006):** `cpm`/таймер — клиентские; fetch получает `budgetChars`.

Связанная документация: `docs/plans/auto-flow.md`, `docs/adr/0005-server-authoritative-profile.md`, `docs/adr/0006-batch-contract-in-characters.md`, `CONTEXT.md`.

> **Важно про промежуточную поломку E2E.** Задача 2 снимает самозавершение `trainingMachine` (`lessonComplete`), а `sessionMachine` подключается только в задаче 4. Между задачами 2 и 4 полный поток тренировки в приложении временно не работает **by design** — проверкой каждой задачи служат её **unit-тесты машин**, они зелёные на каждом шаге. Полный E2E замыкается в задаче 4 (логика) и задаче 5 (UI). Потребители снятого `lessonComplete` / `state.children.trainingService`: три UI-файла (мигрируют в задаче 5) и dev-захват `src/lib/dev/typing-capture.ts` (мигрирует в задаче 4b) — оба учтены, других `grep` не находит.

---

## File Structure

**Создаются:**

- `src/lib/session-config.ts` — провизорные числа сессии (длительность, cpm по умолчанию, openedSteps по умолчанию, период тика, порог refill). Один дом для «Чисел-настроек».
- `src/lib/drill-stream.ts` — чистая склейка `drillTexts → TypingStream` (`glueDrillsIntoStream`) + локальный сбор порции из корпуса (`fetchLocalDrillStream`). Серверный сбор (`fetchServerDrillStream`) добавляется в задаче 6.
- `src/lib/drill-stream.test.ts` — тесты склейки и локального сбора.
- `src/machines/session.machine.ts` — **чистая** машина: реестр `setup({ actors, actions })` с провайдерами `fetchDrills`/`recordCheckpoint` (дефолты-заглушки бросают «not provided»). Не импортирует Convex/корпус.
- `src/machines/session-impl.ts` — реальные реализации `fetchDrills` (локально → сервер) и `recordCheckpoint` (skip → Convex) + экспорт `sessionService = sessionMachine.provide({...})`. Здесь живёт побочный эффект.
- `src/machines/session.machine.test.ts` — тесты сессии на инъекции (stub fetch + spy record).

**Модифицируются:**

- `src/machines/training.machine.ts` — `+ APPEND_SYMBOLS`, `+ TYPING.ADVANCED`, `− lessonComplete/isLessonComplete/sendSessionComplete`.
- `src/machines/training.machine.test.ts` — переписать терминальные сценарии под непрерывную модель.
- `src/machines/app.machine.ts` — `training` invoke'ит `sessionService`; форвард `KEY_PRESS` → session; `PAUSE_TIMER`/`RESUME_TIMER`; `startNewTrainingStream` теряет выбор drill'а; снос импортов корпуса.
- `src/machines/app.machine.test.ts` — под новый invoke/контекст.
- `src/components/app/App.svelte` — деривация `sessionActor` из `state.children.sessionService`.
- `src/components/app/MainContent.svelte` — проброс `sessionActor` в `TrainingScene`.
- `src/components/ui/TrainingScene.svelte` — подписка на `sessionActor` (таймер) + деривация вложенного `trainingActor` (поток/курсор); терпит отсутствие ребёнка во время `loading`.
- `src/lib/dev/typing-capture.ts` — забытый потребитель `state.children.trainingService` + `lessonComplete`; переехать на захват по входу в `sessionComplete` из `lastTrainingStream` (задача 4b).
- `CONTEXT.md` — термины `Session`/`previousCheckpoint`/`checkpoint`/`refill threshold`/`draining`; пометка «drill не существует на слое печати/сводки».
- `convex` — не трогаем (`drillNext`/`drillRecord` готовы).

---

## Provisional constants (`src/lib/session-config.ts`)

Все числа провизорны (план «Числа-настройки»), вынесены в один файл, чтобы не растекались по машинам.

```ts
/**
 * @file Провизорные числа сессии тренировки («Числа-настройки»).
 * Источники cpm/openedSteps временные: позже cpm уедет в настройки,
 * openedSteps — в профиль (сервер). Длительность сессии и период тика — здесь.
 */

/** Длительность одной таймерной сессии, секунды. */
export const SESSION_DURATION_SECONDS = 60;

/** Период тика дисплея таймера, мс (целые секунды достаточно для тренажёра). */
export const TICK_INTERVAL_MS = 1000;

/** Провизорная целевая скорость для расчёта бюджета порции (знаков в минуту). */
export const DEFAULT_SESSION_CPM = 200;

/** Холодный старт: открыт только шаг 0 (см. drillNext / skillProfiles). */
export const DEFAULT_OPENED_STEPS = 1;

/**
 * Нижняя вода очереди: когда непройденный хвост короче — пора дозагружать
 * (используется в задаче 7, refill). Символы.
 */
export const REFILL_THRESHOLD_SYMBOLS = 40;

/**
 * Кап фазы draining: если после истечения таймера юзер перестал печатать,
 * сессия всё равно завершится через этот интервал (мс), а не зависнет
 * в ожидании последнего символа.
 */
export const DRAIN_CAP_MS = 4000;
```

---

## Task 1: Чистая склейка потока + локальный сбор порции

**Files:**
- Create: `src/lib/session-config.ts`
- Create: `src/lib/drill-stream.ts`
- Test: `src/lib/drill-stream.test.ts`

- [ ] **Step 1: Создать `session-config.ts`**

Содержимое — из секции «Provisional constants» выше (целиком).

- [ ] **Step 2: Написать падающий тест склейки**

`src/lib/drill-stream.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { glueDrillsIntoStream, fetchLocalDrillStream } from './drill-stream';
import { getSymbolLayoutDescriptor } from '@/lib/layouts';

const qwerty = getSymbolLayoutDescriptor('qwerty').symbolLayout;

describe('glueDrillsIntoStream', () => {
  test('пустой список → пустой поток', () => {
    expect(glueDrillsIntoStream({ drillTexts: [], symbolLayout: qwerty })).toEqual([]);
  });

  test('один drill → поток без ведущего пробела', () => {
    const stream = glueDrillsIntoStream({ drillTexts: ['ab'], symbolLayout: qwerty });
    expect(stream.map((s) => s.targetSymbol)).toEqual(['a', 'b']);
  });

  test('два drill\'а склеены ровно одним пробелом-символом', () => {
    const stream = glueDrillsIntoStream({ drillTexts: ['ab', 'cd'], symbolLayout: qwerty });
    expect(stream.map((s) => s.targetSymbol)).toEqual(['a', 'b', ' ', 'c', 'd']);
  });
});

describe('fetchLocalDrillStream', () => {
  test('набирает символов не меньше бюджета (пока корпус не исчерпан)', () => {
    const stream = fetchLocalDrillStream({ symbolLayoutId: 'qwerty', budgetChars: 50 });
    expect(stream.length).toBeGreaterThanOrEqual(50);
  });

  test('каждый элемент — валидный StreamSymbol с targetKeyCaps', () => {
    const stream = fetchLocalDrillStream({ symbolLayoutId: 'qwerty', budgetChars: 20 });
    expect(stream.length).toBeGreaterThan(0);
    for (const s of stream) {
      expect(Array.isArray(s.targetKeyCaps)).toBe(true);
      expect(s.attempts).toEqual([]);
    }
  });
});
```

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npx vitest run src/lib/drill-stream.test.ts`
Expected: FAIL — `Failed to resolve import "./drill-stream"`.

- [ ] **Step 4: Реализовать `drill-stream.ts`**

```ts
/**
 * @file Сбор и склейка порции drill'ов в непрерывный TypingStream.
 * Склейка чистая; локальный сбор читает DRILL_CORPUS (детерминированно-чистый
 * по входу, кроме случайного выбора). Серверный сбор — задача 6.
 */
import type { SymbolLayout, SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { createTypingStream } from '@/lib/typing-stream';
import { getSymbolLayoutDescriptor } from '@/lib/layouts';
import { DRILL_CORPUS } from '@/lib/drill-corpus';
import { filterDrillsBySymbolLayout, selectRandomDrill } from '@/lib/drill-selection';

/** Склеивает тексты drill'ов в один поток, разделяя ровно одним пробелом-символом. */
export function glueDrillsIntoStream({
  drillTexts,
  symbolLayout,
}: {
  drillTexts: string[];
  symbolLayout: SymbolLayout;
}): TypingStream {
  const spaceStream = createTypingStream({ drillText: ' ', symbolLayout });
  return drillTexts.flatMap((text, index) => {
    const drillStream = createTypingStream({ drillText: text, symbolLayout });
    return index === 0 ? drillStream : [...spaceStream, ...drillStream];
  });
}

/** Локальный сбор порции: случайные совместимые drill'ы до бюджета символов. */
export function fetchLocalDrillStream({
  symbolLayoutId,
  budgetChars,
}: {
  symbolLayoutId: SymbolLayoutId;
  budgetChars: number;
}): TypingStream {
  const descriptor = getSymbolLayoutDescriptor(symbolLayoutId);
  const compatible = filterDrillsBySymbolLayout({
    allDrills: DRILL_CORPUS,
    symbolLayoutDescriptor: descriptor,
  });
  const texts: string[] = [];
  let total = 0;
  while (total < budgetChars && compatible.length > 0) {
    const drill = selectRandomDrill({ drills: compatible });
    if (!drill) break;
    texts.push(drill.text);
    total += drill.text.length + 1; // +1 за пробел-стык
  }
  return glueDrillsIntoStream({ drillTexts: texts, symbolLayout: descriptor.symbolLayout });
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npx vitest run src/lib/drill-stream.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/session-config.ts src/lib/drill-stream.ts src/lib/drill-stream.test.ts
git commit -m "feat(session): чистая склейка потока + локальный сбор порции"
```

---

## Task 2: trainingMachine → непрерывный классификатор

Делаем движок непрерывным: дописываемый поток (`APPEND_SYMBOLS`), уведомление о прогрессе вверх (`TYPING.ADVANCED`), снятие самозавершения (`lessonComplete`). Завершение теперь — забота сессии.

**Files:**
- Modify: `src/machines/training.machine.ts`
- Test: `src/machines/training.machine.test.ts`

- [ ] **Step 1: Переписать тесты под непрерывную модель**

Заменить файл `src/machines/training.machine.test.ts` целиком:

```ts
import { describe, expect, it } from 'vitest';
import { assign, createActor, createMachine, sendTo, type SnapshotFrom } from 'xstate';

import type { KeyCapId, StreamSymbol, TypingStream } from '@/interfaces/types';
import type { UserSettings } from '@/interfaces/user-settings';

import { trainingMachine } from './training.machine';

type TrainingSnapshot = SnapshotFrom<typeof trainingMachine>;

interface TestParentContext {
  advanced: StreamSymbol[];
}
type TestParentEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] }
  | { type: 'APPEND'; symbols: StreamSymbol[] }
  | { type: 'TYPING.ADVANCED'; symbol: StreamSymbol };

function makeTestParent(
  stream: TypingStream,
  symbolLayoutId: UserSettings['symbolLayoutId'] = 'qwerty'
) {
  return createMachine({
    id: 'testParent',
    initial: 'active',
    context: { advanced: [] } as TestParentContext,
    types: {} as { context: TestParentContext; events: TestParentEvent },
    invoke: {
      id: 'training',
      src: trainingMachine,
      input: ({ self }) => ({ stream, symbolLayoutId, parentActor: self }),
    },
    on: {
      KEY_PRESS: {
        actions: sendTo('training', ({ event }) => ({ type: 'KEY_PRESS', keys: event.keys })),
      },
      APPEND: {
        actions: sendTo('training', ({ event }) => ({ type: 'APPEND_SYMBOLS', symbols: event.symbols })),
      },
      'TYPING.ADVANCED': {
        actions: assign({ advanced: ({ context, event }) => [...context.advanced, event.symbol] }),
      },
    },
    states: { active: {} },
  });
}

function getChild(actor: ReturnType<typeof createActor>): TrainingSnapshot {
  return actor.getSnapshot().children.training!.getSnapshot() as TrainingSnapshot;
}

const sym = (targetSymbol: string, key: KeyCapId): StreamSymbol => ({
  targetSymbol,
  targetKeyCaps: [key],
  attempts: [],
});

describe('trainingMachine (непрерывный)', () => {
  it('correct input: продвигает индекс, пишет attempt, шлёт TYPING.ADVANCED с завершённым символом', () => {
    const stream: TypingStream = [sym('a', 'KeyA'), sym('b', 'KeyB')];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });

    const child = getChild(actor);
    expect(child.context.currentIndex).toBe(1);
    expect(child.context.stream[0]!.attempts).toHaveLength(1);

    const advanced = actor.getSnapshot().context.advanced;
    expect(advanced).toHaveLength(1);
    expect(advanced[0]!.targetSymbol).toBe('a');
    expect(advanced[0]!.attempts[0]!.pressedKeyCaps).toEqual(['KeyA']);
  });

  it('incorrect input: НЕ продвигает, НЕ шлёт ADVANCED', () => {
    const stream: TypingStream = [sym('a', 'KeyA')];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] });

    expect(getChild(actor).context.currentIndex).toBe(0);
    expect(getChild(actor).context.errors).toBe(1);
    expect(actor.getSnapshot().context.advanced).toHaveLength(0);
  });

  it('на конце потока НЕ самозавершается — стоит в awaitingInput, принимает APPEND', () => {
    const stream: TypingStream = [sym('a', 'KeyA')];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // курсор=1, конец потока

    expect(getChild(actor).value).toBe('awaitingInput');
    expect(getChild(actor).context.currentIndex).toBe(1);

    // дозагрузка хвоста
    actor.send({ type: 'APPEND', symbols: [sym('b', 'KeyB')] });
    expect(getChild(actor).context.stream).toHaveLength(2);

    // продолжаем печатать дописанное
    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] });
    expect(getChild(actor).context.currentIndex).toBe(2);
    expect(actor.getSnapshot().context.advanced.map((s) => s.targetSymbol)).toEqual(['a', 'b']);
  });

  it('APPEND_SYMBOLS дописывает в хвост, не трогая курсор и набранное', () => {
    const stream: TypingStream = [sym('a', 'KeyA'), sym('b', 'KeyB')];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // курсор=1
    actor.send({ type: 'APPEND', symbols: [sym('c', 'KeyC')] });

    const child = getChild(actor);
    expect(child.context.currentIndex).toBe(1);
    expect(child.context.stream.map((s) => s.targetSymbol)).toEqual(['a', 'b', 'c']);
  });

  it('завершённый символ в ADVANCED заморожен (несёт свои attempts, включая ошибки до верного)', () => {
    const stream: TypingStream = [sym('a', 'KeyA')];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyX'] }); // ошибка
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // верно → advance

    const advanced = actor.getSnapshot().context.advanced;
    expect(advanced).toHaveLength(1);
    expect(advanced[0]!.attempts.map((a) => a.pressedKeyCaps)).toEqual([['KeyX'], ['KeyA']]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run src/machines/training.machine.test.ts`
Expected: FAIL — нет обработки `APPEND_SYMBOLS`, нет события `TYPING.ADVANCED`, машина уходит в `lessonComplete`.

- [ ] **Step 3: Изменить `training.machine.ts`**

3a. Обновить шапку и типы событий (`training.machine.ts:1-29`):

```ts
/**
 * @file Машина состояний XState — чистый классификатор печати.
 * @description Прогоняет непрерывный TypingStream: классифицирует ввод как
 * корректный/ошибочный, копит attempts, шлёт родителю TYPING.ADVANCED на каждом
 * продвижении курсора, принимает дозагрузку хвоста через APPEND_SYMBOLS.
 * Завершение сессии — НЕ его забота (решает sessionMachine по таймеру).
 */
import { assign, sendTo, setup } from 'xstate';

import type { KeyCapId, ParentActor, StreamSymbol, SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { addAttempt } from '@/lib/stream-utils';
import { areKeyCapIdArraysEqual } from '@/lib/symbol-utils';


export interface TrainingContext {
  stream: TypingStream;
  currentIndex: number;
  errors: number;
  currentSymbolLayoutId: SymbolLayoutId;
  symbolAppearanceTime: number;
  parentActor: ParentActor;
}

export type TrainingEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] }
  | { type: 'APPEND_SYMBOLS'; symbols: StreamSymbol[] };

export interface TrainingInput {
  stream: TypingStream;
  symbolLayoutId: SymbolLayoutId;
  parentActor: ParentActor;
}
```

3b. Заменить `sendSessionComplete` на `notifyAdvanced`, добавить `appendSymbols`; удалить `isLessonComplete` (оставить только guard `isAttemptCorrect`). В блоке `actions` (`training.machine.ts:37-65`) удалить `sendSessionComplete` и добавить:

```ts
    // Шлёт родителю ЗАВЕРШЁННЫЙ (замороженный) символ — курсор уже за ним,
    // attempts финальны. База для event-sourced проекции sessionMachine.
    notifyAdvanced: sendTo(
      ({ context }) => context.parentActor,
      ({ context }) => ({
        type: 'TYPING.ADVANCED',
        symbol: context.stream[context.currentIndex]!,
      }),
    ),
    appendSymbols: assign(({ context }, params: { symbols: StreamSymbol[] }) => ({
      stream: [...context.stream, ...params.symbols],
    })),
```

> Порядок важен: `notifyAdvanced` читает `stream[currentIndex]` ДО `advanceCursor`. См. шаг 3d.

3c. В блоке `guards` (`training.machine.ts:66-73`) удалить `isLessonComplete`, оставить `isAttemptCorrect`.

3d. Переписать состояния (`training.machine.ts:86-132`): добавить общий обработчик `APPEND_SYMBOLS`, снять `lessonComplete`, в `correctInput` слать `notifyAdvanced` перед `advanceCursor` и всегда возвращаться в `awaitingInput`:

```ts
}).createMachine({
  id: 'training',
  initial: 'awaitingInput',
  context: ({ input }) => ({
    stream: input.stream,
    currentIndex: 0,
    errors: 0,
    currentSymbolLayoutId: input.symbolLayoutId,
    symbolAppearanceTime: 0,
    parentActor: input.parentActor,
  }),
  // Дозагрузка хвоста доступна в любом состоянии — поток непрерывен.
  on: {
    APPEND_SYMBOLS: {
      actions: {
        type: 'appendSymbols',
        params: ({ event }) => ({ symbols: event.symbols }),
      },
    },
  },
  states: {
    awaitingInput: {
      entry: 'captureAppearanceTime',
      on: {
        KEY_PRESS: 'processingInput',
      },
    },

    processingInput: {
      always: [
        { target: 'correctInput', guard: 'isAttemptCorrect' },
        { target: 'incorrectInput' },
      ],
    },

    correctInput: {
      // ПОРЯДОК ЖЁСТКИЙ, не переставлять: recordAttempt пишет attempt в
      // stream[currentIndex]; notifyAdvanced читает этот уже-замороженный символ
      // (с attempt'ом) и шлёт его родителю; advanceCursor двигает курсор за него.
      // На конце потока просто ждём в awaitingInput — самозавершения нет, конец
      // сессии решает sessionMachine.
      entry: [
        { type: 'recordAttempt', params: ({ event }) => ({ keys: event.keys }) },
        'notifyAdvanced',
        'advanceCursor',
      ],
      always: 'awaitingInput',
    },

    incorrectInput: {
      entry: [
        'incrementErrors',
        { type: 'recordAttempt', params: ({ event }) => ({ keys: event.keys }) },
      ],
      always: 'awaitingInput',
    },
  },
});
```

> `recordAttempt` остаётся как есть; он защищён от out-of-bounds (`addAttempt` возвращает поток без изменений при курсоре вне диапазона).

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run src/machines/training.machine.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Проверить типы**

Run: `make check`
Expected: 0 ошибок. (Если `TrainingScene.svelte` ссылается на `matches('lessonComplete')` — это всплывёт здесь; правится в задаче 5, но если падает компиляция — временно убрать ссылку, отметив TODO для задачи 5.)

> Примечание: `MainContent`/`TrainingScene` ещё используют `currentSymbolLayoutId` из training-контекста — он сохранён, всё ок. Ссылка `state.children.trainingService` в `App.svelte` пока валидна по типам (training всё ещё прямой ребёнок до задачи 4).

- [ ] **Step 6: Commit**

```bash
git add src/machines/training.machine.ts src/machines/training.machine.test.ts
git commit -m "feat(training): непрерывный классификатор — APPEND_SYMBOLS, TYPING.ADVANCED, без lessonComplete"
```

---

## Task 3: sessionMachine (без refill)

Чистая машина одного прогона: `loading` (первый fetch) → `active` (`running`/`paused`/`draining`, invoke training) → `done` (финальный чекпоинт + `SESSION.COMPLETE`). Провайдеры `fetchDrills`/`recordCheckpoint` внедряются.

**Files:**
- Create: `src/machines/session.machine.ts`
- Test: `src/machines/session.machine.test.ts`

- [ ] **Step 1: Написать падающий тест сессии**

`src/machines/session.machine.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { assign, createActor, createMachine, fromPromise, type SnapshotFrom } from 'xstate';

import type { KeyCapId, StreamSymbol, TypingStream } from '@/interfaces/types';
import { sessionMachine } from './session.machine';

type SessionSnapshot = SnapshotFrom<typeof sessionMachine>;

const sym = (targetSymbol: string, key: KeyCapId): StreamSymbol => ({
  targetSymbol,
  targetKeyCaps: [key],
  attempts: [],
});

const TWO: TypingStream = [sym('a', 'KeyA'), sym('b', 'KeyB')];

/** Сессия с инъекцией: fetch отдаёт фиксированный поток, record — spy. */
function makeSession({
  stream = TWO,
  onRecord = vi.fn(),
}: { stream?: TypingStream; onRecord?: (summary: unknown) => void } = {}) {
  return sessionMachine.provide({
    actors: {
      fetchDrills: fromPromise(async () => stream),
    },
    actions: {
      recordCheckpoint: (_, params) => onRecord((params as { summary: unknown }).summary),
    },
  });
}

// Болванка-родитель: `SessionInput.parentActor` обязателен по типам, поэтому
// каждому INPUT нужен реальный ActorRef. Тестам, которым неважно SESSION.COMPLETE,
// хватает пустой машины (событие просто игнорируется).
const noopParent = createActor(createMachine({ id: 'noopParent' })).start();
const INPUT = { symbolLayoutId: 'qwerty' as const, openedSteps: 1, cpm: 200, parentActor: noopParent };

function getTraining(actor: ReturnType<typeof createActor>) {
  const child = actor.getSnapshot().children.training;
  return child ? child.getSnapshot() : null;
}

describe('sessionMachine (без refill)', () => {
  it('после loading заходит в active.running и invoke\'ит training с собранным потоком', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => {
      const snap = actor.getSnapshot() as SessionSnapshot;
      expect(snap.matches({ active: 'running' })).toBe(true);
    });
    expect(getTraining(actor)!.context.stream.map((s: StreamSymbol) => s.targetSymbol)).toEqual(['a', 'b']);
  });

  it('накапливает completed[] из TYPING.ADVANCED по мере печати', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'running' })).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    await vi.waitFor(() =>
      expect((actor.getSnapshot() as SessionSnapshot).context.completed.map((s) => s.targetSymbol)).toEqual(['a'])
    );
  });

  it('пауза замораживает таймер: displayElapsedMs не растёт в paused', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'running' })).toBe(true));

    actor.send({ type: 'PAUSE_TIMER' });
    expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'paused' })).toBe(true);
    const frozen = (actor.getSnapshot() as SessionSnapshot).context.elapsedMs;
    actor.send({ type: 'RESUME_TIMER' });
    expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'running' })).toBe(true);
    expect((actor.getSnapshot() as SessionSnapshot).context.elapsedMs).toBe(frozen);
  });

  it('на паузе печать заблокирована: KEY_PRESS не двигает курсор, completed не растёт', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'running' })).toBe(true));

    actor.send({ type: 'PAUSE_TIMER' });
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // во время паузы — игнор
    // дать микрозадачам отработать
    await Promise.resolve();
    const snap = actor.getSnapshot() as SessionSnapshot;
    expect(snap.context.completed).toHaveLength(0);
    expect(snap.children.training!.getSnapshot().context.currentIndex).toBe(0);
  });

  it('по допечатке всей очереди после истечения таймера → done + SESSION.COMPLETE родителю', async () => {
    // Истечение симулируем коротким окном: подадим TIMER_EXPIRED напрямую.
    const onRecord = vi.fn();
    // Сток-родитель: ловит SESSION.COMPLETE. Без него sendComplete уходит в self
    // (XState-запасной вариант при отсутствии parentActor) и «родителю» НЕ проверяется.
    const sink = createActor(
      createMachine({
        types: {} as { context: { got: TypingStream[] } },
        context: { got: [] },
        on: {
          'SESSION.COMPLETE': {
            actions: assign({
              got: ({ context, event }) => [...context.got, (event as { stream: TypingStream }).stream],
            }),
          },
        },
      }),
    ).start();
    const actor = createActor(makeSession({ onRecord }), { input: { ...INPUT, parentActor: sink } });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'running' })).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    actor.send({ type: 'TIMER_EXPIRED' }); // таймер вышел → draining (b ещё не набрана)
    expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'draining' })).toBe(true);

    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] }); // допечатали хвост
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches('done')).toBe(true));
    expect(onRecord).toHaveBeenCalledTimes(1); // финальный чекпоинт
    expect(sink.getSnapshot().context.got).toHaveLength(1); // родитель получил SESSION.COMPLETE
    expect(sink.getSnapshot().context.got[0]).toHaveLength(2); // полный набранный поток [a, b]
  });

  it('истёкший таймер при уже допечатанном потоке → сразу done', async () => {
    const actor = createActor(makeSession({ stream: [sym('a', 'KeyA')] }), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'running' })).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // всё набрано
    actor.send({ type: 'TIMER_EXPIRED' });
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches('done')).toBe(true));
  });
});
```

> `TIMER_EXPIRED` — внутреннее событие, которое в продакшене шлёт тикер при `displayElapsedMs >= окно`; в тесте подаём напрямую, чтобы не гонять реальные таймеры.

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run src/machines/session.machine.test.ts`
Expected: FAIL — `Failed to resolve import "./session.machine"`.

- [ ] **Step 3: Реализовать `session.machine.ts`**

```ts
/**
 * @file sessionMachine — машина одного таймерного прогона тренировки.
 * @description Слой ДОСТАВКИ и ЖИЗНЕННОГО ЦИКЛА (бизнес-сущности: таймер, cpm,
 * бюджет). Собирает порцию (fetchDrills), invoke'ит trainingMachine над
 * непрерывным потоком, накапливает event-sourced проекцию completed[] из
 * TYPING.ADVANCED, на чекпоинтах сводит [previousCheckpoint .. completed.length)
 * и шлёт recordCheckpoint, по истечении таймера допечатывает очередь и шлёт
 * родителю SESSION.COMPLETE. Чистая: провайдеры fetchDrills/recordCheckpoint
 * внедряются (см. session-impl.ts). Refill — задача 7.
 */
import { assign, enqueueActions, fromCallback, fromPromise, sendTo, setup } from 'xstate';

import type {
  KeyCapId,
  ParentActor,
  StreamSymbol,
  SymbolLayoutId,
  TypingStream,
} from '@/interfaces/types';
import { computeBudgetChars } from '@/lib/batch-budget';
import { drillSummarize, type DrillSummary } from '@/lib/drill-summarize';
import {
  DRAIN_CAP_MS,
  SESSION_DURATION_SECONDS,
  TICK_INTERVAL_MS,
} from '@/lib/session-config';
import { trainingMachine } from './training.machine';

export interface SessionInput {
  symbolLayoutId: SymbolLayoutId;
  openedSteps: number;
  cpm: number;
  parentActor: ParentActor;
}

export interface SessionContext {
  symbolLayoutId: SymbolLayoutId;
  openedSteps: number;
  cpm: number;
  parentActor: ParentActor;
  pendingStream: TypingStream; // результат первого fetch до invoke training
  completed: StreamSymbol[]; // проекция набранных символов (из TYPING.ADVANCED)
  previousCheckpoint: number; // индекс в completed, докуда сведено
  totalAppended: number; // сколько символов отдано в training (initial + APPEND)
  elapsedMs: number; // зафиксированный аккумулятор завершённых сегментов
  segmentStartedAt: number; // Date.now() на входе в running
  displayElapsedMs: number; // живое прошедшее для дисплея/истечения (тик)
}

export type SessionEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] } // форвард вниз в training
  | { type: 'TYPING.ADVANCED'; symbol: StreamSymbol } // от training
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESUME_TIMER' }
  | { type: 'TICK' } // от тикера
  | { type: 'TIMER_EXPIRED' }; // от тикера (или теста) при выходе окна

const SESSION_WINDOW_MS = SESSION_DURATION_SECONDS * 1000;

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionEvent,
    input: {} as SessionInput,
  },
  actors: {
    trainingService: trainingMachine,
    // Провайдеры — дефолты-заглушки. Реальные в session-impl.ts; тесты переопределяют.
    fetchDrills: fromPromise<TypingStream, { symbolLayoutId: SymbolLayoutId; openedSteps: number; budgetChars: number }>(
      async () => {
        throw new Error('fetchDrills not provided');
      },
    ),
    ticker: fromCallback<{ type: 'TICK' }, { intervalMs: number }>(({ sendBack, input }) => {
      const id = setInterval(() => sendBack({ type: 'TICK' }), input.intervalMs);
      return () => clearInterval(id);
    }),
  },
  actions: {
    recordCheckpoint: (_, _params: { summary: DrillSummary; symbolLayoutId: SymbolLayoutId }) => {
      throw new Error('recordCheckpoint not provided');
    },
    storeFetched: assign(({ event }) => {
      // onDone актора fetchDrills: event.output — собранный поток
      const stream = (event as { output: TypingStream }).output;
      return { pendingStream: stream, totalAppended: stream.length };
    }),
    pushCompleted: assign(({ context, event }) => ({
      completed: [...context.completed, (event as { symbol: StreamSymbol }).symbol],
    })),
    markSegmentStart: assign({ segmentStartedAt: () => Date.now() }),
    accumulateElapsed: assign(({ context }) => {
      const committed = context.elapsedMs + (Date.now() - context.segmentStartedAt);
      return { elapsedMs: committed, displayElapsedMs: committed };
    }),
    refreshDisplay: assign(({ context }) => ({
      displayElapsedMs: context.elapsedMs + (Date.now() - context.segmentStartedAt),
    })),
    // Один вход: свести [previousCheckpoint .. completed.length), инициировать
    // внедрённую запись и сдвинуть границу. drillSummarize — чистый;
    // recordCheckpoint — провайдер (Convex/skip), вызывается через enqueue.
    checkpointAndRecord: enqueueActions(({ context, enqueue }) => {
      const slice = context.completed.slice(context.previousCheckpoint);
      if (slice.length === 0) return;
      const summary = drillSummarize(slice);
      enqueue({ type: 'recordCheckpoint', params: { summary, symbolLayoutId: context.symbolLayoutId } });
      enqueue.assign({ previousCheckpoint: context.completed.length });
    }),
    sendComplete: sendTo(
      ({ context }) => context.parentActor,
      ({ context }) => ({ type: 'SESSION.COMPLETE', stream: context.completed }),
    ),
    forwardKeyPress: sendTo('training', ({ event }) => ({
      type: 'KEY_PRESS',
      keys: (event as { keys: KeyCapId[] }).keys,
    })),
  },
  guards: {
    isExpired: ({ context }) => context.displayElapsedMs >= SESSION_WINDOW_MS,
    allTyped: ({ context }) => context.completed.length >= context.totalAppended,
  },
  delays: {
    drainCap: DRAIN_CAP_MS,
  },
}).createMachine({
  id: 'session',
  initial: 'loading',
  context: ({ input }) => ({
    symbolLayoutId: input.symbolLayoutId,
    openedSteps: input.openedSteps,
    cpm: input.cpm,
    parentActor: input.parentActor,
    pendingStream: [],
    completed: [],
    previousCheckpoint: 0,
    totalAppended: 0,
    elapsedMs: 0,
    segmentStartedAt: 0,
    displayElapsedMs: 0,
  }),
  states: {
    loading: {
      invoke: {
        id: 'fetchInitial',
        src: 'fetchDrills',
        input: ({ context }) => ({
          symbolLayoutId: context.symbolLayoutId,
          openedSteps: context.openedSteps,
          budgetChars: computeBudgetChars({ secondsRemaining: SESSION_DURATION_SECONDS, cpm: context.cpm }),
        }),
        onDone: { target: 'active', actions: 'storeFetched' },
        onError: { target: 'done' }, // пустой fetch → нечего печатать, в конец
      },
    },

    active: {
      // registry-ключ актора — `trainingService` (соглашение xService, как в
      // appMachine), но адресуемся по invoke id 'training': XState и children, и
      // sendTo разрешают по id, не по ключу реестра.
      invoke: {
        id: 'training',
        src: 'trainingService',
        input: ({ context, self }) => ({
          stream: context.pendingStream,
          symbolLayoutId: context.symbolLayoutId,
          parentActor: self,
        }),
      },
      // ВНИМАНИЕ: KEY_PRESS и TYPING.ADVANCED НЕ на active.on, а в каждом
      // подсостоянии, где печать активна (running/draining). В paused их нет —
      // на паузе ввод не пересылается в training, курсор не двигается, и
      // TYPING.ADVANCED прийти не может (нечему). Так пауза замораживает и
      // таймер, И печать; ни одно продвижение не теряется.
      initial: 'running',
      states: {
        running: {
          entry: 'markSegmentStart',
          invoke: {
            id: 'ticker',
            src: 'ticker',
            input: { intervalMs: TICK_INTERVAL_MS },
          },
          on: {
            KEY_PRESS: { actions: 'forwardKeyPress' },
            'TYPING.ADVANCED': { actions: 'pushCompleted' },
            TICK: [
              { guard: 'isExpired', target: 'draining', actions: 'accumulateElapsed' },
              { actions: 'refreshDisplay' },
            ],
            TIMER_EXPIRED: { target: 'draining', actions: 'accumulateElapsed' },
            PAUSE_TIMER: { target: 'paused', actions: 'accumulateElapsed' },
          },
        },
        paused: {
          // Печать заморожена: ни форварда KEY_PRESS, ни обработки ADVANCED.
          on: {
            RESUME_TIMER: 'running',
          },
        },
        draining: {
          // Таймер вышел: дозагрузки нет, даём допечатать очередь. Страховочный таймаут
          // не даёт зависнуть, если юзер бросил печатать на середине символа.
          after: {
            drainCap: { target: '#session.done' },
          },
          always: { guard: 'allTyped', target: '#session.done' },
          on: {
            KEY_PRESS: { actions: 'forwardKeyPress' },
            'TYPING.ADVANCED': { actions: 'pushCompleted' },
          },
        },
      },
    },

    done: {
      entry: ['checkpointAndRecord', 'sendComplete'],
      type: 'final',
    },
  },
});
```

> **Заметка для исполнителя.** Действия в `setup({ actions })` должны быть ровно те, что упомянуты в состояниях: `forwardKeyPress`, `pushCompleted`, `markSegmentStart`, `accumulateElapsed`, `refreshDisplay`, `storeFetched`, `checkpointAndRecord`, `sendComplete`, `recordCheckpoint` (+ `appendFetched` появится в задаче 7). `checkpointAndRecord` через `enqueueActions` совмещает чистую сводку (`drillSummarize`), вызов внедрённого `recordCheckpoint` и сдвиг `previousCheckpoint` — один вход и в `done`, и (в задаче 7) перед refill.

> **Пустой fetch.** `loading.onError → done` со `completed: []` штатен: `checkpointAndRecord` рано выходит (`slice.length === 0`, записи нет), `sendComplete` шлёт `SESSION.COMPLETE` с пустым потоком → экран `sessionComplete` с нулевой статистикой. `lessonStats` в `MainContent` это терпит (вернёт `null` при `totalAttempts === 0`), так что краша нет — просто пустой экран результатов.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run src/machines/session.machine.test.ts`
Expected: PASS (6 tests). При падении на таймере убедиться, что тесты используют `TIMER_EXPIRED` напрямую, а не ждут реальный интервал.

- [ ] **Step 5: Проверить типы**

Run: `make check`
Expected: 0 ошибок в `session.machine.ts` (UI пока не трогаем).

- [ ] **Step 6: Commit**

```bash
git add src/machines/session.machine.ts src/machines/session.machine.test.ts
git commit -m "feat(session): sessionMachine без refill — таймер, чекпоинт, конец сессии"
```

---

## Task 4: Подключить sessionMachine в appMachine

Замыкаем логику: `training` invoke'ит `sessionService`, форвард `KEY_PRESS` уходит в session, пауза шлёт `PAUSE_TIMER`/`RESUME_TIMER`, выбор drill'а уезжает из корня.

**Files:**
- Create: `src/machines/session-impl.ts`
- Modify: `src/machines/app.machine.ts`
- Modify: `src/machines/app.machine.test.ts`

- [ ] **Step 1: Создать `session-impl.ts` (реальные провайдеры, локальный fetch)**

```ts
/**
 * @file Реальные провайдеры sessionMachine: сбор порции и запись чекпоинта.
 * Здесь живёт побочный эффект (корпус/Convex), машина session.machine.ts остаётся
 * чистой. На этом шаге fetch — локальный (корпус), record — пропуск
 * (drillRecord подключается в задаче 6).
 */
import { fromPromise } from 'xstate';

import type { SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { fetchLocalDrillStream } from '@/lib/drill-stream';
import { sessionMachine } from './session.machine';

export const sessionService = sessionMachine.provide({
  actors: {
    fetchDrills: fromPromise<
      TypingStream,
      { symbolLayoutId: SymbolLayoutId; openedSteps: number; budgetChars: number }
    >(async ({ input }) => fetchLocalDrillStream({
      symbolLayoutId: input.symbolLayoutId,
      budgetChars: input.budgetChars,
    })),
  },
  actions: {
    // Запись профиля подключается в задаче 6 (drillRecord). Пока no-op,
    // чтобы петля замкнулась без авторизации/сети.
    recordCheckpoint: () => {},
  },
});
```

- [ ] **Step 2: Обновить тесты appMachine под session-invoke**

appMachine тестируем ИЗОЛИРОВАННО: подменяем `sessionService` пустой заглушкой через `.provide()`, чтобы тест проверял навигацию корня, а не внутренности сессии — и не тянул реальный fetch/Convex (важно после задачи 6, когда `session-impl` импортирует `convex`).

2a. В шапку файла добавить заглушку и фабрику актора под тест:

```ts
import { createActor, createMachine } from 'xstate';
// ...
// Заглушка сессии — пустая МАШИНА (не fromCallback!). В setup appMachine
// `sessionService` зарегистрирован как машина, поэтому override обязан быть
// машинной логикой — callback-актор не присвоится по типам (red в make check).
// Пустая машина глотает KEY_PRESS/PAUSE_TIMER/RESUME_TIMER, остаётся жива →
// snap.children.sessionService определён. Каст нужен, т.к. её generics не совпадают
// с конкретным sessionService; SESSION.COMPLETE в тестах шлём в appMachine напрямую.
const sessionStub = createMachine({ id: 'sessionStub' });
const appMachineForTest = appMachine.provide({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actors: { sessionService: sessionStub as any },
});
```

2b. Заменить во ВСЕХ тестах `createActor(appMachine)` → `createActor(appMachineForTest)`.

2c. Удалить проверки построения потока (поток теперь строит сессия, не корень):
- в тесте «from menu: enters training.running…» (текущие строки 27-28) убрать:
  ```ts
  expect(snap.context.lastTrainingStream).not.toBeNull();
  expect(snap.context.lastTrainingStream!.length).toBeGreaterThan(0);
  ```
  переименовать тест в `'from menu: enters training.running, stores symbolLayoutId, spawns sessionService'` и добавить вместо них:
  ```ts
  expect(snap.children.sessionService).toBeDefined();
  ```
- в тесте «Enter NAVIGATION_KEY restarts training…» (текущие строки 145-146) убрать те же две `lastTrainingStream`-проверки — здесь они падают по иной причине: после рестарта `lastTrainingStream` равен `[]` предыдущей сессии (из `arriveInSessionComplete` со `stream: []`), а не «поток не построен».

2d. Тесты навигации (PAUSE/RESUME/Escape/Enter/TO_MENU) и тест `SESSION.COMPLETE` (шлёт событие в appMachine напрямую, проверяет `lastTrainingStream === finalStream`) — остаются валидны без правок, кроме замены актора (2b). `arriveInSessionComplete` со `stream: []` тоже ок (`lastTrainingStream = []`).

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npx vitest run src/machines/app.machine.test.ts`
Expected: FAIL (compile/type-error) — `appMachine.provide({ actors: { sessionService } })` ссылается на актор, которого ещё нет в `setup` appMachine (там пока `trainingService`). Это и есть «красный» до шага 4.

- [ ] **Step 4: Изменить `app.machine.ts`**

4a. Импорты (`app.machine.ts:1-13`) — убрать корпус/выбор drill'а и `createTypingStream`, добавить session + конфиг:

```ts
import { assign, sendTo, setup } from "xstate";

import type { KeyCapId } from "@/interfaces/key-cap-id";
import type { SymbolLayoutId, TypingStream } from "@/interfaces/types";
import { getPhysicalLayout } from "@/lib/layouts";

const physicalLayoutANSI = getPhysicalLayout('ansi');
import { DEFAULT_OPENED_STEPS, DEFAULT_SESSION_CPM } from "@/lib/session-config";

import { keyboardMachine } from "./keyboard.machine";
import { sessionService } from "./session-impl";
```

4b. `actors` (`app.machine.ts:37-40`):

```ts
  actors: {
    keyboardService: keyboardMachine,
    sessionService,
  },
```

4c. `actions` (`app.machine.ts:41-66`) — `startNewTrainingStream` больше не строит поток (выбор drill'а уехал в session), остаётся только запомнить раскладку:

```ts
  actions: {
    // Выбор drill'ов и построение потока уехали в sessionMachine (session-impl).
    // На корне — только зафиксировать раскладку для будущей сессии.
    setSymbolLayout: assign((_, params: { symbolLayoutId: SymbolLayoutId }) => ({
      currentSymbolLayoutId: params.symbolLayoutId,
    })),
    storeCompletedStream: assign((_, params: { stream: TypingStream }) => ({
      lastTrainingStream: params.stream,
    })),
  },
```

4d. Заменить все `type: 'startNewTrainingStream'` на `type: 'setSymbolLayout'` (три места: `menu` → `START_TRAINING` `app.machine.ts:128-131`; `sessionComplete` → `START_TRAINING` `:186-189`; `sessionComplete` → `NAVIGATION_KEY`/Enter `:193-197`). Параметры те же (`symbolLayoutId`).

4e. Форвард ввода (`app.machine.ts:105-110`) — цель `trainingService` → `sessionService`:

```ts
    'KEYBOARD.CHARACTER_INPUT': {
      actions: sendTo('sessionService', ({ event }) => ({
        type: 'KEY_PRESS',
        keys: event.keys,
      })),
    },
```

4f. Состояние `training` (`app.machine.ts:136-178`) — invoke session, проброс паузы в таймер:

```ts
    training: {
      initial: 'running',
      invoke: {
        id: 'sessionService',
        src: 'sessionService',
        input: ({ context, self }) => ({
          symbolLayoutId: context.currentSymbolLayoutId,
          openedSteps: DEFAULT_OPENED_STEPS,
          cpm: DEFAULT_SESSION_CPM,
          parentActor: self,
        }),
      },
      on: {
        'SESSION.COMPLETE': {
          target: 'sessionComplete',
          actions: {
            type: 'storeCompletedStream',
            params: ({ event }) => ({ stream: event.stream }),
          },
        },
      },
      states: {
        running: {
          on: {
            PAUSE: 'paused',
            'KEYBOARD.NAVIGATION_KEY': { guard: 'isEscape', target: 'paused' },
          },
        },
        paused: {
          entry: [
            sendTo('keyboardService', { type: 'RESET' }),
            sendTo('sessionService', { type: 'PAUSE_TIMER' }),
          ],
          exit: sendTo('sessionService', { type: 'RESUME_TIMER' }),
          on: {
            RESUME: 'running',
            TO_MENU: '#app.menu',
            'KEYBOARD.NAVIGATION_KEY': [
              { guard: 'isEscape', target: '#app.menu' },
              { guard: 'isEnter', target: 'running' },
            ],
          },
        },
      },
    },
```

> `exit` на `paused` шлёт `RESUME_TIMER` и при `RESUME`, и при возврате в `running` через Enter. Уход в `#app.menu` тоже запускает `exit` — это безвредно (session вот-вот будет остановлена сменой состояния `training`). Если потребуется точечность — перенести `RESUME_TIMER` на входы целевых `running`. Для простоты оставляем на `exit`.

4g. Контекст/типы: оставить `AppContext` и событие `SESSION.COMPLETE` как есть (`lastTrainingStream`, `currentSymbolLayoutId`). Удалить из `AppEvent` ничего не нужно; `START_TRAINING` остаётся.

- [ ] **Step 4b: Мигрировать dev-захват `typing-capture.ts`**

`src/lib/dev/typing-capture.ts` — забытый потребитель: подключён в `appActor.ts` под `import.meta.env.DEV`, читает `state.children.trainingService` (станет `undefined` — training теперь внук) и проверяет `value === 'lessonComplete'` (состояние снято в задаче 2). Без миграции `make check` краснеет ВНЕ трёх UI-файлов.

Перевести захват на уровень appMachine: ловить вход в `sessionComplete` и брать уже сохранённый `state.context.lastTrainingStream` (его кладёт `storeCompletedStream` из `SESSION.COMPLETE`). Это убирает подписку на training-ребёнка и зависимость от `lessonComplete`/глубины вложенности. Заменить тело `attachTypingCapture` (часть ПОСЛЕ установки `window.__typingData`, текущие строки 54-80):

```ts
  let capturedThisSession = false;
  appActor.subscribe((state) => {
    if (state.value !== 'sessionComplete') {
      capturedThisSession = false; // покинули экран — готовы к следующей сессии
      return;
    }
    if (capturedThisSession) return;
    capturedThisSession = true;

    const stream = state.context.lastTrainingStream;
    if (!stream || stream.length === 0) return;

    const record = streamToRunRecord({
      stream,
      symbolLayoutId: state.context.currentSymbolLayoutId,
      capturedAt: Date.now(),
    });
    void store.append(record);
    console.info(
      `[typing-capture] сессия захвачена (${record.symbols.length} символов). ` +
        `window.__typingData.export() — выгрузить JSONL.`,
    );
  });
```

Удалить теперь неиспользуемые: тип `TrainingActor`, `capturedChildren`/`lastChild`, импорт `trainingMachine` и `SnapshotFrom`. Обновить шапку-комментарий файла («в момент `lessonComplete` пишет… `state.children.trainingService`» → «на входе в `sessionComplete` пишет `context.lastTrainingStream`»).

- [ ] **Step 5: Запустить тесты appMachine**

Run: `npx vitest run src/machines/app.machine.test.ts`
Expected: PASS.

- [ ] **Step 6: Прогнать весь src-проект**

Run: `npx vitest run --project src`
Expected: PASS (UI-компоненты ещё ссылаются на `trainingService`/`lessonComplete` — это всплывёт в `make check` на шаге 7, не в vitest).

- [ ] **Step 7: Типы (ожидаемо красные в UI — фикс в задаче 5)**

Run: `make check`
Expected: ошибки ТОЛЬКО в `App.svelte`/`MainContent.svelte`/`TrainingScene.svelte` (нет `trainingService`, `matches('lessonComplete')`). Это вход в задачу 5. Машинные файлы и `typing-capture.ts` (мигрирован в 4b) — чисто.

- [ ] **Step 8: Commit**

```bash
git add src/machines/session-impl.ts src/machines/app.machine.ts src/machines/app.machine.test.ts src/lib/dev/typing-capture.ts
git commit -m "feat(app): training invoke'ит sessionService; выбор drill'а уехал в сессию"
```

---

## Task 5: UI — подписка на session + таймер, вложенный trainingActor

Точка подписки переезжает: `trainingService` теперь внук (`session → training`). `App.svelte` берёт `sessionActor` из корня, `TrainingScene` показывает таймер из session и подписывается на вложенный training для потока/курсора, терпя его отсутствие во время `loading`.

**Files:**
- Modify: `src/components/app/App.svelte`
- Modify: `src/components/app/MainContent.svelte`
- Modify: `src/components/ui/TrainingScene.svelte`

- [ ] **Step 1: `App.svelte` — деривация sessionActor**

Заменить блок деривации (`App.svelte:3-21`):

```svelte
<script lang="ts">
  import { appActor } from '@/machines/appActor';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { Actor } from 'xstate';

  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { onDestroy } from 'svelte';

  import MainContent from './MainContent.svelte';
  import FooterActions from './FooterActions.svelte';

  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  const sessionActor = $derived(
    state.children.sessionService as Actor<typeof sessionMachine> | undefined
  );
</script>

<MainContent
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  {sessionActor}
/>

<FooterActions
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  symbolLayoutId={$settings.symbolLayoutId}
/>
```

- [ ] **Step 2: `MainContent.svelte` — проброс sessionActor**

Заменить тип в `Props` и проброс (`MainContent.svelte:1-26, 39-40`):

```svelte
  import type { sessionMachine } from '@/machines/session.machine';
  // ...
  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    sessionActor: Actor<typeof sessionMachine> | undefined;
  }
  const { state, send, dictionary, sessionActor }: Props = $props();
```

И передачу в сцену:

```svelte
{#if inState({ snapshot: state, value: { training: 'running' } }) && sessionActor}
  <TrainingScene {sessionActor} {fingerLayout} physicalLayout={physicalLayoutANSI} cursorType={$settings.cursorType} cursorMode={$settings.cursorMode} {dictionary} />
```

(Удалить импорт `trainingMachine` если не используется.)

- [ ] **Step 3: `TrainingScene.svelte` — таймер из session + вложенный training**

Заменить скрипт-голову (`TrainingScene.svelte:1-58`):

```svelte
<script lang="ts">
  import type { Actor } from 'xstate';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Dictionary, FingerLayout, FlowLineCursorMode, FlowLineCursorType, PhysicalLayout, TypingStream } from '@/interfaces/types';

  import { createKeyboardGraph } from '@/lib/pathfinding';
  import { createKeyCoordinateMap } from '@/lib/layout-utils';
  import { createHandsSceneViewModel } from '@/lib/hands-scene';
  import { getPressResult } from '@/lib/press-result-utils';
  import { getSymbolLayout } from '@/lib/layouts';
  import { enrichStreamSymbols } from '@/lib/stream-utils';
  import { SESSION_DURATION_SECONDS } from '@/lib/session-config';

  import FlowLine from './FlowLine.svelte';
  import HandsScene from './HandsScene.svelte';

  interface Props {
    sessionActor: Actor<typeof sessionMachine>;
    fingerLayout: FingerLayout;
    physicalLayout: PhysicalLayout;
    cursorType: FlowLineCursorType;
    cursorMode: FlowLineCursorMode;
    dictionary: Dictionary;
  }

  const { sessionActor, fingerLayout, physicalLayout, cursorType, cursorMode, dictionary }: Props = $props();

  // svelte-ignore state_referenced_locally
  let sessionState = $state(sessionActor.getSnapshot());
  $effect(() => {
    sessionState = sessionActor.getSnapshot();
    const sub = sessionActor.subscribe((s) => { sessionState = s; });
    return () => sub.unsubscribe();
  });

  // Вложенный training появляется после loading; терпим отсутствие.
  const trainingActor = $derived(
    sessionState.children.training as Actor<typeof trainingMachine> | undefined
  );

  // svelte-ignore state_referenced_locally
  let trainingSnap = $state(trainingActor?.getSnapshot() ?? null);
  let cursorBlink = $state(false);
  let idleTimer: ReturnType<typeof setTimeout>;
  const IDLE_BLINK_DELAY_MS = 600;
  function bumpIdleTimer() {
    cursorBlink = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { cursorBlink = true; }, IDLE_BLINK_DELAY_MS);
  }
  $effect(() => {
    const actor = trainingActor;
    if (!actor) { trainingSnap = null; return; }
    trainingSnap = actor.getSnapshot();
    bumpIdleTimer();
    const sub = actor.subscribe((s) => { trainingSnap = s; bumpIdleTimer(); });
    return () => { sub.unsubscribe(); clearTimeout(idleTimer); };
  });

  const stream: TypingStream = $derived(trainingSnap?.context.stream ?? []);
  const currentIndex = $derived(trainingSnap?.context.currentIndex ?? 0);
  const currentSymbolLayoutId = $derived(trainingSnap?.context.currentSymbolLayoutId ?? 'qwerty');

  const remainingSeconds = $derived(
    Math.max(0, SESSION_DURATION_SECONDS - Math.floor(sessionState.context.displayElapsedMs / 1000))
  );

  const keyboardGraph = $derived(createKeyboardGraph(physicalLayout));
  const keyCoordinateMap = $derived(createKeyCoordinateMap(physicalLayout));
  const symbolLayout = $derived(getSymbolLayout(currentSymbolLayoutId));
  const currentSymbol = $derived(stream[currentIndex]);
  const handsScene = $derived(
    createHandsSceneViewModel({ currentStreamSymbol: currentSymbol, fingerLayout, keyboardGraph, keyCoordinateMap })
  );
  const pressResult = $derived(getPressResult(currentSymbol));
  const enrichedSymbols = $derived(enrichStreamSymbols(stream));
</script>
```

И в разметке заменить отладочную строку состояния на таймер (`TrainingScene.svelte:81-85`):

```svelte
  <h2 class="title">{dictionary.app.training_in_progress}</h2>
  <p class="timer"><code class="state-code">{remainingSeconds}s</code></p>
```

> `.timer`/`.state-code` уже стилизованы; класс `state-code` повторно используем. Обновить устаревший комментарий в `src/components/ui/TrainingScene.contract.ts` (ссылается на `trainingState.value` в `<code>`, теперь там таймер).

- [ ] **Step 4: Проверить типы**

Run: `make check`
Expected: 0 ошибок.

- [ ] **Step 5: Ручная проверка в dev**

Run: `make dev` (в отдельном терминале — `make convex` не нужен для локального fetch).
Проверить вручную:
1. Меню → «Начать тренировку» → появляется поток (несколько слов через пробел), таймер считает вниз с `60s`.
2. Печать продвигает курсор по непрерывному потоку; границы слов — обычные пробелы.
3. Escape → пауза, таймер замирает; Enter → продолжает, таймер идёт дальше.
4. По истечении ~60с после допечатки очереди — экран `sessionComplete` со статистикой.

> Если на старте мелькает пустой кадр (session в `loading`) — это ок (training-ребёнка ещё нет); поток появляется после первого fetch. При желании добавить заглушку — отдельная мелкая правка.

- [ ] **Step 6: Commit**

```bash
git add src/components/app/App.svelte src/components/app/MainContent.svelte src/components/ui/TrainingScene.svelte
git commit -m "feat(ui): подписка на sessionActor — таймер + вложенный training"
```

---

## Task 6: Серверный fetch + запись чекпоинта (drillNext / drillRecord)

Меняем локальные провайдеры на серверные: `fetchDrills` → Convex `drillNext`, `recordCheckpoint` → `drillRecord`. Гость (не авторизован) — локальный корпус + пропуск записи.

**Files:**
- Modify: `src/lib/drill-stream.ts` (добавить `fetchServerDrillStream`)
- Modify: `src/machines/session-impl.ts`
- Test: `src/lib/drill-stream.test.ts` (склейка серверного ответа — без сети, через чистую часть)

- [ ] **Step 1: Тест: склейка серверного ответа использует ту же чистую функцию**

Серверный fetch — побочный (Convex), его не unit-тестируем сетью. Тестируем только маппинг ответа в склейку — вынесем чистый шаг:

В `drill-stream.test.ts` добавить:

```ts
import { glueServerDrills } from './drill-stream';

describe('glueServerDrills', () => {
  test('отображает drills сервера в склеенный поток', () => {
    const stream = glueServerDrills({
      drills: [{ text: 'ab' }, { text: 'cd' }], // glueServerDrills читает только .text
      symbolLayoutId: 'qwerty',
    });
    expect(stream.map((s) => s.targetSymbol)).toEqual(['a', 'b', ' ', 'c', 'd']);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run src/lib/drill-stream.test.ts`
Expected: FAIL — нет экспорта `glueServerDrills`.

- [ ] **Step 3: Добавить в `drill-stream.ts` чистую склейку серверного ответа + серверный fetch**

```ts
import { convex, api } from '@/lib/convex';

/** Чистое отображение ответа drillNext в склеенный поток. */
export function glueServerDrills({
  drills,
  symbolLayoutId,
}: {
  drills: { text: string }[];
  symbolLayoutId: SymbolLayoutId;
}): TypingStream {
  const descriptor = getSymbolLayoutDescriptor(symbolLayoutId);
  return glueDrillsIntoStream({
    drillTexts: drills.map((d) => d.text),
    symbolLayout: descriptor.symbolLayout,
  });
}

/** Серверный сбор порции через Convex drillNext. */
export async function fetchServerDrillStream({
  symbolLayoutId,
  openedSteps,
  budgetChars,
}: {
  symbolLayoutId: SymbolLayoutId;
  openedSteps: number;
  budgetChars: number;
}): Promise<TypingStream> {
  const res = await convex.mutation(api.drill.drillNext, { symbolLayoutId, openedSteps, budgetChars });
  return glueServerDrills({ drills: res.drills, symbolLayoutId });
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run src/lib/drill-stream.test.ts`
Expected: PASS.

- [ ] **Step 5: Переключить провайдеры в `session-impl.ts`**

```ts
import { fromPromise } from 'xstate';

import type { SymbolLayoutId, TypingStream } from '@/interfaces/types';
import type { DrillSummary } from '@/lib/drill-summarize';
import { fetchLocalDrillStream, fetchServerDrillStream } from '@/lib/drill-stream';
import { convex, api } from '@/lib/convex';
import { sessionMachine } from './session.machine';

export const sessionService = sessionMachine.provide({
  actors: {
    fetchDrills: fromPromise<
      TypingStream,
      { symbolLayoutId: SymbolLayoutId; openedSteps: number; budgetChars: number }
    >(async ({ input }) => {
      try {
        const stream = await fetchServerDrillStream(input);
        if (stream.length > 0) return stream;
        // contentGap (пустой пул на сервере) приходит как успешный ответ
        // `{ drills: [] }`, не throw — деградируем на корпус, чтобы не уйти в
        // пустую сессию.
        console.warn('fetchDrills: сервер вернул пусто (contentGap), локальный корпус');
      } catch (err) {
        // Офлайн/гость — деградируем на локальный корпус.
        console.warn('fetchDrills: сервер недоступен, локальный корпус', err);
      }
      return fetchLocalDrillStream({ symbolLayoutId: input.symbolLayoutId, budgetChars: input.budgetChars });
    }),
  },
  actions: {
    // Fire-and-forget: запись профиля не блокирует сессию. Гость (не
    // авторизован) → drillRecord бросит 'Not authenticated' → молча гасим.
    recordCheckpoint: (_, params) => {
      const { summary, symbolLayoutId } = params as { summary: DrillSummary; symbolLayoutId: SymbolLayoutId };
      void convex
        .mutation(api.drill.drillRecord, { symbolLayoutId, summary })
        .catch((err) => console.warn('drillRecord пропущен (гость/офлайн)', err));
    },
  },
});
```

- [ ] **Step 6: Проверка типов + ручной smoke с авторизацией**

Run: `make check` → 0 ошибок.
Run (отдельные терминалы): `make convex` + `make dev`.
Smoke: войти (GitHub/Google) → тренировка → по завершении в панели Convex `skillProfiles` появилась/обновилась строка для юзера; гостем — тренировка работает, `skillProfiles` не пишется (`console.warn`).

- [ ] **Step 7: Commit**

```bash
git add src/lib/drill-stream.ts src/lib/drill-stream.test.ts src/machines/session-impl.ts
git commit -m "feat(session): серверный fetch drillNext + запись чекпоинта drillRecord (гость деградирует)"
```

---

## Task 7: Refill (дозагрузка mid-session) + чекпоинт перед добором

Добавляем нижнюю воду очереди: когда непройденный хвост короче порога и таймер жив — чекпоинт (сводка пройденного) + дозагрузка хвоста через `APPEND_SYMBOLS`. Здесь же — адаптация mid-session (новый `drillNext` читает свежий профиль).

**Files:**
- Modify: `src/machines/session.machine.ts`
- Test: `src/machines/session.machine.test.ts`

- [ ] **Step 1: Тест refill**

Добавить в `session.machine.test.ts`:

```ts
it('низкая вода очереди → чекпоинт + APPEND дозагруженного хвоста', async () => {
  const onRecord = vi.fn();
  // fetch отдаёт по 1 символу за раз — порог refill заведомо пробивается.
  let call = 0;
  const providedSession = sessionMachine.provide({
    actors: {
      fetchDrills: fromPromise(async () => {
        call += 1;
        return call === 1 ? [sym('a', 'KeyA')] : [sym('b', 'KeyB')];
      }),
    },
    actions: { recordCheckpoint: (_, p) => onRecord((p as { summary: unknown }).summary) },
  });
  const actor = createActor(providedSession, { input: INPUT });
  actor.start();
  await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'running' })).toBe(true));

  actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // допечатали хвост → refill
  await vi.waitFor(() => {
    const training = actor.getSnapshot().children.training!.getSnapshot();
    expect(training.context.stream.length).toBeGreaterThan(1); // дописан 'b'
  });
  expect(onRecord).toHaveBeenCalled(); // чекпоинт перед добором
});
```

> Этот тест с 1-символьной порцией срабатывает при любом разумном пороге — он НЕ проверяет точную границу (guard читает `completed` до push, поэтому `needsRefill` использует `+1`-поправку, см. 3b). Чтобы зафиксировать именно границу, добавь отдельный тест: начальная порция длиной ровно `REFILL_THRESHOLD_SYMBOLS + 2`, печатай по одному символу и проверь, что `refilling` НЕ наступает до порога и наступает на нём — так `+1`-поправка не «починится» обратно в баг при будущем рефакторинге.

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run src/machines/session.machine.test.ts -t "низкая вода"`
Expected: FAIL — нет логики refill (`b` не дописывается).

- [ ] **Step 3: Добавить refill в `session.machine.ts`**

3a. Импорт порога: добавить `REFILL_THRESHOLD_SYMBOLS` в импорт из `@/lib/session-config`.

3b. Guard. **Порядок важен:** guard выбирает переход ДО его actions, значит `needsRefill` читает `completed` ДО `pushCompleted` — символ ТЕКУЩЕГО `TYPING.ADVANCED` ещё не учтён. Считаем остаток с поправкой на этот не-ещё-добавленный символ (`+1`):

```ts
    needsRefill: ({ context }) =>
      context.totalAppended - (context.completed.length + 1) <= REFILL_THRESHOLD_SYMBOLS,
```

3c. В Task 3 обработчики `KEY_PRESS`/`TYPING.ADVANCED` уже лежат в подсостояниях (`running`/`draining`), не на `active.on`. Здесь только: (1) `running.on['TYPING.ADVANCED']` → массив (нижняя вода → `refilling` с чекпоинтом, иначе `pushCompleted`); (2) добавить подсостояние `refilling`. `draining` из Task 3 уже несёт `KEY_PRESS`/`TYPING.ADVANCED` — не трогаем.

`running` — заменить ТОЛЬКО обработчик `TYPING.ADVANCED` (остальные `KEY_PRESS`/`TICK`/`TIMER_EXPIRED`/`PAUSE_TIMER` из Task 3 остаются):

```ts
            'TYPING.ADVANCED': [
              { guard: 'needsRefill', target: 'refilling', actions: ['pushCompleted', 'checkpointAndRecord'] },
              { actions: 'pushCompleted' },
            ],
```

`refilling` — новое подсостояние рядом с `running`/`paused`/`draining`:

```ts
        refilling: {
          invoke: {
            id: 'refetch',
            src: 'fetchDrills',
            input: ({ context }) => ({
              symbolLayoutId: context.symbolLayoutId,
              openedSteps: context.openedSteps,
              budgetChars: computeBudgetChars({ secondsRemaining: SESSION_DURATION_SECONDS, cpm: context.cpm }),
            }),
            onDone: { target: 'running', actions: 'appendFetched' },
            onError: { target: 'running' }, // не удалось добрать — продолжаем тем, что есть
          },
          on: {
            // Печать не блокируется во время добора; пауза — как везде.
            KEY_PRESS: { actions: 'forwardKeyPress' },
            'TYPING.ADVANCED': { actions: 'pushCompleted' },
            PAUSE_TIMER: { target: 'paused', actions: 'accumulateElapsed' },
          },
        },
```

> Почему обработчики в подсостояниях, а не на `active.on`: при совпадении события у предка (`active`) и потомка (`running`) XState берёт ПОТОМКА, предка НЕ выполняет (most-nested wins, не аддитивно). Останься `TYPING.ADVANCED` на `active` — он бы затенялся в печатающих подсостояниях и **пропадал в `paused`** (потеря продвижения). Поэтому ещё с Task 3 он объявлен явно в каждом печатающем подсостоянии (`running`/`refilling`/`draining`), а `paused` его сознательно не имеет (на паузе печать заблокирована).

3d. Действие `appendFetched` — дописать собранное в training и учесть в `totalAppended`:

```ts
    appendFetched: enqueueActions(({ event, enqueue }) => {
      const symbols = (event as { output: StreamSymbol[] }).output;
      enqueue.sendTo('training', { type: 'APPEND_SYMBOLS', symbols });
      enqueue.assign({ totalAppended: ({ context }) => context.totalAppended + symbols.length });
    }),
```

> `sendTo('training', …)` адресует прямого ребёнка `active.invoke#training` — валидно из подсостояния `refilling`.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run src/machines/session.machine.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Регрессия + типы**

Run: `make check` → 0 ошибок.
Run: `npx vitest run --project src` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/machines/session.machine.ts src/machines/session.machine.test.ts
git commit -m "feat(session): refill mid-session — нижняя вода, чекпоинт перед добором, APPEND"
```

---

## Task 8: Канон — термины и пометки

Фиксируем язык в `CONTEXT.md`, чтобы код и доки не разошлись.

**Files:**
- Modify: `CONTEXT.md`
- Modify: `docs/plans/auto-flow.md` (отметить статус этапа)

- [ ] **Step 1: Литеральные правки `CONTEXT.md`**

Не пересказ, а точечные замены. Строки — как сейчас (`grep` по «before», т.к. номера могут сдвинуться). Текущая модель «одна сессия = один drill» и «завершение на границе drill'а» противоречит непрерывному потоку — вычистить все следы.

**1a. Session (строки 17-19).**
before:
```
Ограниченный таймером отрезок тренировки, внутри которого непрерывно подаются drill'ы; длительность — настройка пользователя; завершается по истечении таймера на границе текущего drill'а.
_Avoid_: lesson (внутреннее имя завершения одного drill'а в training.machine), урок
```
after:
```
Ограниченный таймером отрезок тренировки: drill'ы склеиваются в непрерывный `TypingStream`, который пользователь печатает без видимых границ; длительность — настройка; по истечении таймера фаза `draining` даёт допечатать очередь, затем конец.
_Avoid_: lesson, урок; «граница drill'а» как точка завершения (границ в потоке нет)
```

**1b. Thermostat (строка 49).** `срабатывает на fetch-границах` → `срабатывает на чекпоинтах (перед дозагрузкой и в конце сессии)`.

**1c. DrillSummary (строки 89-90).**
before:
```
**DrillSummary (сводка drill'а)**:
Компактная дельта завершённого drill'а (по затронутым ячейкам: предъявления, чистые, латентности), вычисляемая чистой функцией `stream → DrillSummary` на клиенте: вычитает проскок, исключает первый символ drill'а из латентности, обрезает паузы; payload мутации `recordDrill`.
```
after:
```
**DrillSummary (сводка отрезка потока)**:
Компактная дельта отрезка `TypingStream` с прошлого чекпоинта (по затронутым ячейкам: предъявления, чистые, латентности), вычисляемая чистой функцией `stream → DrillSummary` на клиенте: вычитает проскок, исключает первый символ отрезка из латентности, обрезает паузы; payload мутации `drillRecord`.
```

**1d. Aggregator (строка 94).** `срабатывает на каждом завершении drill'а` → `срабатывает на чекпоинтах (перед дозагрузкой и в конце сессии)`.

**1e. Relationships — клиент/сервер (строка 110).**
before: `Вся адаптивная логика (apply-агрегатор, Analyzer, Thermostat, построитель заявки, подбор) — серверная, внутри `recordDrill` / `getNextBatch`; клиенту остаются training machine, таймер, буфер и `summarize``
after: `Вся адаптивная логика (apply-агрегатор, Analyzer, Thermostat, построитель заявки, подбор) — серверная, внутри `drillRecord` / `drillNext`; клиенту остаются `sessionMachine` (таймер, очередь, чекпоинты), training machine и `summarize``

**1f. DrillRequest (строка 111).** `внутренний артефакт серверного `getNextBatch`` → `внутренний артефакт серверного `drillNext``

**1g. Session-связь (строка 113).**
before: `**Session** — ограниченная таймером последовательность **Drill**'ов; выносливость — свойство Session (таймер), не drill'а`
after: `**Session** — ограниченный таймером непрерывный `TypingStream`, склеенный из **Drill**'ов (границы невидимы); выносливость — свойство Session (таймер), не drill'а`

**1h. Aggregator/Analyzer-связь (строка 115) — заменить ВСЮ строку (в ней два устаревших клочка).**
before: `**Aggregator** обновляет **Skill Profile** на каждом завершении drill'а; **Analyzer** строит **Weakness Map** лениво — на старте сессии и при дополнении буфера`
after: `**Aggregator** обновляет **Skill Profile** на чекпоинтах (перед дозагрузкой и в конце сессии); **Analyzer** строит **Weakness Map** лениво — на старте сессии и при дозагрузке (refill)`

**1i. Flagged ambiguities (строка 141).**
before: `«lesson» vs «session» — **разрешено**: Session = ограниченный таймером отрезок из многих drill'ов; `lessonComplete` в `training.machine` — внутреннее имя завершения одного drill'а (деталь реализации). Текущее «одна сессия = один drill» — переходное состояние (backlog «Session vs drill»).`
after: `«lesson» vs «session» — **разрешено**: Session = ограниченный таймером непрерывный поток из многих drill'ов. `lessonComplete` снят (sessionMachine, план `docs/plans/2026-06-17-session-machine.md`): завершение решает таймер сессии, не длина потока; «одна сессия = один drill» больше не действует.`

**1j. Новые термины — добавить в раздел `### Подбор` (после DrillSummary/Aggregator):**
```
**Checkpoint (чекпоинт)**:
Точка, где клиент берёт сводку напечатанного отрезка `TypingStream` (`drillSummarize`) и шлёт `drillRecord`: перед каждой дозагрузкой (refill) и в конце сессии. Не per-drill — границ drill'ов в потоке нет.

**previousCheckpoint**:
Позиция курсора прошлого чекпоинта — граница «докуда сведено» в проекции `completed[]`; следующий чекпоинт сводит `[previousCheckpoint .. курсор)` и сдвигает границу.

**Refill (дозагрузка)**:
Долив очереди, когда непройденный хвост короче порога (`REFILL_THRESHOLD_SYMBOLS`); момент, где `drillNext` перечитывает свежий профиль — адаптация внутри сессии.

**Draining (допечатка)**:
Фаза после истечения таймера: дозагрузки нет, очередь допечатывается, затем конец (со страховочным таймаутом — не зависает).
```

**1k. Пометка к Drill (рядом со строкой 9-11)** — добавить в `_Avoid_` Drill: `; «drill» как имя печатаемого потока (печатаемое = непрерывный `TypingStream`, границы drill'ов невидимы — пробел внутри неотличим от стыка)`.

> Опционально (отдельным решением): выровнять `getNextBatch`/`recordDrill` → `drillNext`/`drillRecord` в `docs/adr/0005`/`0006`, либо оставить как исторические записи решения. Не блокирует.

- [ ] **Step 2: Статус этапа в `auto-flow.md`**

Отметить «Рабочая петля / тонкий клиент» как реализованную (`sessionMachine`, refill, чекпоинт-запись). Сослаться на этот план файлом.

- [ ] **Step 3: Spell + финальная проверка**

Run: `make spell`
Если красный — `/fix-spell` (Haiku разберёт по правилам CLAUDE.md; кальки переписать, не добавлять в whitelist).

Run: `make check-all`
Expected: lint + check + test + spell + build — всё зелёное.

- [ ] **Step 4: Commit**

```bash
git add CONTEXT.md docs/plans/auto-flow.md
git commit -m "docs(auto-flow): термины сессии в канон — Session, previousCheckpoint, checkpoint, draining"
```

---

## Открытые развилки (решить по ходу, не блокируют)

1. **Значение страховочного таймаута `DRAIN_CAP_MS`:** зависание закрыто (таймаут + `allTyped` в `draining`, задача 3); открыт лишь подбор числа (сейчас 4с) — сколько давать допечатать хвост после истечения таймера. Настроить после ручной обкатки задачи 5.
2. **Источники `openedSteps`/`cpm`:** пока константы (`session-config.ts`). `openedSteps` → `skillProfiles` (сервер, авторизация), `cpm` → настройки. Подключить отдельным шагом после задачи 6 (нужен query профиля на клиент при старте сессии).
3. **Стартовая заглушка `loading`:** мелькающий пустой кадр до первого fetch. Если мешает — добавить явный «собираем порцию…» (мелкая UI-правка).
4. **Длительность сессии vs окно бюджета:** сейчас бюджет считается под `SESSION_DURATION_SECONDS`; с refill сессия может пережить несколько окон. Развести при настройке чисел.

## Self-review заметки

- Имена сверены: `fetchDrills`/`recordCheckpoint` (провайдеры), `KEY_PRESS`/`TYPING.ADVANCED`/`APPEND_SYMBOLS`/`PAUSE_TIMER`/`RESUME_TIMER`/`TIMER_EXPIRED`/`TICK` (события), `completed`/`previousCheckpoint`/`totalAppended`/`displayElapsedMs`/`elapsedMs`/`segmentStartedAt`/`pendingStream` (контекст), `isExpired`/`allTyped`/`needsRefill` (guards), `drainCap` (delay), `checkpointAndRecord`/`appendFetched`/`pushCompleted`/`storeFetched`/`forwardKeyPress`/`accumulateElapsed`/`refreshDisplay`/`markSegmentStart`/`sendComplete` (actions) — единообразны между задачами 3 и 7.
- Покрытие: непрерывность движка (T2), сборка/склейка (T1/T6), таймер+пауза+конец (T3), интеграция в корень + dev-захват (T4), UI+таймер (T5), сервер+запись (T6), refill+адаптация (T7), канон (T8).
- **Учтённые замечания первого прохода (5 агентов):** пауза блокирует и печать (форвард `KEY_PRESS`/`TYPING.ADVANCED` только в `running`/`refilling`/`draining`, не на `active.on`) — препятствие 1; миграция `typing-capture.ts` (задача 4b) — препятствие 2; страховочный таймаут `DRAIN_CAP_MS` против зависания `draining` — препятствие 3; точные удаляемые проверки + изоляция теста appMachine заглушкой — важное 4; `needsRefill` с `+1`-поправкой (guard читает pre-push) + граничный тест — важное 5; литеральные правки `CONTEXT.md` с `file:line` — важное 6. Подтверждено чистым: схема проверки `drillRecord` == `DrillSummary`, все XState-конструкции v5, реактивность UI над внуком, домен (нет протечки `drill`, ADR 0006).
- **Второй проход (4 агента):** заглушка `sessionService` в тесте appMachine — МАШИНА (`createMachine`, не `fromCallback`: callback-логика не присваивается типу зарегистрированной машины → red в `make check`); `parentActor` обязателен в `SessionInput` → болванка-родитель в `INPUT` всех тестов сессии + сток-родитель для реальной проверки `SESSION.COMPLETE`; строка 115 `CONTEXT.md` правится целиком (второй устаревший клочок — `Analyzer … при дополнении буфера`); серверный `contentGap` (пустой пул, не throw) деградирует на корпус. Подтверждено: все препятствия/важное первого прохода исправлены корректно (FIXES-CORRECT), 11 before-якорей Task 8 совпадают дословно, остальных забытых потребителей нет.
- TDD: каждая логическая задача — red → green → commit; UI (T5) и серверная обвязка проверяются `make check` + ручным smoke (unit-тест сети не гоняем).
- **Учтённые замечания первого прохода (5 агентов):** пауза блокирует и печать (форвард `KEY_PRESS`/`TYPING.ADVANCED` только в `running`/`refilling`/`draining`, не на `active.on`) — препятствие 1; миграция `typing-capture.ts` (задача 4b) — препятствие 2; страховочный таймаут `DRAIN_CAP_MS` против зависания `draining` — препятствие 3; точные удаляемые проверки + изоляция теста appMachine заглушкой — важное 4; `needsRefill` с `+1`-поправкой (guard читает pre-push) + граничный тест — важное 5; литеральные правки `CONTEXT.md` с `file:line` — важное 6. Подтверждено чистым: схема проверки `drillRecord` == `DrillSummary`, все XState-конструкции v5, реактивность UI над внуком, домен (нет протечки `drill`, ADR 0006).
- **Второй проход (4 агента):** заглушка `sessionService` в тесте appMachine — МАШИНА (`createMachine`, не `fromCallback`: callback-логика не присваивается типу зарегистрированной машины → red в `make check`); `parentActor` обязателен в `SessionInput` → болванка-родитель в `INPUT` всех тестов сессии + сток-родитель для реальной проверки `SESSION.COMPLETE`; строка 115 `CONTEXT.md` правится целиком (второй устаревший клочок — `Analyzer … при дополнении буфера`); серверный `contentGap` (пустой пул, не throw) деградирует на корпус. Подтверждено: все препятствия/важное первого прохода исправлены корректно (FIXES-CORRECT), 11 before-якорей Task 8 совпадают дословно, остальных забытых потребителей нет.
