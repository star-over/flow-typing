import { describe, expect, it, vi } from 'vitest';
import { DrillSchema } from '../../interfaces/drill-data.types';
import drillsData from './drills.json';

describe('Drill Data Validation', () => {
  it('should validate the structure of drills.json successfully', () => {
    // Suppress console.log for this test
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // The .parse() method will throw a detailed error if the data does not match the schema,
    // which will automatically fail the test. If it doesn't throw, the data is valid.
    const parsingFunction = () => DrillSchema.array().parse(drillsData);

    expect(parsingFunction).not.toThrow();

    // No console.log here, as per user's request.

    consoleLogSpy.mockRestore(); // Restore original console.log
  });
});