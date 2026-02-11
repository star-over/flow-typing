// src/lib/string-normalization.ts
/**
 * Normalizes quotes from "ёлочки" («») to standard double quotes ("").
 */
export const replaceFancyQuotes = {
    name: 'Replace Fancy Quotes',
    apply: (text) => {
        return text.replace(/[«»„“‟‘’‛"”˝„〝〞〟`]/g, '"'); // Added backtick `
    },
};
/**
 * Replaces multiple consecutive spaces with a single standard space.
 */
export const normalizeSpaces = {
    name: 'Normalize Spaces',
    apply: (text) => {
        return text.replace(/\s{2,}/g, ' ');
    },
};
/**
 * Removes spaces before common punctuation marks.
 */
export const removeSpaceBeforePunctuation = {
    name: 'Remove Space Before Punctuation',
    apply: (text) => {
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
export const normalizeDashes = {
    name: 'Normalize Dashes',
    apply: (text) => {
        return text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');
    },
};
/**
 * Converts common ellipsis characters to three periods.
 */
export const normalizeEllipsis = {
    name: 'Normalize Ellipsis',
    apply: (text) => {
        return text.replace(/\u2026/g, '...');
    },
};
/**
 * Replaces common non-breaking space characters with a regular space.
 */
export const normalizeNonBreakingSpaces = {
    name: 'Normalize Non-Breaking Spaces',
    apply: (text) => {
        return text.replace(/[\u00A0\u202F]/g, ' ');
    },
};
/**
 * Replaces smart apostrophes with a standard apostrophe.
 */
export const normalizeApostrophes = {
    name: 'Normalize Apostrophes',
    apply: (text) => {
        return text.replace(/[\u2019\u2018]/g, "'");
    },
};
/**
 * The main function to normalize a string using a predefined set of rules.
 * Rules are applied in the order they appear in the `rules` array.
 *
 * @param text The input string to normalize.
 * @param rules An optional array of NormalizationRule objects to apply.
 *              If not provided, a default set of rules will be used.
 * @returns The normalized string.
 */
export function normalizeString(text, customRules) {
    const defaultRules = [
        normalizeNonBreakingSpaces,
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
