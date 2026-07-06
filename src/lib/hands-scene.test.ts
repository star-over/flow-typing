import { describe, expect, it } from 'vitest';

import {
  fingerLayout,
  handsSceneFixtures,
  keyboardGraph,
  keyCoordinateMap,
  simple_k,
} from '@/fixtures/hands-scene';

import { createHandsSceneViewModel, sealHandsSceneViewModel } from './hands-scene';
import type { HandsSceneViewModelDraft } from './hands-scene';

describe('createHandsSceneViewModel', () => {
  it.each(handsSceneFixtures)('builds view model for $label', ({ fixture }) => {
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: fixture.input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(fixture.expectedOutput);
  });

  it('красит цель в CORRECT после ВЕРНОГО нажатия (для «призрака» завершённого кластера)', () => {
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: {
        targetSymbol: 'k',
        targetKeyCaps: ['KeyK'],
        attempts: [{ pressedKeyCaps: ['KeyK'], startAt: 0, endAt: 0 }],
      },
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    const r3 = viewModel.R3;
    expect(r3.navigationRole).toBe('TARGET');
    if (r3.navigationRole === 'TARGET') {
      expect(r3.keyCapStates.KeyK?.pressResult).toBe('CORRECT');
    }
  });
});

describe('sealHandsSceneViewModel (правило «Полного Кластера»)', () => {
  // simple_k: R3 — TARGET (с keyCapStates), L1 — NONE (без). Ломаем по одному инвариант.
  const validDraft = (): HandsSceneViewModelDraft =>
    structuredClone(simple_k.expectedOutput);

  it('returns the model unchanged when the invariant holds', () => {
    expect(sealHandsSceneViewModel(validDraft())).toEqual(simple_k.expectedOutput);
  });

  it('throws when a TARGET finger has no keyCapStates', () => {
    const draft = validDraft();
    delete draft.R3.keyCapStates;
    expect(() => sealHandsSceneViewModel(draft)).toThrow(/R3/);
  });

  it('throws when a non-TARGET finger carries keyCapStates', () => {
    const draft = validDraft();
    draft.L1.keyCapStates = {};
    expect(() => sealHandsSceneViewModel(draft)).toThrow(/L1/);
  });
});
