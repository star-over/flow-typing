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

  it('аккорд с обратным порядком клавиш — верно (areKeyCapIdArraysEqual порядко-независим)', () => {
    const stream: TypingStream = [{ targetSymbol: 'A', targetKeyCaps: ['ShiftLeft', 'KeyA'], attempts: [] }];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA', 'ShiftLeft'] });
    const child = getChild(actor);
    expect(child.context.currentIndex).toBe(1);
    expect(child.context.errors).toBe(0);
  });

  it('аккорд subset / superset — ошибка', () => {
    const stream: TypingStream = [{ targetSymbol: 'A', targetKeyCaps: ['ShiftLeft', 'KeyA'], attempts: [] }];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // нет Shift
    actor.send({ type: 'KEY_PRESS', keys: ['ShiftLeft', 'KeyA', 'AltLeft'] }); // лишний модификатор
    const child = getChild(actor);
    expect(child.context.errors).toBe(2);
    expect(child.context.currentIndex).toBe(0);
  });

  it('пишет startAt/endAt таймстемпы каждой попытки в окне реального времени', () => {
    const stream: TypingStream = [sym('a', 'KeyA')];
    const before = Date.now();
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    const after = Date.now();
    const attempt = getChild(actor).context.stream[0]!.attempts[0]!;
    expect(attempt.startAt).toBeGreaterThanOrEqual(before);
    expect(attempt.endAt).toBeLessThanOrEqual(after);
    expect(attempt.endAt!).toBeGreaterThanOrEqual(attempt.startAt!);
  });
});
