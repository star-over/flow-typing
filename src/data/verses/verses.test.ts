import { describe, expect, it, vi } from 'vitest';
import { VerseSchema } from '../../interfaces/verse-data.types';
import versesData from './verses.json';

describe('Verse Data Validation', () => {
  it('should validate the structure of verses.json successfully', () => {
    // Suppress console.log for this test
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // The .parse() method will throw a detailed error if the data does not match the schema,
    // which will automatically fail the test. If it doesn't throw, the data is valid.
    const parsingFunction = () => VerseSchema.array().parse(versesData);

    expect(parsingFunction).not.toThrow();

    // No console.log here, as per user's request.

    consoleLogSpy.mockRestore(); // Restore original console.log
  });
});