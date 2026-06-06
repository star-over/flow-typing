#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DrillSchema } from '../interfaces/drill-data.types';
import {
  createDrillId,
  getCharCount,
  getWordCount,
  getAverageWordLength,
  getMaxWordLength,
  getUniqueChars,
  getUniqueSymbols,
  getCharFrequency,
  getSymbolFrequency,
  getBigrams,
  getTrigrams,
} from '../lib/drill-utils';

const CYRILLIC = /[а-яё]/i;
const LATIN = /[a-z]/i;

function detectTextLanguage(text: string): 'en' | 'ru' | null {
  const hasCyr = CYRILLIC.test(text);
  const hasLat = LATIN.test(text);
  if (hasCyr && !hasLat) return 'ru';
  if (hasLat && !hasCyr) return 'en';
  return null;
}

const cwd = process.cwd();
const inputPath = path.join(cwd, 'tmp/input-sentences.txt');
const outputPath = path.join(cwd, 'src/data/drills/drills.jsonl');

async function main() {
  const raw = await fs.promises.readFile(inputPath, 'utf-8');
  const sentences = raw.split('\n').map(s => s.trim()).filter(s => s.length > 0);

  // Существующие ID — читаем построчно
  const existingIds = new Set<string>();
  if (fs.existsSync(outputPath)) {
    const existing = await fs.promises.readFile(outputPath, 'utf-8');
    for (const line of existing.split('\n')) {
      if (line.trim()) existingIds.add(JSON.parse(line).id);
    }
  }

  const newLines: string[] = [];
  for (const sentence of sentences) {
    const id = createDrillId(sentence);
    if (existingIds.has(id)) continue;

    const textLanguage = detectTextLanguage(sentence);
    if (!textLanguage) {
      console.warn(`Skipped (mixed or neutral): "${sentence}"`);
      continue;
    }

    const drill = {
      id,
      text: sentence,
      textLanguage,
      char_count: getCharCount(sentence),
      word_count: getWordCount(sentence),
      avg_word_length: getAverageWordLength(sentence),
      max_word_length: getMaxWordLength(sentence),
      unique_chars: getUniqueChars(sentence),
      unique_symbols: getUniqueSymbols(sentence),
      char_freq: getCharFrequency(sentence),
      symbol_freq: getSymbolFrequency(sentence),
      bigrams: getBigrams(sentence),
      trigrams: getTrigrams(sentence),
    };

    try {
      DrillSchema.parse(drill);
      newLines.push(JSON.stringify(drill));
    } catch (e) {
      console.error(`Validation failed for "${sentence}":`, e);
    }
  }

  if (newLines.length === 0) {
    console.log('No new drills to append.');
    return;
  }

  await fs.promises.appendFile(outputPath, newLines.join('\n') + '\n');
  console.log(`Appended ${newLines.length} new drills to ${outputPath}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
