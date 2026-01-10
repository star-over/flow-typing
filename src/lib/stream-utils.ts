/**
 * @file Утилиты для работы с потоком символов (`TypingStream`).
 * @description Содержит функции для создания, обновления и анализа потока,
 * который представляет собой упражнение для пользователя.
 */
import { symbolLayoutEnQwerty } from '@/data/symbol-layout-en-qwerty';
import { FlowLineSymbolType, KeyCapId, StreamAttempt, StreamSymbol, TypingStream } from '@/interfaces/types';

import { areKeyCapIdArraysEqual, getKeyCapIdsForChar, nbsp, sp } from "./symbol-utils";

/**
 * Создает `TypingStream` из строки.
 * Каждый символ строки, поддерживаемый раскладкой, преобразуется в `StreamSymbol`.
 * @param text Входная строка для преобразования.
 * @returns Массив `TypingStream`.
 */
export function createTypingStream(text: string): TypingStream {
  const stream: TypingStream = [];
  for (const char of text.split('')) {
    const keyCapIds = getKeyCapIdsForChar(char, symbolLayoutEnQwerty);
    if (keyCapIds) {
      stream.push({
        targetSymbol: char,
        targetKeyCaps: keyCapIds,
        attempts: [],
      });
    }
  }
  return stream;
}

/**
 * Добавляет новую попытку набора к символу в `TypingStream`.
 * Функция иммутабельна и возвращает новый экземпляр потока.
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
  pressedKeyCups,
  startAt,
  endAt,
}: {
  stream: TypingStream;
  cursorPosition: number;
  pressedKeyCups: KeyCapId[];
  startAt: number;
  endAt: number;
}): TypingStream {
  if (cursorPosition < 0 || cursorPosition >= stream.length) {
    return stream;
  }

  const newStream = [...stream];
  const targetSymbol = newStream[cursorPosition];

  const newAttempt: StreamAttempt = {
    pressedKeyCups: pressedKeyCups,
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

  const lastAttempt = attempts.at(-1)!;
  const isCorrect = areKeyCapIdArraysEqual(lastAttempt.pressedKeyCups, (symbol as StreamSymbol).targetKeyCaps);

  if (isCorrect) {
    return attempts.length > 1 ? "CORRECTED" : "CORRECT";
  } else {
    return attempts.length > 1 ? "INCORRECTS" : "ERROR";
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
