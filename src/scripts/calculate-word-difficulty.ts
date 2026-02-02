#!/usr/bin/env node

/**
 * @file CLI-скрипт для расчета сложности символов в слове.
 * @description Принимает слово как аргумент командной строки и выводит
 * посимвольную сложность для русской раскладки.
 * 
 * @example
 * npx tsx src/scripts/calculate-word-difficulty.ts "привет"
 */

import { calculateCharDifficulty } from '../lib/difficulty-calculator';
import { symbolLayoutRu } from '../data/layouts/symbol-layout-ru';
import { fingerLayoutASDF } from '../data/layouts/finger-layout-asdf';
import { keyboardLayoutANSI } from '../data/layouts/keyboard-layout-ansi';

// --- Инициализация ---

// 1. Получаем слово из аргументов командной строки
const word = process.argv[2];

if (!word) {
  console.error("Ошибка: Слово для анализа не предоставлено.");
  console.log("Пример использования: npx tsx src/scripts/calculate-word-difficulty.ts \"ваше_слово\"");
  process.exit(1);
}

// --- Расчет и Вывод ---

console.log(`Анализ сложности для слова: "${word}"`);
console.log("---");

for (const char of word) {
  const difficulty = calculateCharDifficulty(
    char,
    symbolLayoutRu,
    fingerLayoutASDF,
    keyboardLayoutANSI
  );

  // Вывод с округлением для наглядности
  console.log(`Символ: '${char}', Сложность: ${difficulty.toFixed(2)}`);
}

console.log("---");
