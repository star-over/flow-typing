/**
 * @file Доступ к KeyLadder: карта клавиша → её шаг открытия.
 */
import type { KeyLadder } from './types.ts';

export function keyStepMap(ladder: KeyLadder): Map<string, number> {
  return new Map(ladder.keys.map((entry) => [entry.keyCapId, entry.step]));
}
