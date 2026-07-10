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
    // Then, spaces before a hyphen — but ONLY when it clings to the next
    // word (`word -слитно`). A hyphen spaced on both sides is a dialogue /
    // apposition dash (`реплика - ответ`) and must keep its spaces.
    result = result.replace(/\s+(-)(?!\s)/g, '$1');
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
 * \u041f\u0440\u0438\u0432\u043e\u0434\u0438\u0442 \u0441\u0442\u0440\u043e\u043a\u0443 \u043a \u043a\u0430\u043d\u043e\u043d\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u0444\u043e\u0440\u043c\u0435 Unicode (NFC): \u0441\u043e\u0441\u0442\u0430\u0432\u043d\u044b\u0435 \u00ab\u0435 + \u25cc\u0301\u00bb \u0438 \u0442.\u043f.
 * \u0441\u043e\u0431\u0438\u0440\u0430\u044e\u0442\u0441\u044f \u0432 \u043e\u0434\u0438\u043d \u043a\u043e\u0434\u043f\u043e\u0438\u043d\u0442. \u0414\u043e\u043b\u0436\u043d\u043e \u0438\u0434\u0442\u0438 \u043f\u0435\u0440\u0432\u044b\u043c.
 */
export const normalizeUnicodeForm: NormalizationRule = {
  name: 'Normalize Unicode (NFC)',
  apply: (text: string): string => text.normalize('NFC'),
};

/**
 * \u0420\u0430\u0441\u043a\u043e\u0434\u0438\u0440\u0443\u0435\u0442 \u0431\u0430\u0437\u043e\u0432\u044b\u0435 HTML/XML-\u0441\u0443\u0449\u043d\u043e\u0441\u0442\u0438 (\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u2014 XML-\u043a\u043e\u0440\u043f\u0443\u0441).
 * `&amp;` \u2014 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u043c, \u0447\u0442\u043e\u0431\u044b \u043d\u0435 \u0431\u044b\u043b\u043e \u0434\u0432\u043e\u0439\u043d\u043e\u0433\u043e \u0440\u0430\u0441\u043a\u043e\u0434\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f (`&amp;quot;`).
 */
export const decodeHtmlEntities: NormalizationRule = {
  name: 'Decode HTML Entities',
  apply: (text: string): string =>
    text
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&'),
};

/**
 * \u0423\u0434\u0430\u043b\u044f\u0435\u0442 \u043d\u0435\u0432\u0438\u0434\u0438\u043c\u044b\u0435 \u0441\u0438\u043c\u0432\u043e\u043b\u044b: \u043d\u0443\u043b\u0435\u0432\u0430\u044f \u0448\u0438\u0440\u0438\u043d\u0430 (U+200B\u2013200D, U+FEFF) \u0438
 * \u043c\u044f\u0433\u043a\u0438\u0439 \u043f\u0435\u0440\u0435\u043d\u043e\u0441 (U+00AD).
 */
export const stripZeroWidth: NormalizationRule = {
  name: 'Strip Zero-Width',
  apply: (text: string): string => text.replace(/[\u200b-\u200d\ufeff\u00ad]/g, ''),
};

/**
 * \u041f\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0442\u0430\u0431\u044b \u0438 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u044b \u0441\u0442\u0440\u043e\u043a \u0432 \u043e\u0431\u044b\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0431\u0435\u043b (\u0441\u0445\u043b\u043e\u043f\u044b\u0432\u0430\u043d\u0438\u0435 \u2014 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u043c
 * \u043f\u0440\u0430\u0432\u0438\u043b\u043e\u043c normalizeSpaces \u043d\u0438\u0436\u0435).
 */
export const normalizeTabsAndNewlines: NormalizationRule = {
  name: 'Normalize Tabs and Newlines',
  apply: (text: string): string => text.replace(/[\t\n\r\f\v]/g, ' '),
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
    normalizeUnicodeForm, // канонический вид Unicode — раньше всех
    decodeHtmlEntities, // &quot; → " (до нормализации кавычек)
    stripZeroWidth, // убрать невидимые символы
    normalizeNonBreakingSpaces, // Process non-breaking spaces first to ensure consistent space handling
    normalizeTabsAndNewlines, // табы/переводы строк → пробел (до схлопывания)
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
