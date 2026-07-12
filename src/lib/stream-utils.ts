/**
 * @file Утилиты для работы с потоком символов (`TypingStream`).
 * @description Содержит функции для создания, обновления и анализа потока,
 * который представляет собой упражнение для пользователя.
 */
import type { FlowLineSymbolType, KeyCapId, StreamAttempt, StreamSymbol, TypingStream } from '@/interfaces/types';

import { areKeyCapIdArraysEqual } from "./key-cap";

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
