import { describe, expect, it, vi } from 'vitest'; // Import vi for mocking
import { symbolLayoutQwerty } from '@/data/layouts/symbol-layout-qwerty';
import { generateTypingStream } from './lesson-generator';

describe('generateLesson', () => {
  it('should generate a correct stream for a simple word', () => {
    const lessonText = 'hi';
    const stream = generateTypingStream(lessonText, symbolLayoutQwerty);

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
    // Suppress console.warn for this test and verify it's called
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const lessonText = 'a€b'; // € is not in the layout
    const stream = generateTypingStream(lessonText, symbolLayoutQwerty);

    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');

    // Ensure the console.warn was called as expected, then restore it
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Character "€" not found in symbol layout.'
    );
    consoleWarnSpy.mockRestore(); // Restore original console.warn

  });

  it('should handle an empty string', () => {
    const lessonText = '';
    const stream = generateTypingStream(lessonText, symbolLayoutQwerty);
    expect(stream).toHaveLength(0);
  });
});
