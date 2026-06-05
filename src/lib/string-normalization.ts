// src/lib/string-normalization.ts

/**
 * Interface for a string normalization rule.
 */
export interface NormalizationRule {
  name: string;
  apply: (text: string) => string;
}

/**
 * Normalizes quotes from "ёлочки" («») to standard double quotes ("").
 */
export const replaceFancyQuotes: NormalizationRule = {
  name: 'Replace Fancy Quotes',
  apply: (text: string): string => {
    return text.replace(/[«»„“‟‘’‛"”˝„〝〞〟`]/g, '"'); // Added backtick `
  },
};

/**
 * Replaces multiple consecutive spaces with a single standard space.
 */
export const normalizeSpaces: NormalizationRule = {
  name: 'Normalize Spaces',
  apply: (text: string): string => {
    return text.replace(/\s{2,}/g, ' ');
  },
};

/**
 * Removes spaces before common punctuation marks.
 */
export const removeSpaceBeforePunctuation: NormalizationRule = {
  name: 'Remove Space Before Punctuation',
  apply: (text: string): string => {
    // First, handle all standard punctuation
    let result = text.replace(/\s+([.,!?;:])/g, '$1');
    // Then, specifically handle spaces before a hyphen
    result = result.replace(/\s+(-)/g, '$1');
    return result;
  },
};

/**
 * Replaces various types of dashes (em dash, en dash, etc.) with a standard hyphen.
 */
export const normalizeDashes: NormalizationRule = {
  name: 'Normalize Dashes',
  apply: (text: string): string => {
    return text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');
  },
};

/**
 * Converts common ellipsis characters to three periods.
 */
export const normalizeEllipsis: NormalizationRule = {
  name: 'Normalize Ellipsis',
  apply: (text: string): string => {
    return text.replace(/\u2026/g, '...');
  },
};

/**
 * Replaces common non-breaking space characters with a regular space.
 */
export const normalizeNonBreakingSpaces: NormalizationRule = {
  name: 'Normalize Non-Breaking Spaces',
  apply: (text: string): string => {
    return text.replace(/[\u00A0\u202F]/g, ' ');
  },
};

/**
 * Replaces smart apostrophes with a standard apostrophe.
 */
export const normalizeApostrophes: NormalizationRule = {
  name: 'Normalize Apostrophes',
  apply: (text: string): string => {
    return text.replace(/[\u2019\u2018]/g, "'");
  },
};


/**
 * Normalizes a string using a predefined set of rules.
 * Rules are applied in the order they appear in the `rules` array.
 * `customRules` overrides the default rule set entirely.
 */
export function normalizeString({
  text,
  customRules,
}: {
  text: string;
  customRules?: NormalizationRule[];
}): string {
  const defaultRules: NormalizationRule[] = [
    normalizeNonBreakingSpaces, // Process non-breaking spaces first to ensure consistent space handling
    replaceFancyQuotes,
    normalizeDashes,
    normalizeEllipsis,
    normalizeApostrophes,
    removeSpaceBeforePunctuation,
    normalizeSpaces, // Normalize spaces after other rules might have introduced or removed them
  ];

  const rulesToApply = customRules || defaultRules;

  let normalizedText = text;
  for (const rule of rulesToApply) {
    normalizedText = rule.apply(normalizedText);
  }

  // Final trim to remove any leading/trailing spaces that might result from normalization
  return normalizedText.trim();
}
