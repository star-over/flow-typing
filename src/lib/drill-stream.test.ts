import { describe, expect, test } from 'vitest';
import { glueDrillsIntoStream, glueServerDrills, drillSeparatorStream, joinBatchToStream } from './drill-stream';
import { getSymbolLayoutDescriptor } from '@/lib/layouts';

const qwerty = getSymbolLayoutDescriptor('qwerty').symbolLayout;

describe('glueDrillsIntoStream', () => {
  test('пустой список → пустой поток', () => {
    expect(glueDrillsIntoStream({ drillTexts: [], symbolLayout: qwerty })).toEqual([]);
  });

  test('один drill → поток без ведущего пробела', () => {
    const stream = glueDrillsIntoStream({ drillTexts: ['ab'], symbolLayout: qwerty });
    expect(stream.map((s) => s.targetSymbol)).toEqual(['a', 'b']);
  });

  test('два drill\'а склеены ровно одним пробелом-символом', () => {
    const stream = glueDrillsIntoStream({ drillTexts: ['ab', 'cd'], symbolLayout: qwerty });
    expect(stream.map((s) => s.targetSymbol)).toEqual(['a', 'b', ' ', 'c', 'd']);
  });
});

describe('glueServerDrills', () => {
  test('отображает drills сервера в склеенный поток', () => {
    const stream = glueServerDrills({
      drills: [{ text: 'ab' }, { text: 'cd' }], // glueServerDrills читает только .text
      symbolLayoutId: 'qwerty',
    });
    expect(stream.map((s) => s.targetSymbol)).toEqual(['a', 'b', ' ', 'c', 'd']);
  });

  test('пустой ответ сервера → пустой поток (раскладка без серверных данных)', () => {
    expect(glueServerDrills({ drills: [], symbolLayoutId: 'qwerty' })).toEqual([]);
  });
});

describe('drillSeparatorStream', () => {
  test('ровно один пробел-символ', () => {
    expect(drillSeparatorStream(qwerty).map((s) => s.targetSymbol)).toEqual([' ']);
  });
});

describe('joinBatchToStream', () => {
  test('непустая порция → ведущий разделитель + порция (стык drill\'ов)', () => {
    const batch = glueDrillsIntoStream({ drillTexts: ['ab'], symbolLayout: qwerty });
    const joined = joinBatchToStream({ batch, symbolLayout: qwerty });
    expect(joined.map((s) => s.targetSymbol)).toEqual([' ', 'a', 'b']);
  });

  test('пустая порция → пустой поток (присоединять нечего)', () => {
    expect(joinBatchToStream({ batch: [], symbolLayout: qwerty })).toEqual([]);
  });
});
