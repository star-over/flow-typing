import { describe, expect, it } from 'vitest';

import type { FingerLayout, PhysicalLayout, SymbolLayout } from '@/interfaces/types';

import { createKeyboardScene } from './keyboard-scene';

describe('createKeyboardScene', () => {
  const mockPhysicalLayout: PhysicalLayout = [
    [
      { keyCapId: 'KeyA', type: 'SYMBOL', unitWidth: '1U', label: 'a' },
      { keyCapId: 'KeyB', type: 'SYMBOL', unitWidth: '1U', label: 'b' },
    ],
    [
      { keyCapId: 'ShiftLeft', type: 'MODIFIER', unitWidth: '2U', label: 'Sh L' },
    ],
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

  it('should create a KeyboardSceneViewModel with correct dimensions', () => {
    const keyboardScene = createKeyboardScene({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(keyboardScene).toHaveLength(mockPhysicalLayout.length);
    expect(keyboardScene[0]).toHaveLength(mockPhysicalLayout[0]!.length);
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
      [{ keyCapId: 'KeyC', type: 'SYMBOL', label: 'c' }], // Changed from 'KeyUnknown'
    ];
    // getSymbol mock will return the label for 'KeyC'

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
    expect(keyB.isHomeKey).toBeUndefined(); // Not a home key
    expect(shiftLeft.fingerId).toBe('L5');
    expect(shiftLeft.isHomeKey).toBeUndefined();
  });

  it('should use default fingerId "L1" if fingerLayout entry is missing', () => {
    const customPhysicalLayout: PhysicalLayout = [
      [{ keyCapId: 'KeyD', type: 'SYMBOL', label: 'd' }], // Changed from 'KeyMissingFinger'
    ];
    // No entry for 'KeyD' in mockFingerLayout

    const keyboardScene = createKeyboardScene({
      physicalLayout: customPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(keyboardScene[0]![0]!.fingerId).toBe('L1');
  });
});
