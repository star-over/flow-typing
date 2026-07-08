#!/usr/bin/env node
/**
 * @file Очистка + дедупликация корпуса → plain `.txt` (БЕЗ `drills.jsonl`).
 *
 * Прогоняет каждый источник через ШТАТНЫЙ конвейер `buildDrills`
 * (clean → segment → фильтры: начало/длина/доля-букв/членство → дедуп) и пишет
 * только ОЧИЩЕННЫЕ строки (поле `text`), по одной на строку. Мета и `drills.jsonl`
 * НЕ создаются — их собирает `build-corpus` на ФИНАЛЬНОМ шаге, когда все источники
 * почищены. Это промежуточный этап: чистим тексты по одному, потом собираем корпус.
 *
 * Запуск (Node ≥ 22, нативный TS — без tsc/dist):
 *   node auto-flow/scripts/clean-corpus.ts --input <txt|dir> [--layout qwerty] [--output <dir>]
 * Файл → <output>/<basename>.txt; каталог → каждый *.txt отдельно (свой дедуп на файл).
 * По умолчанию --output = каталог входа (чистка «на месте»), --layout = qwerty.
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { buildDrills, DEFAULT_BUILD_OPTIONS } from './pipeline.ts';
import { loadSymbolLayout } from '../symbol-layout.ts';

const DEFAULT_LAYOUT = 'qwerty';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token?.startsWith('--')) continue;
    const value = argv[i + 1];
    if (value !== undefined && !value.startsWith('--')) { args[token.slice(2)] = value; i++; }
    else { args[token.slice(2)] = 'true'; }
  }
  return args;
}

interface CleanStat { name: string; inputLines: number; kept: number; rejected: number; duplicates: number; }

/** Прогнать один .txt через конвейер и записать очищенные строки в <outputDir>/<basename>.txt. */
function cleanFile({ inputPath, outputDir, symbolSet }: {
  inputPath: string;
  outputDir: string;
  symbolSet: ReadonlySet<string>;
}): CleanStat {
  const texts = readFileSync(join(process.cwd(), inputPath), 'utf-8').split('\n');
  const { drills, stats } = buildDrills({ texts, symbolSet, options: DEFAULT_BUILD_OPTIONS });
  const outPath = join(process.cwd(), outputDir, basename(inputPath));
  writeFileSync(outPath, drills.length ? drills.map((d) => d.text).join('\n') + '\n' : '', 'utf-8');
  return {
    name: basename(inputPath),
    inputLines: stats.inputTexts,
    kept: stats.kept,
    rejected: stats.rejected,
    duplicates: stats.duplicates,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input;
  if (!input) {
    console.error('Нужен --input <txt|dir>. Пример: --input auto-flow/data/en/derived/funjokes.txt');
    process.exit(1);
  }
  const layout = args.layout ?? DEFAULT_LAYOUT;
  const symbolSet = new Set(loadSymbolLayout(layout).map((entry) => entry.symbol));

  const abs = join(process.cwd(), input);
  const files = statSync(abs).isDirectory()
    ? readdirSync(abs).filter((f) => f.endsWith('.txt')).sort().map((f) => join(input, f))
    : [input];
  const outputDir = args.output ?? (statSync(abs).isDirectory() ? input : dirname(input));

  console.log(`Раскладка (для фильтра членства): ${layout} (${symbolSet.size} символов). Выход: ${outputDir}`);
  for (const file of files) {
    const s = cleanFile({ inputPath: file, outputDir, symbolSet });
    console.log(`  ${s.name}: ${s.kept} строк (из ${s.inputLines}; отброшено: ${s.rejected}, дубликатов: ${s.duplicates})`);
  }
}

main();
