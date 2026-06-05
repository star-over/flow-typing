// src/lib/stats-calculator.test.ts
import { describe, it, expect } from 'vitest';
import {
  getLessonDuration,
  getTotalAttempts,
  getTotalCharacters,
  calculateAccuracy,
  calculateCpm,
  calculateWpm,
  calculateLessonStats,
} from './stats-calculator';
import type { TypingStream, KeyCapId } from '@/interfaces/types';

describe('stats-calculator', () => {
  // Helper to create a simple stream for testing
  const createTestStream = (
    symbols: {
      targetSymbol: string;
      targetKeyCaps: KeyCapId[];
      attempts: { startAt?: number; endAt?: number; pressedKeyCaps: KeyCapId[] }[];
    }[],
  ): TypingStream => {
    return symbols.map((s) => ({
      ...s,
      attempts: s.attempts.map((a) => ({
        pressedKeyCaps: a.pressedKeyCaps,
        startAt: a.startAt,
        endAt: a.endAt,
      })),
    }));
  };

  describe('getLessonDuration', () => {
    it('should return 0 for an empty stream', () => {
      const stream: TypingStream = [];
      expect(getLessonDuration(stream)).toBe(0);
    });

    it('should calculate duration correctly for a single symbol with one attempt', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: 2000, pressedKeyCaps: ['KeyA'] }],
        },
      ]);
      expect(getLessonDuration(stream)).toBe(1); // 1 second
    });

    it('should calculate duration correctly for multiple symbols with multiple attempts', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCaps: ['KeyA'] }],
        },
        {
          targetSymbol: 's',
          targetKeyCaps: ['KeyS'],
          attempts: [
            { startAt: 1600, endAt: 1700, pressedKeyCaps: ['KeyD'] }, // Error
            { startAt: 1750, endAt: 2500, pressedKeyCaps: ['KeyS'] }, // Correct
          ],
        },
        {
          targetSymbol: 'd',
          targetKeyCaps: ['KeyD'],
          attempts: [{ startAt: 2600, endAt: 3000, pressedKeyCaps: ['KeyD'] }],
        },
      ]);
      expect(getLessonDuration(stream)).toBe(2); // (3000 - 1000) / 1000 = 2 seconds
    });

    it('should handle missing startAt or endAt gracefully (return 0)', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: undefined, endAt: 2000, pressedKeyCaps: ['KeyA'] }],
        },
      ]);
      expect(getLessonDuration(stream)).toBe(0);

      const stream2 = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: undefined, pressedKeyCaps: ['KeyA'] }],
        },
      ]);
      expect(getLessonDuration(stream2)).toBe(0);
    });
  });

  describe('getTotalAttempts', () => {
    it('should return 0 for an empty stream', () => {
      const stream: TypingStream = [];
      expect(getTotalAttempts(stream)).toBe(0);
    });

    it('should count attempts correctly for a single symbol', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCaps: ['KeyA'] }],
        },
      ]);
      expect(getTotalAttempts(stream)).toBe(1);
    });

    it('should count attempts correctly for multiple symbols with varying attempts', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: 1100, pressedKeyCaps: ['KeyA'] }],
        },
        {
          targetSymbol: 's',
          targetKeyCaps: ['KeyS'],
          attempts: [
            { startAt: 1200, endAt: 1300, pressedKeyCaps: ['KeyD'] },
            { startAt: 1400, endAt: 1500, pressedKeyCaps: ['KeyS'] },
          ],
        },
        {
          targetSymbol: 'd',
          targetKeyCaps: ['KeyD'],
          attempts: [
            { startAt: 1600, endAt: 1700, pressedKeyCaps: ['KeyF'] },
            { startAt: 1800, endAt: 1900, pressedKeyCaps: ['KeyG'] },
            { startAt: 2000, endAt: 2100, pressedKeyCaps: ['KeyD'] },
          ],
        },
      ]);
      expect(getTotalAttempts(stream)).toBe(1 + 2 + 3); // 6 attempts
    });
  });

  describe('getTotalCharacters', () => {
    it('should return 0 for an empty stream', () => {
      const stream: TypingStream = [];
      expect(getTotalCharacters(stream)).toBe(0);
    });

    it('should count characters correctly for a non-empty stream', () => {
      const stream = createTestStream([
        { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] },
        { targetSymbol: 's', targetKeyCaps: ['KeyS'], attempts: [] },
        { targetSymbol: 'd', targetKeyCaps: ['KeyD'], attempts: [] },
      ]);
      expect(getTotalCharacters(stream)).toBe(3);
    });
  });

  describe('calculateAccuracy', () => {
    it('should return 0 when totalAttempts is 0', () => {
      expect(calculateAccuracy({ totalCharacters: 10, totalAttempts: 0 })).toBe(0);
    });

    it('should return 100 for perfect accuracy', () => {
      expect(calculateAccuracy({ totalCharacters: 10, totalAttempts: 10 })).toBe(100);
    });

    it('should calculate accuracy correctly for some errors', () => {
      // 10 chars, 15 attempts means 5 errors
      expect(calculateAccuracy({ totalCharacters: 10, totalAttempts: 15 })).toBeCloseTo(66.67);
      // 5 chars, 10 attempts means 5 errors
      expect(calculateAccuracy({ totalCharacters: 5, totalAttempts: 10 })).toBe(50);
    });
  });

  describe('calculateCpm', () => {
    it('should return 0 when durationInSeconds is 0', () => {
      expect(calculateCpm({ totalCharacters: 100, durationInSeconds: 0 })).toBe(0);
    });

    it('should calculate CPM correctly', () => {
      // 100 characters in 60 seconds
      expect(calculateCpm({ totalCharacters: 100, durationInSeconds: 60 })).toBe(100);
      // 150 characters in 30 seconds
      expect(calculateCpm({ totalCharacters: 150, durationInSeconds: 30 })).toBe(300);
      // 50 characters in 10 seconds
      expect(calculateCpm({ totalCharacters: 50, durationInSeconds: 10 })).toBe(300);
    });
  });

  describe('calculateWpm', () => {
    it('should calculate WPM correctly', () => {
      expect(calculateWpm(100)).toBe(20);
      expect(calculateWpm(300)).toBe(60);
      expect(calculateWpm(0)).toBe(0);
    });
  });

  describe('calculateLessonStats', () => {
    it('should return default stats for an empty stream', () => {
      const stats = calculateLessonStats([]);
      expect(stats).toEqual({
        durationInSeconds: 0,
        totalCharacters: 0,
        totalAttempts: 0,
        accuracy: 0,
        cpm: 0,
        wpm: 0,
      });
    });

    it('should calculate all stats correctly for a simple perfect lesson', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'h',
          targetKeyCaps: ['KeyH'],
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCaps: ['KeyH'] }],
        },
        {
          targetSymbol: 'e',
          targetKeyCaps: ['KeyE'],
          attempts: [{ startAt: 1500, endAt: 2000, pressedKeyCaps: ['KeyE'] }],
        },
        {
          targetSymbol: 'l',
          targetKeyCaps: ['KeyL'],
          attempts: [{ startAt: 2000, endAt: 2500, pressedKeyCaps: ['KeyL'] }],
        },
        {
          targetSymbol: 'l',
          targetKeyCaps: ['KeyL'],
          attempts: [{ startAt: 2500, endAt: 3000, pressedKeyCaps: ['KeyL'] }],
        },
        {
          targetSymbol: 'o',
          targetKeyCaps: ['KeyO'],
          attempts: [{ startAt: 3000, endAt: 3500, pressedKeyCaps: ['KeyO'] }],
        },
      ]);
      const stats = calculateLessonStats(stream);
      expect(stats.durationInSeconds).toBe(2.5); // (3500 - 1000) / 1000
      expect(stats.totalCharacters).toBe(5);
      expect(stats.totalAttempts).toBe(5);
      expect(stats.accuracy).toBe(100);
      expect(stats.cpm).toBeCloseTo(120); // 5 chars in 2.5s = 2 chars/s * 60 = 120
      expect(stats.wpm).toBeCloseTo(24);  // 120 / 5 = 24
    });

    it('should calculate all stats correctly for a lesson with errors', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCaps: ['KeyA'] }], // 1st try
        },
        {
          targetSymbol: 's',
          targetKeyCaps: ['KeyS'],
          attempts: [
            { startAt: 1600, endAt: 1700, pressedKeyCaps: ['KeyD'] }, // Error
            { startAt: 1750, endAt: 2500, pressedKeyCaps: ['KeyS'] }, // Correct (2nd try)
          ],
        },
        {
          targetSymbol: 'd',
          targetKeyCaps: ['KeyD'],
          attempts: [
            { startAt: 2600, endAt: 2700, pressedKeyCaps: ['KeyF'] }, // Error
            { startAt: 2800, endAt: 2900, pressedKeyCaps: ['KeyG'] }, // Error
            { startAt: 3000, endAt: 3500, pressedKeyCaps: ['KeyD'] }, // Correct (3rd try)
          ],
        },
      ]);
      const stats = calculateLessonStats(stream);
      expect(stats.durationInSeconds).toBe(2.5); // (3500 - 1000) / 1000
      expect(stats.totalCharacters).toBe(3);
      expect(stats.totalAttempts).toBe(1 + 2 + 3); // 6 attempts
      expect(stats.accuracy).toBeCloseTo(50); // 3 chars / 6 attempts * 100 = 50%
      expect(stats.cpm).toBeCloseTo(72);      // 3 chars in 2.5s = 1.2 chars/s * 60 = 72
      expect(stats.wpm).toBeCloseTo(14.4);    // 72 / 5 = 14.4
    });

    it('should handle stream with only one symbol and multiple attempts', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [
            { startAt: 1000, endAt: 1100, pressedKeyCaps: ['KeyS'] },
            { startAt: 1200, endAt: 1300, pressedKeyCaps: ['KeyA'] },
          ],
        },
      ]);
      const stats = calculateLessonStats(stream);
      expect(stats.durationInSeconds).toBe(0.3); // (1300 - 1000) / 1000
      expect(stats.totalCharacters).toBe(1);
      expect(stats.totalAttempts).toBe(2);
      expect(stats.accuracy).toBeCloseTo(50); // 1 char / 2 attempts * 100 = 50%
      expect(stats.cpm).toBeCloseTo(200);     // 1 char in 0.3s = 3.33 chars/s * 60 = 200
      expect(stats.wpm).toBeCloseTo(40);      // 200 / 5 = 40
    });
  });
});

