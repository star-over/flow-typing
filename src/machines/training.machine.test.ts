import { describe, expect, it } from 'vitest';
import { assign, createActor, createMachine, sendTo, type SnapshotFrom } from 'xstate';

import type { KeyCapId, StreamAttempt, TypingStream } from '@/interfaces/types';
import type { UserPreferences } from '@/interfaces/user-preferences';

import { trainingMachine } from './training.machine';

type TrainingSnapshot = SnapshotFrom<typeof trainingMachine>;

interface TestParentContext {
  completedStream: TypingStream | null;
}
type TestParentEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] }
  | { type: 'TRAINING.COMPLETE'; stream: TypingStream };

function makeTestParent(
  stream: TypingStream,
  symbolLayoutId: UserPreferences['symbolLayoutId'] = 'qwerty'
) {
  return createMachine({
    id: 'testParent',
    initial: 'active',
    context: { completedStream: null } as TestParentContext,
    types: {} as { context: TestParentContext; events: TestParentEvent },
    invoke: {
      id: 'training',
      src: trainingMachine,
      input: ({ self }) => ({ stream, symbolLayoutId, parentActor: self }),
    },
    on: {
      KEY_PRESS: {
        actions: sendTo('training', ({ event }) => ({
          type: 'KEY_PRESS',
          keys: event.keys,
        })),
      },
      'TRAINING.COMPLETE': {
        actions: assign({ completedStream: ({ event }) => event.stream }),
      },
    },
    states: { active: {} },
  });
}

// Возвращаем типизированный snapshot trainingMachine — это даёт точные литералы
// state name в .matches(), .value и context. Без приведения snapshot был бы
// generic и принимал бы любую строку (например, matches('lessonComplete') прошёл бы
// typecheck — тот самый класс ошибок, который мы здесь страхуем).
function getChild(actor: ReturnType<typeof createActor>): TrainingSnapshot {
  return actor.getSnapshot().children.training!.getSnapshot() as TrainingSnapshot;
}

