#!/usr/bin/env node
/**
 * @file Конвертер jokes-CSV → plain text для корпуса. Читает CSV (файл или каталог
 * с *.csv; колонки `ID,Joke`), извлекает ТОЛЬКО текст шутки — без ID, шапки и
 * CSV-обвеса (кавычки/экранирование сняты парсером) — и пишет по одной шутке на
 * строку. Отбрасывает пустые и СЛИШКОМ ДЛИННЫЕ строки (> MAX_LEN символов, по
 * умолчанию 120 — предел под drill'ы печати; переопределяется `--max-len`).
 *
 * Запуск (Node ≥ 22, нативный TS — без tsc/dist):
 *   node auto-flow/scripts/jokes-csv-to-text.ts --input <csv|dir> [--output <dir>] [--max-len 120]
 * По умолчанию output — `auto-flow/data/en/derived`.
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const DEFAULT_MAX_LEN = 120;
const DEFAULT_OUTPUT_DIR = 'auto-flow/data/en/derived';

/**
 * Диалоговые / лейбл-строки: начинаются на «спикер:» (1–3 слова перед двоеточием —
 * `Q:`, `Teacher:`, `Fred:`, `First witch:`, `Police Chief:`, `Woman in bed:`… —
 * либо лейбл `Advertisement:`/`Definition:`/`HEADLINE:`) или на `Q.`/`A.` (Q&A-формат).
 * Исключаются как неестественная для набора проза.
 */
const DIALOGUE_PREFIX = /^[A-Za-z][A-Za-z'’-]*( [A-Za-z][A-Za-z'’-]*){0,2}:|^[QA]\./;

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

/**
 * Минимальный корректный CSV-парсер (RFC-4180-подобный): кавычки, экранирование
 * `""` → `"`, запятые и переводы строк ВНУТРИ кавычек. Возвращает массив строк-записей,
 * каждая — массив полей. Устойчив к CRLF и к незакавыченным полям.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  // Снять BOM, если есть.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } // экранированная кавычка
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* часть CRLF — игнор */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else { field += c; }
  }
  // Последнее поле/запись (файл без завершающего перевода строки).
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Извлечь тексты шуток из содержимого CSV: пропустить шапку, взять колонку `Joke` (индекс 1). */
function jokesFromCsv(text: string): string[] {
  const rows = parseCsv(text);
  const out: string[] = [];
  for (let i = 1; i < rows.length; i++) { // i=1 → пропустить шапку `ID,Joke`
    const joke = (rows[i]?.[1] ?? '').replace(/[\r\n]+/g, ' ').trim();
    if (joke) out.push(joke);
  }
  return out;
}

interface FileStat { name: string; total: number; written: number; tooLong: number; dialogue: number; duplicates: number; }

/** Конвертировать один CSV-файл → <outputDir>/<basename>.txt с лимитом длины. */
function convertFile({ inputPath, outputDir, maxLen }: {
  inputPath: string;
  outputDir: string;
  maxLen: number;
}): FileStat {
  const text = readFileSync(inputPath, 'utf-8');
  const jokes = jokesFromCsv(text);
  const kept: string[] = [];
  let tooLong = 0;
  let dialogue = 0;
  for (const joke of jokes) {
    if (DIALOGUE_PREFIX.test(joke)) { dialogue++; continue; }  // диалог/лейбл — исключить
    if ([...joke].length > maxLen) { tooLong++; continue; }    // «символов» = кодовые точки
    kept.push(joke);
  }
  // Дедупликация — ПОСЛЕДНИМ шагом, после всех фильтров (варианты могли сойтись к одинаковым).
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const joke of kept) {
    if (seen.has(joke)) continue;
    seen.add(joke);
    deduped.push(joke);
  }
  const duplicates = kept.length - deduped.length;
  const outName = basename(inputPath).replace(/\.csv$/i, '') + '.txt';
  const outPath = join(outputDir, outName);
  writeFileSync(outPath, deduped.length ? deduped.join('\n') + '\n' : '', 'utf-8');
  return { name: outName, total: jokes.length, written: deduped.length, tooLong, dialogue, duplicates };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input;
  if (!input) {
    console.error('Нужен --input <csv|dir>. Пример: --input auto-flow/data/en/raw/short-jokes-dataset/funjokes.csv');
    process.exit(1);
  }
  const outputDir = args.output ?? DEFAULT_OUTPUT_DIR;
  const maxLen = args['max-len'] !== undefined ? Number(args['max-len']) : DEFAULT_MAX_LEN;

  const stat = statSync(input);
  const files = stat.isDirectory()
    ? readdirSync(input).filter((f) => f.toLowerCase().endsWith('.csv')).map((f) => join(input, f))
    : [input];

  if (files.length === 0) { console.error(`Нет .csv в ${input}`); process.exit(1); }

  console.log(`Лимит длины: ${maxLen} символов. Выход: ${outputDir}`);
  for (const file of files) {
    const s = convertFile({ inputPath: file, outputDir, maxLen });
    console.log(`  ${s.name}: ${s.written} шуток (из ${s.total}; диалоговых: ${s.dialogue}, длинных > ${maxLen}: ${s.tooLong}, дубликатов: ${s.duplicates})`);
  }
}

main();
