#!/usr/bin/env node
/**
 * @file Скрипт-оболочка конвейера корпуса. Читает текстовый источник (одно
 * предложение на строку), гонит через чистый конвейер `buildDrills`, пишет
 * выгрузку `drills.jsonl` и печатает статистику + дыры покрытия раскладки.
 *
 * Запуск (Node ≥ 22, нативный TS — без tsc/dist): `make build-corpus` или
 *   node auto-flow/scripts/build-corpus.ts --input <txt> --layout <id>
 * Заливка в Convex — отдельным шагом `make import-corpus` (convex import).
 *
 * Раскладка — параметр: набор её символов читается из
 * `src/data/layouts/symbol-layout-<file>.jsonl` (данные приложения, читаем по
 * пути). Относительные импорты с расширением `.ts` — требование Node-ESM.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDrills, DEFAULT_BUILD_OPTIONS } from '../corpus/pipeline.ts';
import { loadSymbolLayout } from '../symbol-layout.ts';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token?.startsWith('--')) continue;
    const value = argv[i + 1];
    if (value !== undefined && !value.startsWith('--')) {
      args[token.slice(2)] = value;
      i++;
    } else {
      args[token.slice(2)] = 'true';
    }
  }
  return args;
}

function num(value: string | undefined, fallback: number): number {
  return value === undefined ? fallback : Number(value);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const layout = args.layout ?? 'йцукен';
  const input = args.input ?? 'auto-flow/data/ru_corp.txt';
  const output = args.output ?? 'auto-flow/data/drills.jsonl';

  const symbolSet = new Set(loadSymbolLayout(layout).map((entry) => entry.symbol));
  const texts = readFileSync(join(process.cwd(), input), 'utf-8').split('\n');

  const options = {
    minLength: num(args['min-length'], DEFAULT_BUILD_OPTIONS.minLength),
    maxLength: num(args['max-length'], DEFAULT_BUILD_OPTIONS.maxLength),
    minLetterRatio: num(args['min-letter-ratio'], DEFAULT_BUILD_OPTIONS.minLetterRatio),
  };

  const { drills, coverage, stats } = buildDrills({ texts, symbolSet, options });

  writeFileSync(
    join(process.cwd(), output),
    drills.map((drill) => JSON.stringify(drill)).join('\n') + '\n',
    'utf-8'
  );

  console.log(`\nРаскладка: ${layout} (${symbolSet.size} символов)`);
  console.log(`Источник:  ${input}`);
  console.log(`Выгрузка:  ${output}`);
  console.log('—');
  console.log(`Строк на входе:   ${stats.inputTexts}`);
  console.log(`Единиц:           ${stats.units}`);
  console.log(`Оставлено:        ${stats.kept}`);
  console.log(`Отброшено:        ${stats.rejected}`);
  console.log(`Дубликатов:       ${stats.duplicates}`);
  console.log(`Покрыто символов: ${coverage.covered.length}/${symbolSet.size}`);
  console.log(
    coverage.missing.length > 0
      ? `Дыры покрытия (${coverage.missing.length}): ${coverage.missing.map((s) => JSON.stringify(s)).join(' ')}`
      : 'Дыры покрытия:    нет'
  );
}

main();
