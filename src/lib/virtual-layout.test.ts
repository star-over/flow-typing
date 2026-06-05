import { describe, expect, it } from 'vitest';

import type { FingerLayout, PhysicalLayout, SymbolLayout } from '@/interfaces/types';

import { createVirtualLayout } from './virtual-layout';

describe('createVirtualLayout', () => {
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

  it('should create a VirtualLayout with correct dimensions', () => {
    const virtualLayout = createVirtualLayout({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(virtualLayout).toHaveLength(mockPhysicalLayout.length);
    expect(virtualLayout[0]).toHaveLength(mockPhysicalLayout[0]!.length);
  });

  it('should correctly transfer physical key properties and set rowIndex/colIndex', () => {
    const virtualLayout = createVirtualLayout({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = virtualLayout[0]![0]!;
    expect(keyA.keyCapId).toBe('KeyA');
    expect(keyA.type).toBe('SYMBOL');
    expect(keyA.unitWidth).toBe('1U');
    expect(keyA.rowIndex).toBe(0);
    expect(keyA.colIndex).toBe(0);
  });

  it('derives symbol from symbolLayout (uppercase variant when shifted entry exists)', () => {
    const virtualLayout = createVirtualLayout({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = virtualLayout[0]![0]!;
    const keyB = virtualLayout[0]![1]!;
    expect(keyA.symbol).toBe('A'); // KeyA has both 'a' and Shift+'A' → uppercase preferred
    expect(keyB.symbol).toBe('b'); // KeyB only has 'b' → as-is
  });

  it('should set symbol to the label from physicalLayout if symbol is not found in symbolLayout (Level 3 Fallback)', () => {
    const customPhysicalLayout: PhysicalLayout = [
      [{ keyCapId: 'KeyC', type: 'SYMBOL', label: 'c' }], // Changed from 'KeyUnknown'
    ];
    // getSymbol mock will return the label for 'KeyC'

    const virtualLayout = createVirtualLayout({
      physicalLayout: customPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(virtualLayout[0]![0]!.symbol).toBe('c');
  });

  it('should correctly derive fingerId and isHomeKey from fingerLayout', () => {
    const virtualLayout = createVirtualLayout({
      physicalLayout: mockPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = virtualLayout[0]![0]!;
    const keyB = virtualLayout[0]![1]!;
    const shiftLeft = virtualLayout[1]![0]!;

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

    const virtualLayout = createVirtualLayout({
      physicalLayout: customPhysicalLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(virtualLayout[0]![0]!.fingerId).toBe('L1');
  });
});
