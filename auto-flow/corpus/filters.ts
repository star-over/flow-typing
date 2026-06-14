/**
 * @file Шаг 3 конвейера: предикаты-фильтры качества единицы. Дешёвые проверки
 * идут раньше дорогих (см. pipeline). Все — чистые функции.
 */

const LETTER_RE = /\p{L}/u;
/** Первый символ — буква или цифра; допустима одна открывающая кавычка перед ним. */
const LEADING_OK_RE = /^["']?[\p{L}\p{N}]/u;

/**
 * Единица начинается «по-человечески»: с буквы, цифры или кавычки. Отсекает
 * корпусные артефакты — реплики через тире (`— …`), `-- …`, ведущее многоточие.
 */
export function startsValid(text: string): boolean {
  return LEADING_OK_RE.test(text);
}

/** Длина (в кодпоинтах) в границах [min, max]. */
export function withinLength({
  text,
  min,
  max,
}: {
  text: string;
  min: number;
  max: number;
}): boolean {
  const length = [...text].length;
  return length >= min && length <= max;
}

/**
 * Доля букв среди всех символов не ниже порога. Ловит цифро-пунктуационный
 * мусор («1, 2, 3 … 10.»), таблично-формульные фрагменты.
 */
export function letterRatioOk({ text, minRatio }: { text: string; minRatio: number }): boolean {
  const chars = [...text];
  if (chars.length === 0) return false;
  const letters = chars.filter((c) => LETTER_RE.test(c)).length;
  return letters / chars.length >= minRatio;
}

/** Все символы текста принадлежат набору символов раскладки (членство). */
export function allSymbolsInLayout({
  text,
  symbolSet,
}: {
  text: string;
  symbolSet: ReadonlySet<string>;
}): boolean {
  for (const ch of text) {
    if (!symbolSet.has(ch)) return false;
  }
  return true;
}
