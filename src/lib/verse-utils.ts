import crypto from 'crypto';

/**
 * Generates a SHA-1 hash of the input text to serve as a unique ID for the verse.
 * @param text The verse text.
 * @returns A SHA-1 hash string.
 */
export function generateVerseId(text: string): string {
  return crypto.createHash('sha1').update(text).digest('hex');
}



/**
 * Extracts words from text, converting to lowercase and stripping non-alphabetic characters.
 * @param text The input text.
 * @returns An array of cleaned words.
 */
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zа-яё]/g, '')) // Remove non-alphabetic chars
    .filter((word) => word.length > 0);
}

/**
 * Counts alphabetic characters in the text.
 * @param text The verse text.
 * @returns The count of alphabetic characters.
 */
export function getCharCount(text: string): number {
  return (text.toLowerCase().match(/[a-zа-яё]/g) || []).length;
}

/**
 * Counts words in the text.
 * @param text The verse text.
 * @returns The count of words.
 */
export function getWordCount(text: string): number {
  return extractWords(text).length;
}

/**
 * Calculates the average word length in the text.
 * @param text The verse text.
 * @returns The average word length.
 */
export function getAverageWordLength(text: string): number {
  const words = extractWords(text);
  if (words.length === 0) return 0;
  const totalLength = words.reduce((sum, word) => sum + word.length, 0);
  return parseFloat((totalLength / words.length).toFixed(2));
}

/**
 * Finds the maximum word length in the text.
 * @param text The verse text.
 * @returns The maximum word length.
 */
export function getMaxWordLength(text: string): number {
  const words = extractWords(text);
  if (words.length === 0) return 0;
  return Math.max(...words.map((word) => word.length));
}

/**
 * Extracts unique alphabetic characters from the text, lowercased.
 * @param text The verse text.
 * @returns An array of unique alphabetic characters.
 */
export function getUniqueChars(text: string): string[] {
  const chars = (text.toLowerCase().match(/[a-zа-яё]/g) || []);
  return Array.from(new Set(chars)).sort();
}

/**
 * Extracts unique symbols (all characters) from the text.
 * @param text The verse text.
 * @returns An array of unique symbols.
 */
export function getUniqueSymbols(text: string): string[] {
  return Array.from(new Set(text.split(''))).sort();
}

/**
 * Calculates the frequency of alphabetic characters in the text, lowercased.
 * @param text The verse text.
 * @returns A record of character frequencies.
 */
export function getCharFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const char of text.toLowerCase()) {
    if (/[a-zа-яё]/.test(char)) {
      freq[char] = (freq[char] || 0) + 1;
    }
  }
  return freq;
}

/**
 * Calculates the frequency of all symbols in the text.
 * @param text The verse text.
 * @returns A record of symbol frequencies.
 */
export function getSymbolFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}

/**
 * Extracts bigrams (sequences of two characters) from the text.
 * @param text The verse text.
 * @returns An array of bigrams.
 */
export function getBigrams(text: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.push(text.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Extracts trigrams (sequences of three characters) from the text.
 * @param text The verse text.
 * @returns An array of trigrams.
 */
export function getTrigrams(text: string): string[] {
  const trigrams: string[] = [];
  for (let i = 0; i < text.length - 2; i++) {
    trigrams.push(text.substring(i, i + 3));
  }
  return trigrams;
}