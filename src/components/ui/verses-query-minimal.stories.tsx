/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useLiveQuery, gt } from '@tanstack/react-db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { versesCollection } from '@/lib/verses.db';
import { InitialQueryBuilder } from '@tanstack/db';
import { Verse } from '@/interfaces/verse-data.types'; // Import Verse type for SortArgs

const queryClient = new QueryClient();

// Define SortArgs type
type SortArgs = { field: keyof Verse; direction: 'asc' | 'desc' }[];

// Define SelectArgs type
type SelectArgs = (refs: { verse: any }) => { [key: string]: any };

// Define InitialFilters type
type InitialFilters = {
  has_all_chars?: string[];
  word_count_gt?: number;
  has_none_chars?: string[];
  avg_word_length_gt?: number;
};

// Making the component accept props
const VersesQueryDemo: React.FC<{ limit?: number; initialSorts?: SortArgs; defaultLimit?: number; initialFilters?: InitialFilters; initialSelect?: SelectArgs }> = ({ limit, initialSorts = [], defaultLimit, initialFilters = {}, initialSelect }) => {
  const effectiveLimit = limit !== undefined ? limit : (defaultLimit !== undefined ? defaultLimit : undefined); // Use defaultLimit if limit is not provided

  const { data: verses, isLoading, isError } = useLiveQuery(
    {
      query: (q: InitialQueryBuilder) => {
        let queryExpression = q.from({ verse: versesCollection }); // Start query builder

        if (initialFilters.word_count_gt !== undefined) {
          queryExpression = queryExpression.where((refs) => gt(refs.verse.word_count, initialFilters.word_count_gt!));
        }

        if (initialFilters.avg_word_length_gt !== undefined) {
          queryExpression = queryExpression.where((refs) => gt(refs.verse.avg_word_length, initialFilters.avg_word_length_gt!));
        }

        // Apply sorting logic first, as it's required for limit/offset
        if (initialSorts.length > 0) {
          for (const sort of initialSorts) {
            queryExpression = queryExpression.orderBy((refs: { verse: any }) => refs.verse[sort.field], sort.direction);
          }
        } else if (effectiveLimit !== undefined) {
          // If effectiveLimit is used but no specific sort is provided, default to sorting by id
          queryExpression = queryExpression.orderBy((refs: { verse: any }) => refs.verse.id, 'asc');
        }

        // Apply effectiveLimit
        if (effectiveLimit !== undefined) {
          queryExpression = queryExpression.limit(effectiveLimit);
        }

        // Apply custom select or default to all fields
        if (initialSelect) {
          return queryExpression.select((refs) => initialSelect(refs));
        } else {
          // Explicitly select all fields of the Verse object
          return queryExpression.select((refs: { verse: any }) => ({
            id: refs.verse.id,
            verse: refs.verse.verse,
            char_count: refs.verse.char_count,
            word_count: refs.verse.word_count,
            avg_word_length: refs.verse.avg_word_length,
            max_word_length: refs.verse.max_word_length,
            unique_chars: refs.verse.unique_chars,
            unique_symbols: refs.verse.unique_symbols,
            char_freq: refs.verse.char_freq,
            symbol_freq: refs.verse.symbol_freq,
            bigrams: refs.verse.bigrams,
            trigrams: refs.verse.trigrams,
          }));
        }
      },
    },
    [effectiveLimit, initialSorts, initialFilters, initialSelect] // useLiveQuery dependencies: re-run if any of these change
  );

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: An unknown error occurred.</div>; // Generic error message
  if (!verses) return <div>No data returned.</div>;

  let processedVerses = verses;
  // Apply client-side filtering for has_all_chars
  // This is done client-side because tanstack/db's query API does not
  // directly support checking if an array field contains multiple specific elements.
  if (initialFilters.has_all_chars && initialFilters.has_all_chars.length > 0) {
    processedVerses = processedVerses.filter((verse) =>
      initialFilters.has_all_chars!.every((char) =>
        (verse.unique_chars && (verse.unique_chars as string[]).includes(char))
      )
    );
  }

  // Apply client-side filtering for has_none_chars
  // This filter ensures that the verse.unique_chars array does NOT contain ANY of the characters specified.
  if (initialFilters.has_none_chars && initialFilters.has_none_chars.length > 0) {
    processedVerses = processedVerses.filter((verse) =>
      initialFilters.has_none_chars!.every((char) =>
        (verse.unique_chars && !(verse.unique_chars as string[]).includes(char))
      )
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
      <h3>Query Results ({processedVerses.length} found)</h3>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8em', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto' }}>
        {JSON.stringify(processedVerses, null, 2)}
      </pre>
    </div>
  );
};

