/**
 * @file Доступ к KeyLadder: карта клавиша → её шаг открытия.
 */
import type { KeyLadder } from './types.ts';

export function keyStepMap(ladder: KeyLadder): Map<string, number> {
  return new Map(ladder.keys.map((entry) => [entry.keyCapId, entry.step]));
}

/** Максимальный номер шага в лестнице (-1 для пустой). */
export function maxLadderStep(ladder: KeyLadder): number {
  return Math.max(-1, ...ladder.keys.map((entry) => entry.step));
}
