/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useLiveQuery, eq } from '@tanstack/react-db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { versesCollection } from '@/lib/verses.db';
import { InitialQueryBuilder } from '@tanstack/db';
import { Verse } from '@/interfaces/verse-data.types'; // Import Verse type for SortArgs

const queryClient = new QueryClient();

// Define SortArgs type
type SortArgs = { field: keyof Verse; direction: 'asc' | 'desc' }[];

// Define InitialFilters type (for char_count only for now)
type InitialFilters = {
  char_count?: number;
};

// Making the component accept props
const VersesQueryDemo: React.FC<{ limit?: number; initialSorts?: SortArgs; defaultLimit?: number; initialFilters?: InitialFilters }> = ({ limit, initialSorts = [], defaultLimit, initialFilters = {} }) => {
  const effectiveLimit = limit !== undefined ? limit : (defaultLimit !== undefined ? defaultLimit : undefined); // Use defaultLimit if limit is not provided

  const { data: verses, isLoading, isError } = useLiveQuery(
    (q: InitialQueryBuilder) => {
      let queryExpression = q.from({ verse: versesCollection }); // Start query builder

      // Apply filtering logic for char_count
      if (initialFilters.char_count !== undefined) {
        queryExpression = queryExpression.where((refs) => eq(refs.verse.char_count, initialFilters.char_count!)); // FIXED HERE
      }

      // Apply sorting logic first, as it's required for limit/offset
      if (initialSorts.length > 0) {
        for (const sort of initialSorts) {
          queryExpression = queryExpression.orderBy(({ verse }: { verse: any }) => verse[sort.field], sort.direction);
        }
      } else if (effectiveLimit !== undefined) {
        // If effectiveLimit is used but no specific sort is provided, default to sorting by id
        queryExpression = queryExpression.orderBy(({ verse }: { verse: any }) => verse.id, 'asc');
      }

      // Apply effectiveLimit
      if (effectiveLimit !== undefined) {
        queryExpression = queryExpression.limit(effectiveLimit);
      }

      // Explicitly select all fields of the Verse object
      return queryExpression.select(({ verse }: { verse: any }) => ({
        id: verse.id,
        verse: verse.verse,
        char_count: verse.char_count,
        word_count: verse.word_count,
        avg_word_length: verse.avg_word_length,
        max_word_length: verse.max_word_length,
        unique_chars: verse.unique_chars,
        unique_symbols: verse.unique_symbols,
        char_freq: verse.char_freq,
        symbol_freq: verse.symbol_freq,
        bigrams: verse.bigrams,
        trigrams: verse.trigrams,
      }));
    },
    [effectiveLimit, initialSorts, initialFilters] // useLiveQuery dependencies: re-run if any of these change
  );

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: An unknown error occurred.</div>; // Generic error message
  if (!verses) return <div>No data returned.</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
      <h3>Query Results ({verses.length} found)</h3>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8em', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto' }}>
        {JSON.stringify(verses, null, 2)}
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
      description: 'Filters to apply (e.g., `{ char_count: 8 }`)',
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
  },
};

export const SingleVerse: Story = {
  name: 'Single Verse (limit: 1, sorted by ID)',
  args: {
    limit: 1,
    initialSorts: [], // Sorts will be default by ID if not provided
    initialFilters: {}, // Add initialFilters to existing stories
  },
};

export const SortByWordCountDesc: Story = {
  name: 'Sorted by Word Count Desc (default limited)',
  args: {
    limit: undefined,
    defaultLimit: 5,
    initialSorts: [{ field: 'word_count', direction: 'desc' }],
    initialFilters: {}, // Add initialFilters to existing stories
  },
};

export const FilterByCharCount: Story = {
  name: 'Filter by Char Count (char_count: 8)',
  args: {
    limit: undefined, // Will use defaultLimit
    defaultLimit: 5,
    initialSorts: [],
    initialFilters: { char_count: 8 },
  },
};