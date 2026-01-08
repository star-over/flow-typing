import { describe, expect, it, vi } from 'vitest';

import { FingerLayout, KeyboardLayout, ModifierKey,SymbolLayout } from '@/interfaces/types';

import * as SymbolUtils from './symbol-utils'; // Import the module to mock getSymbol
import { createVirtualLayout } from './virtual-layout';

// Mock getSymbol to control its behavior in tests
vi.mock('./symbol-utils', async (importOriginal) => {
    const mod = await importOriginal<typeof SymbolUtils>();
    return {
        ...mod,
        getSymbol: vi.fn((keyCapId: string, activeModifiers: ModifierKey[] = [], symbolLayout: SymbolLayout) => {
            if (keyCapId === 'KeyA') {
                return activeModifiers.includes('shift') ? 'A' : 'a';
            }
            if (keyCapId === 'KeyB') {
                return 'b';
            }
            if (keyCapId === 'KeyC') { // For the 'KeyUnknown' test case
                return undefined;
            }
            return undefined; // Default behavior
        }),
    };
});


describe('createVirtualLayout', () => {
  const mockKeyboardLayout: KeyboardLayout = [
    [
      { keyCapId: 'KeyA', type: 'SYMBOL', unitWidth: '1U' },
      { keyCapId: 'KeyB', type: 'SYMBOL', unitWidth: '1U' },
    ],
    [
      { keyCapId: 'ShiftLeft', type: 'MODIFIER', unitWidth: '2U' }, // Changed from '2.25U'
    ],
  ];

  const mockSymbolLayout: SymbolLayout = {
    'a': ['KeyA'],
    'b': ['KeyB'],
    'A': ['KeyA', 'ShiftLeft'],
  };

  const mockFingerLayout: FingerLayout = {
    KeyA: { fingerId: 'L1', isHomeKey: true },
    KeyB: { fingerId: 'L2' },
    ShiftLeft: { fingerId: 'L5' },
  };

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

  it('should set symbol to "..." if getSymbol returns undefined', () => {
    const customKeyboardLayout: KeyboardLayout = [
      [{ keyCapId: 'KeyC', type: 'SYMBOL' }], // Changed from 'KeyUnknown'
    ];
    // getSymbol mock will return undefined for 'KeyC'

    const virtualLayout = createVirtualLayout({
      keyboardLayout: customKeyboardLayout,
      symbolLayout: mockSymbolLayout,
      fingerLayout: mockFingerLayout,
    });

    expect(virtualLayout[0][0].symbol).toBe('...');
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
      [{ keyCapId: 'KeyD', type: 'SYMBOL' }], // Changed from 'KeyMissingFinger'
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
    expect(SymbolUtils.getSymbol).toHaveBeenCalledWith('KeyA', ['shift', 'alt'], mockSymbolLayout);
  });
});
