import { describe, expect, it } from 'vitest';

import { getFingerLayout, getPhysicalLayout, getSymbolLayout } from '@/lib/layouts';

const fingerLayoutASDF = getFingerLayout('asdf');
const physicalLayoutANSI = getPhysicalLayout('ansi');
const symbolLayoutQwerty = getSymbolLayout('qwerty');
import type { FingerLayout, PhysicalLayout, SymbolLayout } from '@/interfaces/types';

import {
  FINGER_COSTS,
  MODIFIER_COSTS,
  MOVEMENT_COSTS,
  calculateCharDifficulty,
} from './difficulty-calculator';

describe('difficulty-calculator', () => {
  // -----------------------------------------------------------------------
  // 1. Cost tables — sentinel values that the adaptive system relies on.
  //    A silent edit here would change every difficulty ranking in the app
  //    without breaking any other test, so we lock the constants explicitly.
  // -----------------------------------------------------------------------

  describe('cost tables', () => {
    it('FINGER_COSTS preserves the canonical hierarchy thumb=index < middle < ring < pinky << palm', () => {
      expect(FINGER_COSTS.L1).toBe(1.0);
      expect(FINGER_COSTS.R1).toBe(1.0);
      expect(FINGER_COSTS.L2).toBe(1.0);
      expect(FINGER_COSTS.R2).toBe(1.0);
      expect(FINGER_COSTS.L3).toBe(1.5);
      expect(FINGER_COSTS.R3).toBe(1.5);
      expect(FINGER_COSTS.L4).toBe(2.0);
      expect(FINGER_COSTS.R4).toBe(2.0);
      expect(FINGER_COSTS.L5).toBe(3.0);
      expect(FINGER_COSTS.R5).toBe(3.0);
    });

    it('FINGER_COSTS.LB / RB are the 99 "forbidden" sentinel (palm should never type)', () => {
      expect(FINGER_COSTS.LB).toBe(99);
      expect(FINGER_COSTS.RB).toBe(99);
    });

    it('MOVEMENT_COSTS: each direction has 3 monotonically increasing entries', () => {
      expect(MOVEMENT_COSTS.UP).toEqual([1.7, 2.5, 3.0]);
      expect(MOVEMENT_COSTS.DOWN).toEqual([1.3, 1.8, 2.5]);
      expect(MOVEMENT_COSTS.HORIZONTAL).toEqual([2, 3.5, 5.0]);
    });

    it('MODIFIER_COSTS contains only Shifts (both = 2.0); other modifiers fall through to per-key calculation', () => {
      expect(MODIFIER_COSTS.ShiftLeft).toBe(2.0);
      expect(MODIFIER_COSTS.ShiftRight).toBe(2.0);
      expect(MODIFIER_COSTS.AltLeft).toBeUndefined();
      expect(MODIFIER_COSTS.ControlLeft).toBeUndefined();
      expect(MODIFIER_COSTS.MetaLeft).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // 2. calculateCharDifficulty with real production layouts (ANSI + ASDF + en).
  //    Exact arithmetic — these are the numbers the live app produces today.
  //    Any change here means the adaptive ranking shifted and is intentional.
  // -----------------------------------------------------------------------

  describe('calculateCharDifficulty (real ANSI / ASDF / QWERTY-en)', () => {
    const calc = (char: string) =>
      calculateCharDifficulty({
        char,
        symbolLayout: symbolLayoutQwerty,
        fingerLayout: fingerLayoutASDF,
        physicalLayout: physicalLayoutANSI,
      });

    describe('home row keys (no movement: cost = fingerCost)', () => {
      it("'f' = L2 home → 1.0", () => {
        expect(calc('f')).toBeCloseTo(1.0, 5);
      });

      it("'j' = R2 home → 1.0", () => {
        expect(calc('j')).toBeCloseTo(1.0, 5);
      });

      it("'a' = L5 home → 3.0 (pinky)", () => {
        expect(calc('a')).toBeCloseTo(3.0, 5);
      });

      it("';' = R5 home → 3.0 (pinky)", () => {
        expect(calc(';')).toBeCloseTo(3.0, 5);
      });
    });

    describe('vertical movements', () => {
      it("'q' = UP×1 from KeyA (L5) → 3.0 × 1.7 = 5.1", () => {
        expect(calc('q')).toBeCloseTo(5.1, 5);
      });

      it("'z' = DOWN×1 from KeyA (L5) → 3.0 × 1.3 = 3.9", () => {
        expect(calc('z')).toBeCloseTo(3.9, 5);
      });

      it("'1' = UP×2 from KeyA (L5) → 3.0 × 2.5 = 7.5", () => {
        expect(calc('1')).toBeCloseTo(7.5, 5);
      });
    });

    describe('horizontal movement', () => {
      it("'g' = RIGHT×1 from KeyF (L2) → 1.0 × 2 = 2.0", () => {
        expect(calc('g')).toBeCloseTo(2.0, 5);
      });
    });

    describe('diagonal movement (vertical + horizontal summed)', () => {
      it("'t' = UP×1 + RIGHT×1 from KeyF (L2) → 1.0 × (1.7 + 2.0) = 3.7", () => {
        expect(calc('t')).toBeCloseTo(3.7, 5);
      });
    });

    describe('chords with Shift modifier (modifier cost added, not multiplied)', () => {
      it("'A' = KeyA + ShiftRight → 3.0 + 2.0 = 5.0", () => {
        expect(calc('A')).toBeCloseTo(5.0, 5);
      });

      it("'F' = KeyF + ShiftRight → 1.0 + 2.0 = 3.0", () => {
        expect(calc('F')).toBeCloseTo(3.0, 5);
      });

      it("'!' = Digit1 + ShiftRight → 7.5 + 2.0 = 9.5", () => {
        expect(calc('!')).toBeCloseTo(9.5, 5);
      });
    });

    describe('edge cases', () => {
      it('returns sentinel 10 for a symbol not in the layout', () => {
        expect(calc('§')).toBe(10);
      });

      it("Space is mapped and yields a real cost (not the 10 sentinel)", () => {
        const space = calc(' ');
        expect(space).toBeGreaterThan(0);
        expect(space).toBeLessThan(10);
      });
    });

    describe('qualitative hierarchy (sanity invariants)', () => {
      it('upper-row keys are more expensive than their home counterparts on the same finger', () => {
        expect(calc('a')).toBeLessThan(calc('q')); // L5
        expect(calc('f')).toBeLessThan(calc('r')); // L2
        expect(calc('j')).toBeLessThan(calc('u')); // R2
      });

      it('shifted variant is strictly more expensive than the base letter', () => {
        expect(calc('A')).toBeGreaterThan(calc('a'));
        expect(calc('F')).toBeGreaterThan(calc('f'));
      });

      it('pinky home is more expensive than index home (typing wisdom)', () => {
        expect(calc('a')).toBeGreaterThan(calc('f'));
        expect(calc(';')).toBeGreaterThan(calc('j'));
      });
    });
  });

  // -----------------------------------------------------------------------
  // 3. Synthetic minimal layouts — exercise paths that real ANSI cannot
  //    reach: distances past the MOVEMENT_COSTS array, and keys missing
  //    from the finger layout. Both have explicit fallback branches in
  //    calculateKeyCost; without these tests they are silently exercised
  //    in production with no coverage.
  // -----------------------------------------------------------------------

  describe('fallback branches (synthetic layouts)', () => {
    const wideKeyboard: PhysicalLayout = [
      { keyCapId: 'KeyA', x: 0, y: 0, w: 1, label: 'A', type: 'SYMBOL' },
      { keyCapId: 'KeyB', x: 1, y: 0, w: 1, label: 'B', type: 'SYMBOL' },
      { keyCapId: 'KeyC', x: 2, y: 0, w: 1, label: 'C', type: 'SYMBOL' },
      { keyCapId: 'KeyD', x: 3, y: 0, w: 1, label: 'D', type: 'SYMBOL' },
      { keyCapId: 'KeyE', x: 4, y: 0, w: 1, label: 'E', type: 'SYMBOL' },
      { keyCapId: 'KeyF', x: 5, y: 0, w: 1, label: 'F', type: 'SYMBOL' },
      { keyCapId: 'KeyG', x: 6, y: 0, w: 1, label: 'G', type: 'SYMBOL' },
      { keyCapId: 'KeyH', x: 7, y: 0, w: 1, label: 'H', type: 'SYMBOL' },
      { keyCapId: 'KeyI', x: 8, y: 0, w: 1, label: 'I', type: 'SYMBOL' },
      { keyCapId: 'KeyJ', x: 9, y: 0, w: 1, label: 'J', type: 'SYMBOL' },
      { keyCapId: 'KeyK', x: 10, y: 0, w: 1, label: 'K', type: 'SYMBOL' },
      { keyCapId: 'KeyL', x: 11, y: 0, w: 1, label: 'L', type: 'SYMBOL' },
    ];
    const wideFinger: FingerLayout = [
      { keyCapId: 'KeyA', fingerId: 'L2', isHomeKey: true },
      { keyCapId: 'KeyL', fingerId: 'L2' }, // c=11 from home at c=0 → far past HORIZONTAL[2]
    ];
    const wideSymbol: SymbolLayout = [
      { symbol: 'a', keyCaps: ['KeyA'] },
      { symbol: 'l', keyCaps: ['KeyL'] },
      { symbol: 'orphan', keyCaps: ['KeyZ'] }, // KeyZ is not in wideFinger
    ];

    it('horizontal distance > 3 falls back to the last HORIZONTAL cost (5.0)', () => {
      // L2 (1.0) × HORIZONTAL[2] (5.0) = 5.0
      expect(calculateCharDifficulty({
        char: 'l',
        symbolLayout: wideSymbol,
        fingerLayout: wideFinger,
        physicalLayout: wideKeyboard,
      })).toBe(5.0);
    });

    it('symbol whose key is missing from fingerLayout yields the 99 sentinel', () => {
      expect(calculateCharDifficulty({
        char: 'orphan',
        symbolLayout: wideSymbol,
        fingerLayout: wideFinger,
        physicalLayout: wideKeyboard,
      })).toBe(99);
    });
  });
});
