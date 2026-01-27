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
import { TypingStream, KeyCapId } from '@/interfaces/types';

describe('stats-calculator', () => {
  // Helper to create a simple stream for testing
  const createTestStream = (
    symbols: Array<{
      targetSymbol: string;
      targetKeyCaps: KeyCapId[];
      attempts: Array<{ startAt?: number; endAt?: number; pressedKeyCups: KeyCapId[] }>;
    }>,
  ): TypingStream => {
    return symbols.map((s) => ({
      ...s,
      attempts: s.attempts.map((a) => ({
        pressedKeyCups: a.pressedKeyCups,
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
          attempts: [{ startAt: 1000, endAt: 2000, pressedKeyCups: ['KeyA'] }],
        },
      ]);
      expect(getLessonDuration(stream)).toBe(1); // 1 second
    });

    it('should calculate duration correctly for multiple symbols with multiple attempts', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCups: ['KeyA'] }],
        },
        {
          targetSymbol: 's',
          targetKeyCaps: ['KeyS'],
          attempts: [
            { startAt: 1600, endAt: 1700, pressedKeyCups: ['KeyD'] }, // Error
            { startAt: 1750, endAt: 2500, pressedKeyCups: ['KeyS'] }, // Correct
          ],
        },
        {
          targetSymbol: 'd',
          targetKeyCaps: ['KeyD'],
          attempts: [{ startAt: 2600, endAt: 3000, pressedKeyCups: ['KeyD'] }],
        },
      ]);
      expect(getLessonDuration(stream)).toBe(2); // (3000 - 1000) / 1000 = 2 seconds
    });

    it('should handle missing startAt or endAt gracefully (return 0)', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: undefined, endAt: 2000, pressedKeyCups: ['KeyA'] }],
        },
      ]);
      expect(getLessonDuration(stream)).toBe(0);

      const stream2 = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: undefined, pressedKeyCups: ['KeyA'] }],
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
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCups: ['KeyA'] }],
        },
      ]);
      expect(getTotalAttempts(stream)).toBe(1);
    });

    it('should count attempts correctly for multiple symbols with varying attempts', () => {
      const stream = createTestStream([
        {
          targetSymbol: 'a',
          targetKeyCaps: ['KeyA'],
          attempts: [{ startAt: 1000, endAt: 1100, pressedKeyCups: ['KeyA'] }],
        },
        {
          targetSymbol: 's',
          targetKeyCaps: ['KeyS'],
          attempts: [
            { startAt: 1200, endAt: 1300, pressedKeyCups: ['KeyD'] },
            { startAt: 1400, endAt: 1500, pressedKeyCups: ['KeyS'] },
          ],
        },
        {
          targetSymbol: 'd',
          targetKeyCaps: ['KeyD'],
          attempts: [
            { startAt: 1600, endAt: 1700, pressedKeyCups: ['KeyF'] },
            { startAt: 1800, endAt: 1900, pressedKeyCups: ['KeyG'] },
            { startAt: 2000, endAt: 2100, pressedKeyCups: ['KeyD'] },
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
      expect(calculateAccuracy(10, 0)).toBe(0);
    });

    it('should return 100 for perfect accuracy', () => {
      expect(calculateAccuracy(10, 10)).toBe(100);
    });

    it('should calculate accuracy correctly for some errors', () => {
      // 10 chars, 15 attempts means 5 errors
      expect(calculateAccuracy(10, 15)).toBeCloseTo(66.67);
      // 5 chars, 10 attempts means 5 errors
      expect(calculateAccuracy(5, 10)).toBe(50);
    });
  });

  describe('calculateCpm', () => {
    it('should return 0 when durationInSeconds is 0', () => {
      expect(calculateCpm(100, 0)).toBe(0);
    });

    it('should calculate CPM correctly', () => {
      // 100 characters in 60 seconds
      expect(calculateCpm(100, 60)).toBe(100);
      // 150 characters in 30 seconds
      expect(calculateCpm(150, 30)).toBe(300);
      // 50 characters in 10 seconds
      expect(calculateCpm(50, 10)).toBe(300);
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
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCups: ['KeyH'] }],
        },
        {
          targetSymbol: 'e',
          targetKeyCaps: ['KeyE'],
          attempts: [{ startAt: 1500, endAt: 2000, pressedKeyCups: ['KeyE'] }],
        },
        {
          targetSymbol: 'l',
          targetKeyCaps: ['KeyL'],
          attempts: [{ startAt: 2000, endAt: 2500, pressedKeyCups: ['KeyL'] }],
        },
        {
          targetSymbol: 'l',
          targetKeyCaps: ['KeyL'],
          attempts: [{ startAt: 2500, endAt: 3000, pressedKeyCups: ['KeyL'] }],
        },
        {
          targetSymbol: 'o',
          targetKeyCaps: ['KeyO'],
          attempts: [{ startAt: 3000, endAt: 3500, pressedKeyCups: ['KeyO'] }],
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
          attempts: [{ startAt: 1000, endAt: 1500, pressedKeyCups: ['KeyA'] }], // 1st try
        },
        {
          targetSymbol: 's',
          targetKeyCaps: ['KeyS'],
          attempts: [
            { startAt: 1600, endAt: 1700, pressedKeyCups: ['KeyD'] }, // Error
            { startAt: 1750, endAt: 2500, pressedKeyCups: ['KeyS'] }, // Correct (2nd try)
          ],
        },
        {
          targetSymbol: 'd',
          targetKeyCaps: ['KeyD'],
          attempts: [
            { startAt: 2600, endAt: 2700, pressedKeyCups: ['KeyF'] }, // Error
            { startAt: 2800, endAt: 2900, pressedKeyCups: ['KeyG'] }, // Error
            { startAt: 3000, endAt: 3500, pressedKeyCups: ['KeyD'] }, // Correct (3rd try)
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
            { startAt: 1000, endAt: 1100, pressedKeyCups: ['KeyS'] },
            { startAt: 1200, endAt: 1300, pressedKeyCups: ['KeyA'] },
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

