import { describe, expect, it } from 'vitest';

import {
  fingerLayout,
  handsSceneFixtures,
  keyboardGraph,
  simple_k,
  symbolLayout,
} from '@/fixtures/hands-scene';

import { createHandsSceneViewModel, sealHandsSceneViewModel } from './hands-scene';
import type { HandsSceneViewModelDraft } from './hands-scene';

describe('createHandsSceneViewModel', () => {
  it.each(handsSceneFixtures)('builds view model for $label', ({ fixture }) => {
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: fixture.input,
      fingerLayout,
      symbolLayout,
      keyboardGraph,
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
      symbolLayout,
      keyboardGraph,
    });
    const r3 = viewModel.R3;
    expect(r3.navigationRole).toBe('TARGET');
    if (r3.navigationRole === 'TARGET') {
      expect(r3.keyCapStates.KeyK?.pressResult).toBe('CORRECT');
    }
  });
});

describe('buildVisibleClusters — фильтр не-символьных клавиш (шум мизинца)', () => {
  it('прячет модификаторы/системные клавиши в кластере мизинца, оставляя символьные', () => {
    // Цель «q» → L5 TARGET. Кластер L5 содержит Tab/CapsLock/ShiftLeft/Control/Meta/Alt —
    // визуальный шум без символа в раскладке.
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: { targetSymbol: 'q', targetKeyCaps: ['KeyQ'], attempts: [] },
      fingerLayout,
      symbolLayout,
      keyboardGraph,
    });
    const l5 = viewModel.L5;
    if (l5.navigationRole !== 'TARGET') throw new Error('expected L5 to be TARGET');
    expect(Object.keys(l5.keyCapStates).sort()).toEqual(
      ['Backquote', 'Digit1', 'KeyQ', 'KeyA', 'KeyZ'].sort(),
    );
    for (const noise of ['Tab', 'CapsLock', 'ShiftLeft', 'ControlLeft', 'MetaLeft', 'AltLeft']) {
      expect(l5.keyCapStates).not.toHaveProperty(noise);
    }
    // Целевая клавиша остаётся видимой.
    expect(l5.keyCapStates.KeyQ?.navigationRole).toBe('TARGET');
  });

  it('оставляет целевую клавишу-модификатор на мизинце (Shift-аккорд)', () => {
    // «F» = KeyF + ShiftRight. На R5 сама ЦЕЛЬ — модификатор ShiftRight (символа не несёт),
    // фильтр обязан её сохранить; прочий шум R5 (Enter, Backspace, Control…) прячется.
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: { targetSymbol: 'F', targetKeyCaps: ['KeyF', 'ShiftRight'], attempts: [] },
      fingerLayout,
      symbolLayout,
      keyboardGraph,
    });
    const r5 = viewModel.R5;
    if (r5.navigationRole !== 'TARGET') throw new Error('expected R5 to be TARGET');
    expect(r5.keyCapStates.ShiftRight?.navigationRole).toBe('TARGET');
    for (const noise of ['Backspace', 'Enter', 'ControlRight', 'MetaRight', 'AltRight', 'Fn', 'ContextMenu']) {
      expect(r5.keyCapStates).not.toHaveProperty(noise);
    }
    // Символьная клавиша кластера сохраняется.
    expect(r5.keyCapStates.Semicolon).toBeDefined();
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

  it('throws when a TARGET finger has no navigationPath', () => {
    const draft = validDraft();
    delete draft.R3.navigationPath;
    expect(() => sealHandsSceneViewModel(draft)).toThrow(/R3/);
  });

  it('throws when a non-TARGET finger carries navigationPath', () => {
    const draft = validDraft();
    draft.L1.navigationPath = [];
    expect(() => sealHandsSceneViewModel(draft)).toThrow(/L1/);
  });
});
