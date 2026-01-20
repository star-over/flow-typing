import { describe, expect, it, vi } from 'vitest';

import { FingerLayout, KeyboardLayout, ModifierKey,SymbolLayout } from '@/interfaces/types';

import * as SymbolUtils from './symbol-utils'; // Import the module to mock getSymbol
import { createVirtualLayout } from './virtual-layout';

// Mock getSymbol to control its behavior in tests
vi.mock('./symbol-utils', async (importOriginal) => {
    const mod = await importOriginal<typeof SymbolUtils>();
    return {
        ...mod,
        getSymbol: vi.fn((keyCapId: string, activeModifiers: ModifierKey[] = [], symbolLayout: SymbolLayout, keyboardLayout: KeyboardLayout) => {
            if (keyCapId === 'KeyA') {
                return activeModifiers.includes('shift') ? 'A' : 'a';
            }
            if (keyCapId === 'KeyB') {
                return 'b';
            }
            if (keyCapId === 'KeyC') { // For the 'KeyUnknown' test case
                return keyboardLayout.flat().find((key) => key.keyCapId === 'KeyC')?.label || '...';
            }
            // For other keys, return the label from keyboardLayout if available, or '...'
            const physicalKey = keyboardLayout.flat().find((key) => key.keyCapId === keyCapId);
            return physicalKey?.label || '...';
        }),
    };
});


describe('createVirtualLayout', () => {
  const mockKeyboardLayout: KeyboardLayout = [
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
      keyboardLayout: mockKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(virtualLayout).toHaveLength(mockKeyboardLayout.length);
    expect(virtualLayout[0]).toHaveLength(mockKeyboardLayout[0].length);
  });

  it('should correctly transfer physical key properties and set rowIndex/colIndex', () => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: mockKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = virtualLayout[0][0];
    expect(keyA.keyCapId).toBe('KeyA');
    expect(keyA.type).toBe('SYMBOL');
    expect(keyA.unitWidth).toBe('1U');
    expect(keyA.rowIndex).toBe(0);
    expect(keyA.colIndex).toBe(0);
  });

  it('should correctly derive symbol using getSymbol', () => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: mockKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = virtualLayout[0][0];
    const keyB = virtualLayout[0][1];
    expect(keyA.symbol).toBe('a'); // From mocked getSymbol
    expect(keyB.symbol).toBe('b'); // From mocked getSymbol
  });

  it('should set symbol to the label from keyboardLayout if symbol is not found in symbolLayout (Level 3 Fallback)', () => {
    const customKeyboardLayout: KeyboardLayout = [
      [{ keyCapId: 'KeyC', type: 'SYMBOL', label: 'c' }], // Changed from 'KeyUnknown'
    ];
    // getSymbol mock will return the label for 'KeyC'

    const virtualLayout = createVirtualLayout({
      keyboardLayout: customKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(virtualLayout[0][0].symbol).toBe('c');
  });

  it('should correctly derive fingerId and isHomeKey from fingerLayout', () => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: mockKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    const keyA = virtualLayout[0][0];
    const keyB = virtualLayout[0][1];
    const shiftLeft = virtualLayout[1][0];

    expect(keyA.fingerId).toBe('L1');
    expect(keyA.isHomeKey).toBe(true);
    expect(keyB.fingerId).toBe('L2');
    expect(keyB.isHomeKey).toBeUndefined(); // Not a home key
    expect(shiftLeft.fingerId).toBe('L5');
    expect(shiftLeft.isHomeKey).toBeUndefined();
  });

  it('should use default fingerId "L1" if fingerLayout entry is missing', () => {
    const customKeyboardLayout: KeyboardLayout = [
      [{ keyCapId: 'KeyD', type: 'SYMBOL', label: 'd' }], // Changed from 'KeyMissingFinger'
    ];
    // No entry for 'KeyD' in mockFingerLayout

    const virtualLayout = createVirtualLayout({
      keyboardLayout: customKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(virtualLayout[0][0].fingerId).toBe('L1');
  });

  it('should reflect activeModifiers in the symbol', () => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: mockKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
      activeModifiers: ['shift'],
    });

    const keyA = virtualLayout[0][0];
    expect(keyA.symbol).toBe('A'); // Mocked getSymbol returns 'A' for Shift + KeyA
  });

  it('should reflect activeModifiers in the symbol for multiple modifiers', () => {
    // This test relies on the mock of getSymbol
    // The current mock only checks for 'shift'
    const virtualLayout = createVirtualLayout({
      keyboardLayout: mockKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
      activeModifiers: ['shift', 'alt'], // Alt shouldn't change the outcome with current mock
    });

    const keyA = virtualLayout[0][0];
    expect(keyA.symbol).toBe('A');
    expect(SymbolUtils.getSymbol).toHaveBeenCalledWith('KeyA', ['shift', 'alt'], mockSymbolLayout, mockKeyboardLayout);
  });
});
