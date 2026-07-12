/**
 * @file Единый дом концепта потока символов (`TypingStream`).
 * @description Построение потока из текста drill'а (`createTypingStream`) +
 * поведение над потоком: добавление попытки (`addAttempt`), классификация
 * символа (`getSymbolType`), enrich для FlowLine (`getSymbolChar`,
 * `enrichStreamSymbols`) + результат нажатия (`getPressResult`).
 */
import type { FlowLineSymbolType, KeyCapId, KeyCapPressResult, StreamAttempt, StreamSymbol, SymbolLayout, TypingStream } from "@/interfaces/types";
import { areKeyCapIdArraysEqual, getKeyCapIdsForChar } from "@/lib/key-cap";

/**
 * Builds a TypingStream from a given drill text.
 * For each character, it pre-calculates the `targetKeyCaps`.
 */
export function createTypingStream({
  drillText,
  symbolLayout,
}: {
  drillText: string;
  symbolLayout: SymbolLayout;
}): TypingStream {
  const stream: TypingStream = drillText
    .split('')
    .map((targetSymbol): TypingStream[number] | null => {
      const targetKeyCaps = getKeyCapIdsForChar({ char: targetSymbol, symbolLayout });

      if (!targetKeyCaps) {
        console.warn(`Character "${targetSymbol}" not found in symbol layout.`);
        return null; // Skip characters not in the layout
      }

      return { targetSymbol, targetKeyCaps, attempts: [], };
    })
    .filter((item): item is TypingStream[number] => item !== null);

  return stream;
}

/**
 * Символ неразрывного пробела (non-breaking space).
 * @type {string}
 */
export const nbsp = '\u00A0';

/**
 * Символ обычного пробела (space).
 * @type {string}
 */
export const sp = '\u0020';

/**
 * Добавляет новую попытку набора к символу в `TypingStream`.
 * Функция неизменна и возвращает новый экземпляр потока.
 * @param params - Параметры для добавления попытки.
 * @param params.stream - Исходный `TypingStream`.
 * @param params.cursorPosition - Индекс символа, к которому добавляется попытка.
 * @param params.typedKey - Данные о нажатой клавише.
 * @param params.startAt - Время начала попытки (timestamp).
 * @param params.endAt - Время окончания попытки (timestamp).
 * @returns Новый `TypingStream` с добавленной попыткой.
 */
export function addAttempt({
  stream,
  cursorPosition,
  pressedKeyCaps,
  startAt,
  endAt,
}: {
  stream: TypingStream;
  cursorPosition: number;
  pressedKeyCaps: KeyCapId[];
  startAt: number;
  endAt: number;
}): TypingStream {
  if (cursorPosition < 0 || cursorPosition >= stream.length) {
    return stream;
  }

  const newStream = [...stream];
  const targetSymbol = newStream[cursorPosition];
  if (!targetSymbol) return stream;

  const newAttempt: StreamAttempt = {
    pressedKeyCaps: pressedKeyCaps,
    startAt,
    endAt,
  };

  const newAttempts = [...targetSymbol.attempts, newAttempt];

  newStream[cursorPosition] = {
    ...targetSymbol,
    attempts: newAttempts,
  };

  return newStream;
}

/**
 * Определяет визуальное состояние (`FlowLineSymbolType`) символа потока на основе истории его попыток.
 * @param symbol Объект `StreamSymbol` для анализа.
 * @returns Тип состояния символа для `FlowLine`.
 */
export function getSymbolType(symbol?: StreamSymbol): FlowLineSymbolType {
  const { attempts } = symbol ?? {};

  if (!attempts || attempts.length === 0) {
    return "PENDING";
  }

  const lastAttempt = attempts[attempts.length - 1];
  if (!lastAttempt) return "PENDING";
  const isCorrect = areKeyCapIdArraysEqual({ a: lastAttempt.pressedKeyCaps, b: (symbol as StreamSymbol).targetKeyCaps });

  if (isCorrect) {
    return attempts.length > 1 ? "CORRECTED" : "CORRECT";
  } else {
    return attempts.length > 1 ? "ERRORS" : "ERROR";
  }
}

/**
 * Возвращает символ для отображения.
 * Преобразует обычный пробел в неразрывный пробел (`&nbsp;`) для корректного рендеринга в HTML.
 * @param symbol Объект `StreamSymbol`.
 * @returns Символ для отображения.
 */
export const getSymbolChar = (symbol?: StreamSymbol): string => {
  const char = symbol?.targetSymbol;
  if (!char) {
    return nbsp;
  }
  return char === sp ? nbsp : char;
};

/**
 * Готовая к рендерингу view-model одного символа потока: видимый символ +
 * тип для подсветки. FlowLine отрисовывает из массива таких объектов, не
 * вызывая getSymbolChar/getSymbolType внутри template.
 */
export interface EnrichedStreamSymbol {
  char: string;
  type: FlowLineSymbolType;
}

/**
 * Превращает `TypingStream` в массив `EnrichedStreamSymbol` для FlowLine.
 * Одна композиция `getSymbolChar` + `getSymbolType` per-символ; обе
 * зависимости чистые и покрыты собственными тестами.
 */
export function enrichStreamSymbols(stream: TypingStream): EnrichedStreamSymbol[] {
  return stream.map((symbol) => ({
    char: getSymbolChar(symbol),
    type: getSymbolType(symbol),
  }));
}

/**
 * Determines the visual feedback result of the last typing attempt for a given symbol.
 *
 * @param currentStreamSymbol The stream symbol to evaluate, which contains the target keys and all user attempts.
 * @returns {KeyCapPressResult} - 'CORRECT' if the last attempt matches the target,
 * 'ERROR' if it does not, and 'NONE' if there have been no attempts yet.
 */
export function getPressResult(currentStreamSymbol: StreamSymbol | undefined): KeyCapPressResult {
    if (!currentStreamSymbol) {
        return "NONE";
    }

    const lastAttempt = currentStreamSymbol.attempts[currentStreamSymbol.attempts.length - 1];

    if (!lastAttempt) {
        return "NONE";
    }

    const wasCorrect = areKeyCapIdArraysEqual({ a: lastAttempt.pressedKeyCaps, b: currentStreamSymbol.targetKeyCaps });

    return wasCorrect ? "CORRECT" : "ERROR";
}
