import { createActor, createMachine } from 'xstate';
import { describe, expect, it } from 'vitest';

import { inState } from './state-utils';

// Минимальная машина с вложенным состоянием — достаточно, чтобы прогнать
// `inState` через плоское и составное значение (`{ running: 'fast' }`).
const machine = createMachine({
  id: 'probe',
  initial: 'idle',
  states: {
    idle: { on: { GO: 'running' } },
    running: {
      initial: 'fast',
      states: {
        fast: { on: { SLOW: 'slow' } },
        slow: {},
      },
    },
  },
});

const snapshotAfter = (...events: string[]) => {
  const actor = createActor(machine).start();
  for (const type of events) actor.send({ type });
  return actor.getSnapshot();
};

describe('inState', () => {
  it('matches a flat state value', () => {
    const snapshot = snapshotAfter();
    expect(inState({ snapshot, value: 'idle' })).toBe(true);
    expect(inState({ snapshot, value: 'running' })).toBe(false);
  });

  it('matches a nested state value', () => {
    const snapshot = snapshotAfter('GO');
    expect(inState({ snapshot, value: 'running' })).toBe(true);
    expect(inState({ snapshot, value: { running: 'fast' } })).toBe(true);
    expect(inState({ snapshot, value: { running: 'slow' } })).toBe(false);
    expect(inState({ snapshot, value: 'idle' })).toBe(false);
  });

  it('follows transitions into a deeper leaf', () => {
    const snapshot = snapshotAfter('GO', 'SLOW');
    expect(inState({ snapshot, value: { running: 'slow' } })).toBe(true);
    expect(inState({ snapshot, value: { running: 'fast' } })).toBe(false);
  });
});
