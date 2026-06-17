import { describe, expect, it, vi } from 'vitest';
import { assign, createActor, createMachine, fromPromise, type SnapshotFrom } from 'xstate';

import type { KeyCapId, StreamSymbol, TypingStream } from '@/interfaces/types';
import { sessionMachine } from './session.machine';
import { trainingMachine } from './training.machine';

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

function getTraining(actor: ReturnType<typeof createActor>): SnapshotFrom<typeof trainingMachine> | null {
  const child = actor.getSnapshot().children.training;
  return child ? (child.getSnapshot() as SnapshotFrom<typeof trainingMachine>) : null;
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
    // дать микротаскам отработать
    await Promise.resolve();
    const snap = actor.getSnapshot() as SessionSnapshot;
    expect(snap.context.completed).toHaveLength(0);
    expect(getTraining(actor)!.context.currentIndex).toBe(0);
  });

  it('по допечатке всей очереди после истечения таймера → done + SESSION.COMPLETE родителю', async () => {
    // Истечение симулируем коротким окном: подадим TIMER_EXPIRED напрямую.
    const onRecord = vi.fn();
    // Сток-родитель: ловит SESSION.COMPLETE. Без него sendComplete уходит в self
    // (XState-фоллбэк при отсутствии parentActor) и «родителю» НЕ проверяется.
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
