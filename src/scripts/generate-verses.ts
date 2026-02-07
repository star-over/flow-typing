#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Verse, VerseSchema } from '../interfaces/verse-data.types';
import {
  generateVerseId,
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
} from '../lib/verse-utils'; // Ensure this path is correct

const inputSentencesPath = path.join(process.cwd(), 'tmp/ru/input-sentences.txt');
const outputVersesPath = path.join(process.cwd(), 'src/data/verses/verses.json');

async function generateVerses() {
  console.log('Starting verse generation process...');

  // 1. Read input sentences
  let sentences: string[];
  try {
    const rawInput = await fs.promises.readFile(inputSentencesPath, 'utf-8');
    sentences = rawInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
    console.log(`Read ${sentences.length} sentences from ${inputSentencesPath}`);
  } catch (error) {
    console.error(`Error reading input sentences file: ${error}`);
    return;
  }

  // 2. Read existing verses
  let existingVerses: Verse[] = [];
  try {
    const rawExisting = await fs.promises.readFile(outputVersesPath, 'utf-8');
    existingVerses = JSON.parse(rawExisting);
    console.log(`Read ${existingVerses.length} existing verses from ${outputVersesPath}`);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      console.log('No existing verses file found, starting fresh.');
    } else {
      console.error(`Error reading existing verses file: ${error}`);
      return;
    }
  }

  const existingVerseIds = new Set(existingVerses.map((v) => v.id));
  const newVerses: Verse[] = [];

  // 3. Process each new sentence
  for (const sentence of sentences) {
    const id = generateVerseId(sentence);

    if (existingVerseIds.has(id)) {
      console.log(`Skipping duplicate verse: "${sentence.substring(0, 50)}..."`);
      continue;
    }

    const verseData: Verse = {
      id: id,
      verse: sentence,
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

    // Validate against schema (optional, but good for robustness)
    try {
      VerseSchema.parse(verseData);
      newVerses.push(verseData);
      console.log(`Generated data for new verse: "${sentence.substring(0, 50)}..."`);
    } catch (validationError) {
      console.error(`Validation failed for verse "${sentence}":`, validationError);
    }
  }

  if (newVerses.length === 0) {
    console.log('No new verses to add. Exiting.');
    return;
  }

  // 4. Combine and write updated verses
  const updatedVerses = [...existingVerses, ...newVerses];
  try {
    await fs.promises.writeFile(outputVersesPath, JSON.stringify(updatedVerses), 'utf-8');
    console.log(`Successfully updated ${outputVersesPath} with ${newVerses.length} new verses. Total verses: ${updatedVerses.length}`);
  } catch (error) {
    console.error(`Error writing updated verses to file: ${error}`);
  }
}

generateVerses();
