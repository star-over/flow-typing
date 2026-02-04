/**
 * @file Этот модуль настраивает и предоставляет доступ к коллекции стихов (`verses`).
 *
 * ВАЖНО: Для выполнения императивных запросов (вне React-хуков) используется
 * доступ к внутренним, недокументированным свойствам TanStack DB.
 * Это связано с отсутствием публичного API для таких операций в `localOnlyCollection`.
 * См. GEMINI.md, раздел "Работа с TanStack DB" для полного архитектурного контекста.
 */
import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';
import { z } from 'zod';
import { VerseSchema, Verse } from '@/interfaces/data.types';
import versesData from '@/data/verses/verses.json';

// Ensure the imported JSON data conforms to the VerseSchema
const ValidatedVersesSchema = z.array(VerseSchema);
const validatedVerses = ValidatedVersesSchema.parse(versesData);

export const versesCollection = createCollection(
  localOnlyCollectionOptions({
    id: 'verses',
    getKey: (verse: Verse) => verse.id,
    schema: VerseSchema,
    initialData: validatedVerses,
  })
);

/**
 * @internal
 * This function accesses the internal state of the TanStack DB collection.
 * This is NOT a stable public API and may break in future updates.
 * It is used here because there is no documented public method for
 * imperative querying of a `localOnlyCollection` outside of React's `useLiveQuery`.
 *
 * @returns An array of all verses currently in the collection.
 */
function getAllVersesFromCollection(): Verse[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalState = (versesCollection as any)._state;
  if (!internalState || !internalState.syncedData) {
    return [];
  }
  return Array.from(internalState.syncedData.values());
}

/**
 * Performs an imperative query on the verses collection.
 *
 * @param predicate A function to test each verse.
 * @returns An array of verses that pass the test.
 */
export function queryVerses(predicate: (verse: Verse) => boolean): Verse[] {
  const allVerses = getAllVersesFromCollection();
  return allVerses.filter(predicate);
}


/**
 * Returns a random verse from a given array of verses.
 *
 * @param verses The array of verses to choose from.
 * @returns A random verse or undefined if the array is empty.
 */
export function getRandomVerse(verses: Verse[]): Verse | undefined {
  if (verses.length === 0) {
    return undefined;
  }
  const randomIndex = Math.floor(Math.random() * verses.length);
  return verses[randomIndex];
}

// Example usage:
// 1. Query for English verses
// const englishVerses = queryVerses(verse => verse.langs.includes('en'));
// 2. Get a random verse from the result
// const randomEnglishVerse = getRandomVerse(englishVerses);

// To get a random verse from all verses:
// const allVerses = getAllVersesFromCollection();
// const randomVerse = getRandomVerse(allVerses);
