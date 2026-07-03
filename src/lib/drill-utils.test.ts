import { describe, expect, it } from 'vitest';

import {
  createDrillId,
  getAverageWordLength,
  getBigrams,
  getCharCount,
  getCharFrequency,
  getMaxWordLength,
  getSymbolFrequency,
  getTrigrams,
  getUniqueChars,
  getUniqueSymbols,
  getWordCount,
} from './drill-utils';

describe('createDrillId', () => {
  it('is the SHA-1 hex of the text (known vector)', () => {
    expect(createDrillId('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });

  it('is deterministic and collision-distinct', () => {
    expect(createDrillId('hello')).toBe(createDrillId('hello'));
    expect(createDrillId('hello')).not.toBe(createDrillId('world'));
  });
});

describe('getCharCount', () => {
  it('counts only alphabetic chars, case-insensitively', () => {
    expect(getCharCount('Hello, World!')).toBe(10);
  });

  it('counts Cyrillic letters', () => {
    expect(getCharCount('Привет, мир!')).toBe(9);
  });

  it('is 0 for a string without letters', () => {
    expect(getCharCount('123 !?')).toBe(0);
  });
});

describe('getWordCount', () => {
  it('counts whitespace-separated words, stripping punctuation', () => {
    expect(getWordCount('a, b, c')).toBe(3);
  });

  it('ignores leading/trailing whitespace and empty tokens', () => {
    expect(getWordCount('  hello   world  ')).toBe(2);
  });

  it('is 0 for empty text', () => {
    expect(getWordCount('')).toBe(0);
  });
});

describe('getAverageWordLength', () => {
  it('averages word lengths', () => {
    expect(getAverageWordLength('ab cd')).toBe(2);
  });

  it('rounds to two decimals', () => {
    expect(getAverageWordLength('a bb')).toBe(1.5);
  });

  it('is 0 when there are no words', () => {
    expect(getAverageWordLength('   ')).toBe(0);
  });
});

describe('getMaxWordLength', () => {
  it('finds the longest word length', () => {
    expect(getMaxWordLength('a bbb cc')).toBe(3);
  });

  it('is 0 when there are no words', () => {
    expect(getMaxWordLength('')).toBe(0);
  });
});

describe('getUniqueChars', () => {
  it('returns sorted, deduped, lowercased letters only', () => {
    expect(getUniqueChars('aAbb1 2')).toEqual(['a', 'b']);
  });
});

describe('getUniqueSymbols', () => {
  it('returns sorted, deduped characters including whitespace/punctuation', () => {
    expect(getUniqueSymbols('a b a')).toEqual([' ', 'a', 'b']);
  });
});

describe('getCharFrequency', () => {
  it('counts alphabetic chars lowercased', () => {
    expect(getCharFrequency('aAb!')).toEqual({ a: 2, b: 1 });
  });
});

describe('getSymbolFrequency', () => {
  it('counts every character verbatim', () => {
    expect(getSymbolFrequency('a a')).toEqual({ a: 2, ' ': 1 });
  });
});

describe('getBigrams', () => {
  it('extracts consecutive pairs', () => {
    expect(getBigrams('abc')).toEqual(['ab', 'bc']);
  });

  it('is empty for text shorter than 2', () => {
    expect(getBigrams('a')).toEqual([]);
  });
});

describe('getTrigrams', () => {
  it('extracts consecutive triples', () => {
    expect(getTrigrams('abcd')).toEqual(['abc', 'bcd']);
  });

  it('is empty for text shorter than 3', () => {
    expect(getTrigrams('ab')).toEqual([]);
  });
});
