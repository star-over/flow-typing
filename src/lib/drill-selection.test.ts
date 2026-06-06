import { describe, expect, it } from 'vitest';
import type { Drill } from '@/interfaces/drill-data.types';
import type { SymbolLayoutDescriptor } from '@/interfaces/types';
import { filterDrillsBySymbolLayout, selectRandomDrill } from './drill-selection';

const drillEn: Drill = {
  id: '1', text: 'hi', textLanguage: 'en',
  char_count: 2, word_count: 1, avg_word_length: 2, max_word_length: 2,
  unique_chars: ['h', 'i'], unique_symbols: ['h', 'i'],
  char_freq: { h: 1, i: 1 }, symbol_freq: { h: 1, i: 1 },
  bigrams: ['hi'], trigrams: ['hi '],
};
const drillRu: Drill = {
  id: '2', text: 'да', textLanguage: 'ru',
  char_count: 2, word_count: 1, avg_word_length: 2, max_word_length: 2,
  unique_chars: ['д', 'а'], unique_symbols: ['д', 'а'],
  char_freq: { д: 1, а: 1 }, symbol_freq: { д: 1, а: 1 },
  bigrams: ['да'], trigrams: ['да '],
};

const qwertyDescriptor: SymbolLayoutDescriptor = {
  symbolLayoutId: 'qwerty',
  textLanguage: 'en',
  isDefaultForTextLanguages: ['en'],
  symbolLayout: [
    { symbol: 'h', keyCaps: ['KeyH'] },
    { symbol: 'i', keyCaps: ['KeyI'] },
  ],
};

describe('filterDrillsBySymbolLayout', () => {
  it('пропускает drill с подходящим языком и символами', () => {
    const result = filterDrillsBySymbolLayout({
      allDrills: [drillEn],
      symbolLayoutDescriptor: qwertyDescriptor,
    });
    expect(result).toEqual([drillEn]);
  });

  it('отсекает drill с несовместимым языком', () => {
    expect(filterDrillsBySymbolLayout({
      allDrills: [drillRu],
      symbolLayoutDescriptor: qwertyDescriptor,
    })).toEqual([]);
  });

  it('отсекает drill, в котором есть символ, отсутствующий в раскладке', () => {
    const drillWithExtra: Drill = {
      ...drillEn,
      id: '3',
      unique_symbols: ['h', 'i', '£'],
    };
    expect(filterDrillsBySymbolLayout({
      allDrills: [drillWithExtra],
      symbolLayoutDescriptor: qwertyDescriptor,
    })).toEqual([]);
  });

  it('пустой массив на входе → пустой массив на выходе', () => {
    expect(filterDrillsBySymbolLayout({
      allDrills: [],
      symbolLayoutDescriptor: qwertyDescriptor,
    })).toEqual([]);
  });
});

describe('selectRandomDrill', () => {
  it('возвращает null на пустом массиве', () => {
    expect(selectRandomDrill({ drills: [] })).toBeNull();
  });

  it('возвращает элемент из непустого массива', () => {
    const result = selectRandomDrill({ drills: [drillEn] });
    expect(result).toBe(drillEn);
  });
});
