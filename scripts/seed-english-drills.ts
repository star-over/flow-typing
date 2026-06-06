#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const ENGLISH_SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'Hello, world!',
  'To be or not to be, that is the question.',
  'A journey of a thousand miles begins with a single step.',
  'Practice makes perfect.',
];

function sha1(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function extractWords(t: string): string[] {
  return t.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length > 0);
}

function analyse(text: string) {
  const chars = text.toLowerCase().match(/[a-z]/g) ?? [];
  const uniqueChars = [...new Set(chars)].sort();
  const uniqueSymbols = [...new Set(text.split(''))].sort();
  const charFreq: Record<string, number> = {};
  for (const c of chars) charFreq[c] = (charFreq[c] ?? 0) + 1;
  const symbolFreq: Record<string, number> = {};
  for (const c of text) symbolFreq[c] = (symbolFreq[c] ?? 0) + 1;
  const bigrams: string[] = [];
  for (let i = 0; i < text.length - 1; i++) bigrams.push(text.substring(i, i + 2));
  const trigrams: string[] = [];
  for (let i = 0; i < text.length - 2; i++) trigrams.push(text.substring(i, i + 3));
  const words = extractWords(text);
  return {
    char_count: chars.length,
    word_count: words.length,
    avg_word_length: words.length
      ? +(words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(2)
      : 0,
    max_word_length: words.length ? Math.max(...words.map(w => w.length)) : 0,
    unique_chars: uniqueChars,
    unique_symbols: uniqueSymbols,
    char_freq: charFreq,
    symbol_freq: symbolFreq,
    bigrams,
    trigrams,
  };
}

const outputPath = path.join(process.cwd(), 'src/data/drills/drills.jsonl');
const existing = fs.readFileSync(outputPath, 'utf-8').split('\n').filter(l => l.trim());
const existingIds = new Set(existing.map(l => JSON.parse(l).id));

const lines: string[] = [];
for (const text of ENGLISH_SENTENCES) {
  const id = sha1(text);
  if (existingIds.has(id)) continue;
  lines.push(JSON.stringify({ id, text, textLanguage: 'en', ...analyse(text) }));
}

if (lines.length > 0) {
  fs.appendFileSync(outputPath, lines.join('\n') + '\n');
}
console.log(`Seeded: ${lines.length} English drills`);