const meta: Meta<typeof VersesQueryDemo> = {
  title: 'Verses/QueryDemo',
  component: VersesQueryDemo,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  argTypes: { // Add argTypes for limit and initialSorts and initialFilters
    limit: {
      control: 'number',
      description: 'Limit the number of results (overrides defaultLimit)',
    },
    defaultLimit: {
      control: 'number',
      description: 'Default limit to apply if no specific limit is set',
      defaultValue: 5, // Set a default for the control itself
    },
    initialSorts: {
      control: 'object',
      description: 'Sorts to apply (e.g., `[{ field: "word_count", direction: "desc" }]`)',
    },
    initialFilters: {
      control: 'object',
      description: 'Filters to apply (e.g., `{ has_all_chars: ["д", "е", "л"], word_count_gt: 5 }`)',
    },
    initialSelect: {
      control: 'object',
      description: 'Function to select specific fields (e.g., `({ verse }) => ({ id: verse.id, verse: verse.verse })`)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof VersesQueryDemo>;

export const AllVerses: Story = {
  name: 'All Verses (default limited)',
  args: {
    limit: undefined,
    defaultLimit: 5,
    initialSorts: [],
    initialFilters: {}, // Add initialFilters to existing stories
    initialSelect: undefined,
  },
};

export const SingleVerse: Story = {
  name: 'Single Verse (limit: 1, sorted by ID)',
  args: {
    limit: 1,
    initialSorts: [], // Sorts will be default by ID if not provided
    initialFilters: {}, // Add initialFilters to existing stories
    initialSelect: undefined,
  },
};

export const SortByWordCountDesc: Story = {
  name: 'Sorted by Word Count Desc (default limited)',
  args: {
    limit: undefined,
    defaultLimit: 5,
    initialSorts: [{ field: 'word_count', direction: 'desc' }],
    initialFilters: {}, // Add initialFilters to existing stories
    initialSelect: undefined,
  },
};

export const FilterByWordCountGreaterThan: Story = {
  name: 'Filter by Word Count > 5',
  args: {
    limit: undefined,
    defaultLimit: 5,
    initialSorts: [],
    initialFilters: { word_count_gt: 5 },
    initialSelect: undefined,
  },
};

export const FilterByHasAllCharsAndWordCountGreaterThanWithSelection: Story = {
  name: 'Filter (Has "д", "е", "л" AND Word Count > 9) with Selection',
  args: {
    limit: undefined,
    defaultLimit: 5,
    initialSorts: [],
    initialFilters: { has_all_chars: ["д", "е", "л"], word_count_gt: 9 },
    initialSelect: undefined,
  },
};

export const FilterByHasNoneChars: Story = {
  name: 'Filter (Has NONE of "т", "ж")',
  args: {
    limit: undefined,
    defaultLimit: 5,
    initialSorts: [],
    initialFilters: { has_none_chars: ['ц'], word_count_gt: 9 },
    initialSelect: undefined,
  },
};

export const FilterByAverageWordLengthGreaterThan: Story = {
  name: 'Filter (Avg Word Length > 5)',
  args: {
    limit: undefined,
    defaultLimit: 5,
    initialSorts: [],
    initialFilters: { avg_word_length_gt: 5 },
    initialSelect: undefined,
  },
};
