/**
 * @file Баррель фикстур сцены рук: именованные фикстуры, layout-bootstrap и
 * помеченная таблица `handsSceneFixtures` для табличного `it.each` в
 * `hands-scene.test.ts`. Метка — читаемое имя кейса (сохранена из прежних `it()`).
 */
import type { HandsSceneFixture } from './types';

import { idle } from './idle';
import { shift_b } from './shift_b';
import { shift_f } from './shift_f';
import { shift_o } from './shift_o';
import { shift_o_error_simple_o } from './shift_o_error_simple_o';
import { shift_t_error_shift_n } from './shift_t_error_shift_n';
import { simple_6 } from './simple_6';
import { simple_e_error_shift_F } from './simple_e_error_shift_F';
import { simple_e_error_simple_d } from './simple_e_error_simple_d';
import { simple_e_error_space } from './simple_e_error_space';
import { simple_k } from './simple_k';
import { simple_k_error_simple_j } from './simple_k_error_simple_j';
import { simple_r_error_simple_f } from './simple_r_error_simple_f';
import { simple_space } from './simple_space';
import { simple_t } from './simple_t';

export { fingerLayout, keyboardGraph, keyCoordinateMap } from './test-data';

export {
  idle,
  shift_b,
  shift_f,
  shift_o,
  shift_o_error_simple_o,
  shift_t_error_shift_n,
  simple_6,
  simple_e_error_shift_F,
  simple_e_error_simple_d,
  simple_e_error_space,
  simple_k,
  simple_k_error_simple_j,
  simple_r_error_simple_f,
  simple_space,
  simple_t,
};

/** Помеченная таблица для `it.each`: `{ label, fixture }` в исходном порядке кейсов. */
export const handsSceneFixtures: { label: string; fixture: HandsSceneFixture }[] = [
  { label: '"Space"', fixture: simple_space },
  { label: '"r" with pressed "f"', fixture: simple_r_error_simple_f },
  { label: '"Shift-F"', fixture: shift_f },
  { label: '"Shift-B"', fixture: shift_b },
  { label: '"6"', fixture: simple_6 },
  { label: '"k" with pressed "j"', fixture: simple_k_error_simple_j },
  { label: '"e" with pressed "d"', fixture: simple_e_error_simple_d },
  { label: '"Shift-T" with pressed "Shift-N"', fixture: shift_t_error_shift_n },
  { label: '"Shift-O" with pressed "o"', fixture: shift_o_error_simple_o },
  { label: '"e" with pressed "Space"', fixture: simple_e_error_space },
  { label: 'idle (symbol undefined)', fixture: idle },
  { label: '"Shift-O"', fixture: shift_o },
  { label: '"e" with pressed "Shift-F"', fixture: simple_e_error_shift_F },
  { label: '"t"', fixture: simple_t },
  { label: 'simple "k"', fixture: simple_k },
];
