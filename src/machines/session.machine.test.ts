import { describe, expect, it, vi } from 'vitest';
import { assign, createActor, createMachine, fromPromise, type SnapshotFrom } from 'xstate';

import type { KeyCapId, StreamSymbol, TypingStream } from '@/interfaces/types';
import { REFILL_THRESHOLD_SYMBOLS } from '@/lib/session-config';
import { sessionMachine } from './session.machine';
import type { trainingMachine } from './training.machine';

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
const INPUT = { symbolLayoutId: 'qwerty' as const, cpm: 200, parentActor: noopParent };

// Активная печать живёт в active.timing.running (тикер и сегмент таймера — на
// родителе timing, чтобы пережить bounce running↔refilling).
const RUNNING = { active: { timing: 'running' } } as const;

function getTraining(actor: ReturnType<typeof createActor>): SnapshotFrom<typeof trainingMachine> | null {
  const child = actor.getSnapshot().children.training;
  return child ? (child.getSnapshot() as SnapshotFrom<typeof trainingMachine>) : null;
}

describe('sessionMachine', () => {
  it('после loading заходит в active.timing.running и invoke\'ит training с собранным потоком', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => {
      const snap = actor.getSnapshot() as SessionSnapshot;
      expect(snap.matches(RUNNING)).toBe(true);
    });
    expect(getTraining(actor)!.context.stream.map((s: StreamSymbol) => s.targetSymbol)).toEqual(['a', 'b']);
  });

  it('накапливает completed[] из TYPING.ADVANCED по мере печати', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    await vi.waitFor(() =>
      expect((actor.getSnapshot() as SessionSnapshot).context.completed.map((s) => s.targetSymbol)).toEqual(['a'])
    );
  });

  it('пауза замораживает таймер: elapsedMs не растёт через paused', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    actor.send({ type: 'PAUSE_TIMER' });
    expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'paused' })).toBe(true);
    const frozen = (actor.getSnapshot() as SessionSnapshot).context.elapsedMs;
    actor.send({ type: 'RESUME_TIMER' });
    expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true);
    expect((actor.getSnapshot() as SessionSnapshot).context.elapsedMs).toBe(frozen);
  });

  it('на паузе печать заблокирована: KEY_PRESS не двигает курсор, completed не растёт', async () => {
    const actor = createActor(makeSession(), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    actor.send({ type: 'PAUSE_TIMER' });
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // во время паузы — игнор
    // дать микрозадачам отработать
    await Promise.resolve();
    const snap = actor.getSnapshot() as SessionSnapshot;
    expect(snap.context.completed).toHaveLength(0);
    expect(getTraining(actor)!.context.currentIndex).toBe(0);
  });

  it('после истечения таймера допечатывается очередь → done + SESSION.COMPLETE родителю', async () => {
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
              got: ({ context, event }) => [...context.got, (event as unknown as { stream: TypingStream }).stream],
            }),
          },
        },
      }),
    ).start();
    const actor = createActor(makeSession({ onRecord }), { input: { ...INPUT, parentActor: sink } });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    // Истекаем ДО печати — тогда refill не срабатывает (нет TYPING.ADVANCED), и
    // тест проверяет чистый сценарий «допечатать очередь после истечения» с
    // единственным (финальным) чекпоинтом.
    actor.send({ type: 'TIMER_EXPIRED' });
    expect((actor.getSnapshot() as SessionSnapshot).matches({ active: 'draining' })).toBe(true);

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // допечатываем [a, b]
    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] });
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches('done')).toBe(true));
    expect(onRecord).toHaveBeenCalledTimes(1); // единственный (финальный) чекпоинт
    expect(sink.getSnapshot().context.got).toHaveLength(1); // родитель получил SESSION.COMPLETE
    expect(sink.getSnapshot().context.got[0]).toHaveLength(2); // полный набранный поток [a, b]
  });

  it('истёкший таймер при уже допечатанном потоке → сразу done', async () => {
    // Однобуквенный поток: печать 'a' запускает refill (порог 40 ≫ 1). Чтобы
    // refill был безвреден (не раздул totalAppended), добор возвращает [].
    let call = 0;
    const providedSession = sessionMachine.provide({
      actors: {
        fetchDrills: fromPromise(async () => {
          call += 1;
          return call === 1 ? [sym('a', 'KeyA')] : [];
        }),
      },
      actions: { recordCheckpoint: () => {} },
    });
    const actor = createActor(providedSession, { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // всё набрано (refill вернёт [], totalAppended=1)
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).context.completed).toHaveLength(1));
    actor.send({ type: 'TIMER_EXPIRED' });
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches('done')).toBe(true));
  });

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
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // допечатали хвост → refill
    await vi.waitFor(() => {
      const training = actor.getSnapshot().children.training!.getSnapshot();
      expect((training as SnapshotFrom<typeof trainingMachine>).context.stream.length).toBeGreaterThan(1); // дописан 'b'
    });
    expect(onRecord).toHaveBeenCalled(); // чекпоинт перед добором
  });

  it('refill срабатывает ровно на пороге (+1-поправка), не раньше', async () => {
    const onRecord = vi.fn();
    // Поток длиной ровно порог+2: needsRefill ложен на 1-м продвижении (остаётся
    // 41 > 40) и истинен на 2-м (остаток упал бы до 40). Добор возвращает [].
    const big: TypingStream = Array.from({ length: REFILL_THRESHOLD_SYMBOLS + 2 }, () => sym('a', 'KeyA'));
    let call = 0;
    const providedSession = sessionMachine.provide({
      actors: {
        fetchDrills: fromPromise(async () => {
          call += 1;
          return call === 1 ? big : [];
        }),
      },
      actions: { recordCheckpoint: (_, p) => onRecord((p as { summary: unknown }).summary) },
    });
    const actor = createActor(providedSession, { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // 1-й символ: остаётся 41 > 40 → НЕ refill
    await Promise.resolve();
    expect(onRecord).not.toHaveBeenCalled();

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // 2-й: остаток упал бы до 40 → refill (чекпоинт)
    await vi.waitFor(() => expect(onRecord).toHaveBeenCalled());
  });
});
