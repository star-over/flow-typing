import { describe, expect, test } from 'vitest';
import { glueDrillsIntoStream, fetchLocalDrillStream, glueServerDrills } from './drill-stream';
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

  test('пустой ответ сервера → пустой поток (якорь contentGap-деградации)', () => {
    expect(glueServerDrills({ drills: [], symbolLayoutId: 'qwerty' })).toEqual([]);
  });
});

describe('fetchLocalDrillStream', () => {
  test('набирает символов не меньше бюджета (пока корпус не исчерпан)', () => {
    const stream = fetchLocalDrillStream({ symbolLayoutId: 'qwerty', budgetChars: 50 });
    expect(stream.length).toBeGreaterThanOrEqual(50);
  });

  test('каждый элемент — валидный StreamSymbol с targetKeyCaps', () => {
    const stream = fetchLocalDrillStream({ symbolLayoutId: 'qwerty', budgetChars: 20 });
    expect(stream.length).toBeGreaterThan(0);
    for (const s of stream) {
      expect(Array.isArray(s.targetKeyCaps)).toBe(true);
      expect(s.attempts).toEqual([]);
    }
  });
});
