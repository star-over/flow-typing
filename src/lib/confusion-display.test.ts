import { describe, test, expect } from 'vitest';
import { topConfusionForDisplay } from './confusion-display';
import { getSymbolLayout } from './layouts';
import type { SymbolLayout } from '@/interfaces/types';

const layout: SymbolLayout = [
  { symbol: ' ', keyCaps: ['Space'] },
  { symbol: 'к', keyCaps: ['KeyR'] },
  { symbol: 'г', keyCaps: ['KeyU'] },
  { symbol: 'ы', keyCaps: ['KeyS'] },
  { symbol: 'К', keyCaps: ['ShiftLeft', 'KeyR'] },
];

describe('topConfusionForDisplay', () => {
  test('переводит нажатую клавишу в символ той же раскладки', () => {
    const top = topConfusionForDisplay({
      confusions: [{ target: 'г', pressed: 'KeyR', count: 4 }],
      symbolLayout: layout,
    });
    expect(top).toEqual({ from: 'г', to: 'к', count: 4 });
  });

  test('берёт первую — они уже отсортированы по убыванию count', () => {
    const top = topConfusionForDisplay({
      confusions: [
        { target: 'г', pressed: 'KeyR', count: 4 },
        { target: 'ы', pressed: 'KeyU', count: 2 },
      ],
      symbolLayout: layout,
    });
    expect(top?.count).toBe(4);
  });

  test('клавиши нет в раскладке — не показываем сырой KeyCapId', () => {
    // Показать «г → KeyZ» хуже, чем не показать ничего.
    const top = topConfusionForDisplay({
      confusions: [{ target: 'г', pressed: 'KeyZ', count: 4 }],
      symbolLayout: layout,
    });
    expect(top).toBeUndefined();
  });

  test('пробел на любом конце — пропускаем, он на экране дыра', () => {
    const top = topConfusionForDisplay({
      confusions: [
        { target: 'г', pressed: 'Space', count: 5 },
        { target: 'ы', pressed: 'KeyR', count: 1 },
      ],
      symbolLayout: layout,
    });
    expect(top).toEqual({ from: 'ы', to: 'к', count: 1 });
  });

  test('берём символ голой клавиши, а не с модификатором', () => {
    // KeyR несёт и 'к', и (с Shift) 'К'. Одиночное нажатие — это 'к'.
    const top = topConfusionForDisplay({
      confusions: [{ target: 'г', pressed: 'KeyR', count: 1 }],
      symbolLayout: layout,
    });
    expect(top?.to).toBe('к');
  });

  test('путаниц нет — подсказки нет', () => {
    expect(topConfusionForDisplay({ confusions: [], symbolLayout: layout })).toBeUndefined();
  });

  test('работает на настоящей раскладке йцукен, не только на тестовой раскладке', () => {
    const real = getSymbolLayout('йцукен');
    const top = topConfusionForDisplay({
      confusions: [{ target: 'г', pressed: 'KeyR', count: 3 }],
      symbolLayout: real,
    });
    expect(top?.from).toBe('г');
    expect(top?.to).toBe('к'); // KeyR на йцукен — «к»
    expect(top?.count).toBe(3);
  });
});
