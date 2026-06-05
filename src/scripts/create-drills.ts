#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type Drill, DrillSchema } from '../interfaces/drill-data.types';
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
} from '../lib/drill-utils'; // Ensure this path is correct

const inputSentencesPath = path.join(process.cwd(), 'tmp/ru/input-sentences.txt');
const outputDrillsPath = path.join(process.cwd(), 'src/data/drills/drills.json');

async function createDrills() {
  console.log('Starting drill generation process...');

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

  // 2. Read existing drills
  let existingDrills: Drill[] = [];
  try {
    const rawExisting = await fs.promises.readFile(outputDrillsPath, 'utf-8');
    existingDrills = JSON.parse(rawExisting);
    console.log(`Read ${existingDrills.length} existing drills from ${outputDrillsPath}`);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      console.log('No existing drills file found, starting fresh.');
    } else {
      console.error(`Error reading existing drills file: ${error}`);
      return;
    }
  }

  const existingDrillIds = new Set(existingDrills.map((v) => v.id));
  const newDrills: Drill[] = [];

  // 3. Process each new sentence
  for (const sentence of sentences) {
    const id = createDrillId(sentence);

    if (existingDrillIds.has(id)) {
      console.log(`Skipping duplicate drill: "${sentence.substring(0, 50)}..."`);
      continue;
    }

    const drillData: Drill = {
      id: id,
      text: sentence,
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
      DrillSchema.parse(drillData);
      newDrills.push(drillData);
      console.log(`Generated data for new drill: "${sentence.substring(0, 50)}..."`);
    } catch (validationError) {
      console.error(`Validation failed for drill "${sentence}":`, validationError);
    }
  }

  if (newDrills.length === 0) {
    console.log('No new drills to add. Exiting.');
    return;
  }

  // 4. Combine and write updated drills
  const updatedDrills = [...existingDrills, ...newDrills];
  try {
    await fs.promises.writeFile(outputDrillsPath, JSON.stringify(updatedDrills), 'utf-8');
    console.log(`Successfully updated ${outputDrillsPath} with ${newDrills.length} new drills. Total drills: ${updatedDrills.length}`);
  } catch (error) {
    console.error(`Error writing updated drills to file: ${error}`);
  }
}

createDrills();
