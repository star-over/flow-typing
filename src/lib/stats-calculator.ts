// src/lib/stats-calculator.ts

import { TypingStream } from '@/interfaces/types';

// Define the interface for the returned statistics
export interface LessonStats {
  durationInSeconds: number;
  totalCharacters: number;
  totalAttempts: number;
  accuracy: number; // Percentage
  cpm: number;      // Characters Per Minute
  wpm: number;      // Words Per Minute
}

/**
 * Calculates the total duration of the lesson from the first attempt to the last.
 * @param stream The typing stream containing all symbols and attempts.
 * @returns The duration in seconds. Returns 0 if no attempts are made.
 */
export function getLessonDuration(stream: TypingStream): number {
  if (!stream.length) {
    return 0;
  }

  const firstAttempt = stream[0]?.attempts[0];
  const lastSymbol = stream[stream.length - 1];
  const lastAttempt = lastSymbol?.attempts[lastSymbol.attempts.length - 1];

  if (!firstAttempt?.startAt || !lastAttempt?.endAt) {
    return 0; // Not enough data to calculate duration
  }

  // Duration in milliseconds
  const durationMs = lastAttempt.endAt - firstAttempt.startAt;
  return durationMs / 1000; // Convert to seconds
}

/**
 * Counts the total number of key presses (attempts) made during the lesson.
 * @param stream The typing stream.
 * @returns The total number of attempts.
 */
export function getTotalAttempts(stream: TypingStream): number {
  return stream.reduce((acc, symbol) => acc + symbol.attempts.length, 0);
}

/**
 * Counts the total number of characters in the lesson (length of the stream).
 * @param stream The typing stream.
 * @returns The total number of characters.
 */
export function getTotalCharacters(stream: TypingStream): number {
  return stream.length;
}

/**
 * Calculates the accuracy percentage.
 * Accuracy is defined as (Total Characters / Total Attempts) * 100%.
 * @param totalCharacters The total number of characters in the lesson.
 * @param totalAttempts The total number of key presses (attempts).
 * @returns The accuracy percentage, or 0 if no attempts.
 */
export function calculateAccuracy(totalCharacters: number, totalAttempts: number): number {
  if (totalAttempts === 0) {
    return 0;
  }
  return (totalCharacters / totalAttempts) * 100;
}

/**
 * Calculates Characters Per Minute (CPM).
 * @param totalCharacters The total number of characters.
 * @param durationInSeconds The duration of the lesson in seconds.
 * @returns CPM, or 0 if duration is 0.
 */
export function calculateCpm(totalCharacters: number, durationInSeconds: number): number {
  if (durationInSeconds === 0) {
    return 0;
  }
  return (totalCharacters / durationInSeconds) * 60;
}

/**
 * Calculates Words Per Minute (WPM) based on CPM.
 * WPM is typically CPM / 5.
 * @param cpm Characters Per Minute.
 * @returns WPM.
 */
export function calculateWpm(cpm: number): number {
  return cpm / 5;
}

/**
 * Main function to calculate all basic lesson statistics.
 * @param stream The typing stream representing the completed lesson.
 * @returns An object containing all calculated statistics.
 */
export function calculateLessonStats(stream: TypingStream): LessonStats {
  const durationInSeconds = getLessonDuration(stream);
  const totalCharacters = getTotalCharacters(stream);
  const totalAttempts = getTotalAttempts(stream);

  const accuracy = calculateAccuracy(totalCharacters, totalAttempts);
  const cpm = calculateCpm(totalCharacters, durationInSeconds);
  const wpm = calculateWpm(cpm);

  return {
    durationInSeconds,
    totalCharacters,
    totalAttempts,
    accuracy: parseFloat(accuracy.toFixed(2)), // Round to 2 decimal places
    cpm: parseFloat(cpm.toFixed(2)),           // Round to 2 decimal places
    wpm: parseFloat(wpm.toFixed(2)),           // Round to 2 decimal places
  };
}
