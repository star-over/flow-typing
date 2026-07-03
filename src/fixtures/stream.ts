// Тест-фабрики для доменного ядра печати: `StreamSymbol`, `StreamAttempt`,
// `TypingStream`. До этого дома одни и те же фабрики копировались байт-в-байт
// по тест-файлам двумя дрейфующими семьями (`sym` vs `press`+`streamSymbol`).
// Здесь форма собирается в одном месте — правка `StreamSymbol`/`StreamAttempt`
// не расходится по вызывающим.
//
// Соседи в `src/fixtures/` — `hands-scene/` (замороженные снимки-данные);
// это файл-фабрики, поэтому селится в корне `fixtures/`, не внутри снимков.
//
// Сигнатуры фабрик — 2 позиционных аргумента (устоявшийся тест-сахар, не
// наша выбранная сигнатура): осознанное исключение из конвенции «2+ → object».
import type { KeyCapId, StreamAttempt, StreamSymbol } from '@/interfaces/types';

/** Одна попытка набора: нажатое сочетание + опциональное время начала. */
// eslint-disable-next-line no-restricted-syntax -- осознанное исключение (см. шапку файла)
export function press(keys: KeyCapId[], startAt?: number): StreamAttempt {
  return { pressedKeyCaps: keys, startAt };
}

/** Одноклавишный символ без попыток — самый частый случай в тестах потока. */
// eslint-disable-next-line no-restricted-syntax -- осознанное исключение (см. шапку файла)
export const sym = (targetSymbol: string, key: KeyCapId): StreamSymbol => ({
  targetSymbol,
  targetKeyCaps: [key],
  attempts: [],
});

/** Полный символ: цель, аккорд целевых клавиш и явный список попыток. */
// eslint-disable-next-line no-restricted-syntax -- осознанное исключение (см. шапку файла)
export function streamSymbol(targetSymbol: string, target: KeyCapId[], attempts: StreamAttempt[]): StreamSymbol {
  return { targetSymbol, targetKeyCaps: target, attempts };
}
