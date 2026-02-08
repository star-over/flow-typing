import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { z } from 'zod';
import { VerseSchema, Verse } from '@/interfaces/verse-data.types';
import versesData from '@/data/verses/verses.json';
import { parseLoadSubsetOptions } from '@tanstack/db';
import { QueryClient } from '@tanstack/react-query'; // Import QueryClient

// --- Zod schema and initial data validation (remains unchanged) ---
const ValidatedVersesSchema = z.array(VerseSchema);
const validatedVerses = ValidatedVersesSchema.parse(versesData);

// Manually define the filter/sort types based on library's actual structure
type FieldPath = (string | number)[];
type ParsedFilter = {
  field: FieldPath;
  operator: string;
  value?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
type ParsedOrderBy = {
  field: FieldPath;
  direction: 'asc' | 'desc';
};

// --- Helper for applying filters ---
const evaluateFilter = (verse: Verse, filter: ParsedFilter): boolean => {
  const fieldName = (Array.isArray(filter.field) ? filter.field[0] : filter.field) as keyof Verse;
  if (!(fieldName in verse)) return true; // Fail-safe
  const itemValue = verse[fieldName];
  switch (filter.operator) {
    case 'eq':
      if (fieldName === 'verse' && typeof itemValue === 'string' && typeof filter.value === 'string') {
        return itemValue.includes(filter.value);
      }
      return itemValue === filter.value;
    case 'lt':
      return typeof itemValue === 'number' && itemValue < filter.value;
    case 'gt':
      return typeof itemValue === 'number' && itemValue > filter.value;
    default:
      return true;
  }
};

// --- Helper for applying sorts ---
const applySorts = (a: Verse, b: Verse, sorts: ReadonlyArray<ParsedOrderBy>): number => {
  for (const sort of sorts) {
    const fieldName = (Array.isArray(sort.field) ? sort.field[0] : sort.field) as keyof Verse;
    if (!(fieldName in a) || !(fieldName in b)) return 0;
    const aValue = a[fieldName];
    const bValue = b[fieldName];
    if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
  }
  return 0;
};

// Create a query client instance, as required by queryCollectionOptions
const queryClient = new QueryClient();

// --- TanStack DB Collection Definition (Corrected Structure) ---
export const versesCollection = createCollection(
  queryCollectionOptions({
    id: 'verses', // Using 'id' for the collection
    queryClient,
    queryKey: ['verses'],
    getKey: (verse: Verse) => verse.id,
    schema: VerseSchema, // Passing schema here for type inference
    queryFn: async (ctx) => {
      const { where, orderBy, limit, offset } = ctx.meta?.loadSubsetOptions || {};
      const parsedOptions = parseLoadSubsetOptions({ where, orderBy });
      let results: Verse[] = [...validatedVerses];

      if (parsedOptions.filters.length > 0) {
        results = results.filter((verse) => {
          return parsedOptions.filters.every((filter) => evaluateFilter(verse, filter as ParsedFilter));
        });
      }

      if (parsedOptions.sorts.length > 0) {
        results.sort((a, b) => applySorts(a, b, parsedOptions.sorts));
      }

      let finalResults = results;
      if (offset !== undefined) {
        finalResults = finalResults.slice(offset);
      }
      if (limit !== undefined) {
        finalResults = finalResults.slice(0, limit);
      }

      return finalResults;
    },
  })
);

// --- getRandomVerse remains useful ---
export function getRandomVerse(verses: Verse[]): Verse | undefined {
  if (verses.length === 0) {
    return undefined;
  }
  const randomIndex = Math.floor(Math.random() * verses.length);
  return verses[randomIndex];
}