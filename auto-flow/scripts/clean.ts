/**
 * @file Шаг 1 конвейера: чистка сырой строки корпуса. Делегирует общим правилам
 * нормализации (`string-normalization`): раскодировка HTML-сущностей, NFC,
 * кавычки-ёлочки → `"`, длинное тире → `-`, многоточие → `...`, неразрывные
 * пробелы и табы → обычный, схлопывание пробелов, нет пробела перед пунктуацией,
 * trim краёв.
 */
import { normalizeString } from './string-normalization.ts';

export function clean(text: string): string {
  return normalizeString({ text });
}
