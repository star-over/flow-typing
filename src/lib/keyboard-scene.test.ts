import { describe, expect, it } from 'vitest';

import { simple_t } from '@/fixtures/hands-ext/simple_t';
import { fingerLayout, physicalLayout } from '@/fixtures/hands-ext/test-data';
import type { FingerLayout, PhysicalLayout, SymbolLayout } from '@/interfaces/types';

import { createKeyboardScene, createKeyboardSceneForFinger } from './keyboard-scene';

describe('createKeyboardScene', () => {
  const mockPhysicalLayout: PhysicalLayout = [
    { keyCapId: 'KeyA', x: 0, y: 0, w: 1, type: 'SYMBOL', label: 'a' },
    { keyCapId: 'KeyB', x: 1, y: 0, w: 1, type: 'SYMBOL', label: 'b' },
    { keyCapId: 'ShiftLeft', x: 0, y: 1, w: 2, type: 'MODIFIER', label: 'Sh L' },
  ];

  const mockSymbolLayout: SymbolLayout = [
    { symbol: 'a', keyCaps: ['KeyA'] },
    { symbol: 'b', keyCaps: ['KeyB'] },
    { symbol: 'A', keyCaps: ['KeyA', 'ShiftLeft'] },
  ];

  const mockFingerLayout: FingerLayout = [
    { keyCapId: 'KeyA', fingerId: 'L1', isHomeKey: true },
    { keyCapId: 'KeyB', fingerId: 'L2' },
    { keyCapId: 'ShiftLeft', fingerId: 'L5' },
  ];

  it('should create a KeyboardSceneViewModel grouped by y into rows', () => {
    const keyboardScene = createKeyboardScene({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(keyboardScene).toHaveLength(2); // два ряда (y=0, y=1)
    expect(keyboardScene[0]).toHaveLength(2); // KeyA, KeyB
    expect(keyboardScene[1]).toHaveLength(1); // ShiftLeft
  });

  it('should correctly transfer physical key properties and set rowIndex/colIndex', () => {
    const keyboardScene = createKeyboardScene({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = keyboardScene[0]![0]!;
    expect(keyA.keyCapId).toBe('KeyA');
    expect(keyA.type).toBe('SYMBOL');
    expect(keyA.unitWidth).toBe('1U');
    expect(keyA.rowIndex).toBe(0);
    expect(keyA.colIndex).toBe(0);
  });

  it('derives symbol from symbolLayout (uppercase variant when shifted entry exists)', () => {
    const keyboardScene = createKeyboardScene({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = keyboardScene[0]![0]!;
    const keyB = keyboardScene[0]![1]!;
    expect(keyA.symbol).toBe('A'); // KeyA has both 'a' and Shift+'A' → uppercase preferred
    expect(keyB.symbol).toBe('b'); // KeyB only has 'b' → as-is
  });

  it('should set symbol to the label from physicalLayout if symbol is not found in symbolLayout (Level 3 Fallback)', () => {
    const customPhysicalLayout: PhysicalLayout = [
      { keyCapId: 'KeyC', x: 0, y: 0, w: 1, type: 'SYMBOL', label: 'c' },
    ];

    const keyboardScene = createKeyboardScene({
      physicalLayout: customPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(keyboardScene[0]![0]!.symbol).toBe('c');
  });

  it('should correctly derive fingerId and isHomeKey from fingerLayout', () => {
    const keyboardScene = createKeyboardScene({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = keyboardScene[0]![0]!;
    const keyB = keyboardScene[0]![1]!;
    const shiftLeft = keyboardScene[1]![0]!;

    expect(keyA.fingerId).toBe('L1');
    expect(keyA.isHomeKey).toBe(true);
    expect(keyB.fingerId).toBe('L2');
    expect(keyB.isHomeKey).toBeUndefined();
    expect(shiftLeft.fingerId).toBe('L5');
    expect(shiftLeft.isHomeKey).toBeUndefined();
  });

  it('should use default fingerId "L1" if fingerLayout entry is missing', () => {
    const customPhysicalLayout: PhysicalLayout = [
      { keyCapId: 'KeyD', x: 0, y: 0, w: 1, type: 'SYMBOL', label: 'd' },
    ];

    const keyboardScene = createKeyboardScene({
      physicalLayout: customPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(keyboardScene[0]![0]!.fingerId).toBe('L1');
  });
});

describe('createKeyboardSceneForFinger', () => {
  it('should create a contextual layout for a specific finger', () => {
    const viewModel = simple_t.expectedOutput;
    const targetFinger = 'L2';

    const keyboardScene = createKeyboardSceneForFinger({ fingerId: targetFinger, viewModel, fingerLayout, physicalLayout });

    const findKey = (keyCapId: string) =>
      keyboardScene.flat().find((k) => k.keyCapId === keyCapId);

    const visibleKeys = keyboardScene.flat().filter((k) => k.visibility === 'VISIBLE');
    const l2Keys = Object.keys(viewModel.L2.keyCapStates!);
    expect(visibleKeys.length).toBe(l2Keys.length);
    visibleKeys.forEach((key) => {
      expect(l2Keys).toContain(key.keyCapId);
    });

    const keyT = findKey('KeyT');
    expect(keyT?.navigationRole).toBe('TARGET');

    const keyR = findKey('KeyR');
    expect(keyR?.navigationRole).toBe('PATH');

    const keyF = findKey('KeyF');
    expect(keyF?.navigationRole).toBe('PATH');

    const keyG = findKey('KeyG');
    expect(keyG?.navigationRole).toBe('NONE');

    const keyA = findKey('KeyA');
    expect(keyA?.visibility).toBe('INVISIBLE');
  });
});
