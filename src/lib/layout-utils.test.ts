import { describe, expect, it } from 'vitest';

import type { PhysicalLayout } from '@/interfaces/types';

import { createKeyCoordinateMap } from './layout-utils';

// Две строки, клавиши намеренно не в порядке x — проверяем и группировку по
// ряду (`r = y`), и присвоение колонки (`c` = индекс после сортировки по x).
const layout: PhysicalLayout = [
  { keyCapId: 'KeyB', x: 2, y: 1, w: 1, label: 'B', type: 'SYMBOL' },
  { keyCapId: 'KeyA', x: 0, y: 1, w: 1, label: 'A', type: 'SYMBOL' },
  { keyCapId: 'KeyC', x: 1, y: 1, w: 1, label: 'C', type: 'SYMBOL' },
  { keyCapId: 'KeyE', x: 1, y: 2, w: 1, label: 'E', type: 'SYMBOL' },
  { keyCapId: 'KeyD', x: 0, y: 2, w: 1, label: 'D', type: 'SYMBOL' },
];

describe('createKeyCoordinateMap', () => {
  it('sets r from the row (y) and c from the x-sorted index within the row', () => {
    const map = createKeyCoordinateMap(layout);
    expect(map.get('KeyA')).toEqual({ r: 1, c: 0 });
    expect(map.get('KeyC')).toEqual({ r: 1, c: 1 });
    expect(map.get('KeyB')).toEqual({ r: 1, c: 2 });
    expect(map.get('KeyD')).toEqual({ r: 2, c: 0 });
    expect(map.get('KeyE')).toEqual({ r: 2, c: 1 });
  });

  it('maps every key exactly once', () => {
    expect(createKeyCoordinateMap(layout).size).toBe(5);
  });
});
