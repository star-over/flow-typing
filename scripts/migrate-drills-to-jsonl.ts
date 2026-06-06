#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';

const CYRILLIC = /[а-яё]/i;
const LATIN = /[a-z]/i;

function detect(uniqueChars: string[]): 'en' | 'ru' | 'mixed' | 'neutral' {
  const hasCyr = uniqueChars.some(c => CYRILLIC.test(c));
  const hasLat = uniqueChars.some(c => LATIN.test(c));
  if (hasCyr && hasLat) return 'mixed';
  if (hasCyr) return 'ru';
  if (hasLat) return 'en';
  return 'neutral';
}

const cwd = process.cwd();
const inputPath = path.join(cwd, 'src/data/drills/drills.json');
const outputPath = path.join(cwd, 'src/data/drills/drills.jsonl');

const drills: { id: string; unique_chars: string[] }[] = JSON.parse(
  fs.readFileSync(inputPath, 'utf-8')
);

const migrated: string[] = [];
const dropped: { id: string; reason: string }[] = [];

for (const d of drills) {
  const lang = detect(d.unique_chars);
  if (lang === 'mixed' || lang === 'neutral') {
    dropped.push({ id: d.id, reason: lang });
    continue;
  }
  migrated.push(JSON.stringify({ ...d, textLanguage: lang }));
}

fs.writeFileSync(outputPath, migrated.join('\n') + '\n');
console.log(`Migrated: ${migrated.length}`);
console.log(`Dropped:  ${dropped.length}`);
if (dropped.length > 0) console.log('Dropped drills:', dropped);
