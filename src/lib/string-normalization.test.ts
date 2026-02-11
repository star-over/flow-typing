// src/lib/string-normalization.test.ts

import { describe, it, expect } from 'vitest';
import {
  normalizeString,
  replaceFancyQuotes,
  normalizeSpaces,
  removeSpaceBeforePunctuation,
  normalizeDashes,
  normalizeEllipsis,
  normalizeNonBreakingSpaces,
  normalizeApostrophes,
} from './string-normalization';

describe('replaceFancyQuotes', () => {
  it('should replace « and »', () => {
    expect(replaceFancyQuotes.apply('«Hello»')).toBe('"Hello"');
  });
  it('should replace „ and “', () => {
    expect(replaceFancyQuotes.apply('„World“')).toBe('"World"');
  });
  it('should replace “ and ”', () => {
    expect(replaceFancyQuotes.apply('“Test”')).toBe('"Test"');
  });
  it('should handle multiple types of quotes', () => {
    expect(replaceFancyQuotes.apply('«“Hello”»')).toBe('""Hello""');
  });
  it('should not affect standard double quotes', () => {
    expect(replaceFancyQuotes.apply('"Already correct"')).toBe('"Already correct"');
  });
});

describe('normalizeSpaces', () => {
  it('should replace multiple spaces with a single space', () => {
    expect(normalizeSpaces.apply('Hello   World')).toBe('Hello World');
  });
  it('should not affect single spaces', () => {
    expect(normalizeSpaces.apply('Hello World')).toBe('Hello World');
  });
  it('should not trim leading or trailing spaces', () => {
    expect(normalizeSpaces.apply('  Leading and trailing  ')).toBe(' Leading and trailing ');
  });
});

describe('removeSpaceBeforePunctuation', () => {
  it('should remove space before a comma', () => {
    expect(removeSpaceBeforePunctuation.apply('Hello , world')).toBe('Hello, world');
  });
  it('should remove space before a period', () => {
    expect(removeSpaceBeforePunctuation.apply('Test .')).toBe('Test.');
  });
  it('should remove multiple spaces before punctuation', () => {
    expect(removeSpaceBeforePunctuation.apply('Question   ?')).toBe('Question?');
  });
  it('should not affect text without such spaces', () => {
    expect(removeSpaceBeforePunctuation.apply('Hello, world!')).toBe('Hello, world!');
  });
});

describe('normalizeDashes', () => {
  it('should replace em dash (—)', () => {
    expect(normalizeDashes.apply('An em—dash')).toBe('An em-dash');
  });
  it('should replace en dash (–)', () => {
    expect(normalizeDashes.apply('An en–dash')).toBe('An en-dash');
  });
  it('should replace multiple types of dashes in one string', () => {
    expect(normalizeDashes.apply('Here—is–a—dash')).toBe('Here-is-a-dash');
  });
});

describe('normalizeEllipsis', () => {
  it('should replace ellipsis character with three periods', () => {
    expect(normalizeEllipsis.apply('Wait for it…')).toBe('Wait for it...');
  });
  it('should not affect three periods', () => {
    expect(normalizeEllipsis.apply('Wait for it...')).toBe('Wait for it...');
  });
});

describe('normalizeNonBreakingSpaces', () => {
  it('should replace non-breaking space (U+00A0)', () => {
    expect(normalizeNonBreakingSpaces.apply('10\u00A0mm')).toBe('10 mm');
  });
  it('should replace narrow no-break space (U+202F)', () => {
    expect(normalizeNonBreakingSpaces.apply('10\u202Fmm')).toBe('10 mm');
  });
});

describe('normalizeApostrophes', () => {
  it('should replace right single quotation mark (U+2019)', () => {
    expect(normalizeApostrophes.apply("It’s")).toBe("It's");
  });
  it('should replace left single quotation mark (U+2018)', () => {
    expect(normalizeApostrophes.apply("‘Tis")).toBe("'Tis");
  });
});

describe('normalizeString function (Complex)', () => {
  it('should apply all default rules correctly in order', () => {
    const input = '« Это   —   текст   с   разными   „символами“  и  пробелами ; \u2014 и  множеством\u00A0точек\u2026»';
    const expected = '" Это- текст с разными "символами" и пробелами;- и множеством точек..."';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should handle complex input with various issues', () => {
    const input = '   “ Hello — World ”   .   This   is   a   test \u2013 text\u2026  with   non\u00A0breaking   spaces .   ';
    const expected = '" Hello- World ". This is a test- text... with non breaking spaces.';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should return an empty string for empty input', () => {
    expect(normalizeString('')).toBe('');
  });

  it('should handle string with only spaces', () => {
    expect(normalizeString('   ')).toBe('');
  });
});
