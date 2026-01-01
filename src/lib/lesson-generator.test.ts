import { afterEach,describe, expect, it, vi } from 'vitest';

import { generateLesson, lessons } from './lesson-generator';

describe('generateLesson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a lesson stream from a randomly selected lesson', () => {
    // Mock Math.random to make the test deterministic
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const stream = generateLesson();
    const firstLessonText = lessons[0];

    // Expect the stream length to match the lesson length
    expect(stream).toHaveLength(firstLessonText.length);

    // Expect the first and last symbols to match
    expect(stream[0].targetSymbol).toBe(firstLessonText[0]);
    expect(stream[stream.length - 1].targetSymbol).toBe(firstLessonText[firstLessonText.length - 1]);

    // Expect the structure of a stream symbol to be correct
    expect(stream[0]).toEqual({
      targetSymbol: firstLessonText[0],
      attempts: [],
    });
  });

  it('should select another lesson based on Math.random', () => {
    const lessonIndex = 2;
    // Mock Math.random to select the third lesson
    vi.spyOn(Math, 'random').mockReturnValue(lessonIndex / lessons.length);

    const stream = generateLesson();
    const selectedLessonText = lessons[lessonIndex];
    
    expect(stream).toHaveLength(selectedLessonText.length);
    expect(stream[0].targetSymbol).toBe(selectedLessonText[0]);
  });
});
