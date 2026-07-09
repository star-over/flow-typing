// Тест-обвязка XState-машин: типизированный доступ к снимку ребёнка через
// продакшн-шов `selectors.ts`, провайдер сессии и сток-родитель.
//
// Здесь заперты три источника трения session-теста: (1) сырой `children.training`
// типизирован как объединение снимков всех детей — доступ требует каста; шов
// `selectTrainingActor` возвращает уже конкретный тип, поэтому тест пересекает тот
// же шов, что UI, и переименование invoke-id внутри машин не рушит тест; (2) шесть
// встроенных `.provide(...)` с ручным счётчиком `call` сведены в `provideSession`;
// (3) два ad-hoc сток-родителя `SESSION.COMPLETE` сведены в `makeCompletionSink`.
//
// Сосед — `src/fixtures/stream.ts` (фабрики доменных объектов); alias `@/fixtures/*`.
import {
  assign,
  createActor,
  createMachine,
  fromPromise,
  type Actor,
  type SnapshotFrom,
} from 'xstate';

import type { SessionSummaryPayload } from '@/lib/session-summarize';
import type { DrillSummary } from '@/lib/drill-summarize';
import type { TypingStream } from '@/interfaces/types';
import { sessionMachine } from '@/machines/session.machine';
import { selectTrainingActor } from '@/machines/selectors';
import type { trainingMachine } from '@/machines/training.machine';

type TrainingSnapshot = SnapshotFrom<typeof trainingMachine>;

/**
 * Снимок training-ребёнка через продакшн-шов `selectTrainingActor` — единственное
 * место, знающее про invoke-id `training` и приведение типа, — тот же шов, что
 * пересекает UI. `null`, пока ребёнок ещё не invoke'нут.
 */
export function trainingSnapshotOf(
  sessionActor: Actor<typeof sessionMachine>,
): TrainingSnapshot | null {
  const child = selectTrainingActor(sessionActor.getSnapshot());
  return child ? child.getSnapshot() : null;
}

/**
 * Провайдер сессии для тестов: `fetchDrills` отдаёт порции по индексу вызова
 * (за концом последовательности — пустая порция), record-действия проброшены
 * наружу вызовами. Сводит шесть встроенных `.provide(...)` с ручным `let call = 0`:
 * последовательность `[X]` = «первый вызов X, дальше пусто», `[X, Y]` = «X, затем Y».
 */
export function provideSession({
  fetchSequence,
  fetchRejects = false,
  onCheckpoint = () => {
    /* по умолчанию не наблюдаем */
  },
  onSession = () => {
    /* по умолчанию не наблюдаем */
  },
}: {
  fetchSequence: TypingStream[];
  /** Сеть недоступна: КАЖДЫЙ fetchDrills бросает (первый сбой → session.error). */
  fetchRejects?: boolean;
  onCheckpoint?: (summary: DrillSummary) => void;
  onSession?: (payload: SessionSummaryPayload) => void;
}) {
  let call = 0;
  return sessionMachine.provide({
    actors: {
      fetchDrills: fromPromise(async () => {
        if (fetchRejects) throw new Error('fetch rejected (offline fixture)');
        const batch = fetchSequence[call] ?? [];
        call += 1;
        return batch;
      }),
    },
    actions: {
      recordCheckpoint: (_, params) =>
        onCheckpoint((params as { summary: DrillSummary }).summary),
      recordSessionSummary: (_, params) =>
        onSession((params as { payload: SessionSummaryPayload }).payload),
    },
  });
}

/** Одно завершение сессии, пойманное стоком: поток и каноническая сводка. */
export interface SessionCompletion {
  stream: TypingStream;
  summary: SessionSummaryPayload | null;
}

/**
 * Сток-родитель, копящий события `SESSION.COMPLETE` и `SESSION.ERROR`. Без
 * реального родителя эти события уходят в self (запасной вариант XState при
 * отсутствии `parentActor`) и не проверяются. Сводит два ad-hoc сток-родителя:
 * тесты читают `sink.getSnapshot().context.completions` / `.errors`.
 */
export function makeCompletionSink(): Actor<ReturnType<typeof buildCompletionSinkMachine>> {
  return createActor(buildCompletionSinkMachine()).start();
}

function buildCompletionSinkMachine() {
  return createMachine({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- идиома XState v5: `types: {} as …` задаёт тип контекста
    types: {} as { context: { completions: SessionCompletion[]; errors: number } },
    context: { completions: [], errors: 0 },
    on: {
      'SESSION.COMPLETE': {
        actions: assign({
          completions: ({ context, event }) => {
            const done = event as unknown as {
              stream: TypingStream;
              summary: SessionSummaryPayload | null;
            };
            return [...context.completions, { stream: done.stream, summary: done.summary }];
          },
        }),
      },
      'SESSION.ERROR': {
        actions: assign({ errors: ({ context }) => context.errors + 1 }),
      },
    },
  });
}
