import { describe, expect, it } from 'vitest';
import { symbolLayoutEnQwerty } from '@/data/symbol-layout-en';
import { generateTypingStream } from './lesson-generator'; // Renamed import

describe('generateLesson', () => {
  it('should generate a correct stream for a simple word', () => {
    const lessonText = 'hi';
    const stream = generateTypingStream(lessonText, symbolLayoutEnQwerty); // Renamed call

    expect(stream).toHaveLength(2);
    expect(stream[0]).toEqual({
      targetSymbol: 'h',
      targetKeyCaps: ['KeyH'],
      attempts: [],
    });
    expect(stream[1]).toEqual({
      targetSymbol: 'i',
      targetKeyCaps: ['KeyI'],
      attempts: [],
    });
  });

  it('should skip characters not present in the symbol layout', () => {
    const lessonText = 'a€b'; // € is not in the layout
    const stream = generateTypingStream(lessonText, symbolLayoutEnQwerty); // Renamed call

    expect(stream).toHaveLength(2);
    expect(stream[0].targetSymbol).toBe('a');
    expect(stream[1].targetSymbol).toBe('b');
  });

  it('should handle an empty string', () => {
    const lessonText = '';
    const stream = generateTypingStream(lessonText, symbolLayoutEnQwerty); // Renamed call
    expect(stream).toHaveLength(0);
  });
});