describe('trainingMachine', () => {
  it('starts in awaitingInput with fresh context', () => {
    const stream: TypingStream = [
      { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();

    const child = getChild(actor);
    expect(child.value).toBe('awaitingInput');
    expect(child.context.currentIndex).toBe(0);
    expect(child.context.errors).toBe(0);
    expect(child.context.stream).toEqual(stream);
    expect(child.context.symbolAppearanceTime).toBeGreaterThan(0);
  });

  it('on correct input: advances index, records attempt, returns to awaitingInput', () => {
    const stream: TypingStream = [
      { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
      { targetSymbol: 'b', targetKeyCaps: ['KeyB'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });

    const child = getChild(actor);
    expect(child.value).toBe('awaitingInput');
    expect(child.context.currentIndex).toBe(1);
    expect(child.context.errors).toBe(0);
    expect(child.context.stream[0]!.attempts).toHaveLength(1);
    expect(child.context.stream[0]!.attempts[0]!.pressedKeyCaps).toEqual(['KeyA']);
    expect(child.context.stream[1]!.attempts).toHaveLength(0);
  });

  it('on incorrect input: records attempt, increments errors, does NOT advance index', () => {
    const stream: TypingStream = [
      { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] });

    const child = getChild(actor);
    expect(child.value).toBe('awaitingInput');
    expect(child.context.currentIndex).toBe(0);
    expect(child.context.errors).toBe(1);
    expect(child.context.stream[0]!.attempts).toHaveLength(1);
    expect(child.context.stream[0]!.attempts[0]!.pressedKeyCaps).toEqual(['KeyB']);
  });

  it('accumulates attempts across errors then success on the same symbol', () => {
    const stream: TypingStream = [
      { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] }); // error
    actor.send({ type: 'KEY_PRESS', keys: ['KeyC'] }); // error
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // correct

    const child = getChild(actor);
    expect(child.context.errors).toBe(2);
    expect(child.context.currentIndex).toBe(1);
    expect(child.context.stream[0]!.attempts.map((a: StreamAttempt) => a.pressedKeyCaps)).toEqual([
      ['KeyB'],
      ['KeyC'],
      ['KeyA'],
    ]);
  });

  it('treats chord with reversed key order as correct (areKeyCapIdArraysEqual is order-agnostic)', () => {
    const stream: TypingStream = [
      { targetSymbol: 'A', targetKeyCaps: ['ShiftLeft', 'KeyA'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA', 'ShiftLeft'] });

    const child = getChild(actor);
    expect(child.context.currentIndex).toBe(1);
    expect(child.context.errors).toBe(0);
  });

  it('treats chord with subset / superset as incorrect', () => {
    const stream: TypingStream = [
      { targetSymbol: 'A', targetKeyCaps: ['ShiftLeft', 'KeyA'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // missing shift
    actor.send({ type: 'KEY_PRESS', keys: ['ShiftLeft', 'KeyA', 'AltLeft'] }); // extra modifier

    const child = getChild(actor);
    expect(child.context.errors).toBe(2);
    expect(child.context.currentIndex).toBe(0);
  });

  it('reaches lessonComplete after last symbol and sends TRAINING.COMPLETE to parent with full stream', () => {
    const stream: TypingStream = [
      { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
      { targetSymbol: 'b', targetKeyCaps: ['KeyB'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] });

    const parentSnap = actor.getSnapshot();
    expect(parentSnap.context.completedStream).not.toBeNull();
    expect(parentSnap.context.completedStream).toHaveLength(2);
    expect(parentSnap.context.completedStream![0]!.attempts[0]!.pressedKeyCaps).toEqual(['KeyA']);
    expect(parentSnap.context.completedStream![1]!.attempts[0]!.pressedKeyCaps).toEqual(['KeyB']);

    const child = getChild(actor);
    expect(child.value).toBe('lessonComplete');
    expect(child.context.currentIndex).toBe(2);
  });

  // Регрессионный тест на инвариант, который используется в TrainingScene.svelte:
  //   isTyping={!trainingState.matches('lessonComplete')}
  // Машина имеет ровно 5 состояний: awaitingInput, processingInput, correctInput,
  // incorrectInput, lessonComplete. До исправления setup() здесь использовалась
  // строка 'running' — литерал, которого в этой машине нет (это state app.machine).
  // matches('lessonComplete') всегда возвращал false, isTyping был сломан незаметно.
  // Сейчас .matches('lessonComplete') проверяется по литеральному union типу:
  // любой неверный state name (включая 'running') свалит typecheck.
  it("matches('lessonComplete') = false до последнего символа, true после", () => {
    const stream: TypingStream = [
      { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
      { targetSymbol: 'b', targetKeyCaps: ['KeyB'], attempts: [] },
    ];
    const actor = createActor(makeTestParent(stream));
    actor.start();

    expect(getChild(actor).matches('lessonComplete')).toBe(false);

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    expect(getChild(actor).matches('lessonComplete')).toBe(false);

    actor.send({ type: 'KEY_PRESS', keys: ['KeyZ'] }); // error — не должно завершить
    expect(getChild(actor).matches('lessonComplete')).toBe(false);

    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] });
    expect(getChild(actor).matches('lessonComplete')).toBe(true);
  });

  it('records startAt/endAt timestamps on each attempt within wall-clock window', () => {
    const stream: TypingStream = [
      { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
    ];
    const before = Date.now();
    const actor = createActor(makeTestParent(stream));
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    const after = Date.now();

    const child = getChild(actor);
    const attempt = child.context.stream[0]!.attempts[0]!;
    expect(attempt.startAt).toBeGreaterThanOrEqual(before);
    expect(attempt.endAt).toBeLessThanOrEqual(after);
    expect(attempt.endAt!).toBeGreaterThanOrEqual(attempt.startAt!);
  });
});
