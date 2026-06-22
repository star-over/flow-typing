/**
 * @file Выборка символов KeyLadder по шагу: «символы шага k» — те, чей stepLevel
 * (макс. шаг среди клавиш символа) равен k. Нужны Readiness-проверке текущего
 * шага при росте репертуара. Переиспользует computeStepLevel (без копии логики).
 */
import type { KeyLadder } from './types.ts';
import { keyStepMap } from './key-step-map.ts';
import { computeStepLevel } from '../selection-index/compute.ts';
import { symbolToKeyCaps, type SymbolEntry } from '../symbol-layout.ts';

export function symbolsAtStep({
  step,
  symbolLayout,
  ladder,
}: {
  step: number;
  symbolLayout: SymbolEntry[];
  ladder: KeyLadder;
}): string[] {
  const keyToStep = keyStepMap(ladder);
  const s2k = symbolToKeyCaps(symbolLayout);
  return symbolLayout
    .filter((entry) => computeStepLevel({ uniqueSymbols: [entry.symbol], symbolToKeyCaps: s2k, keyToStep }) === step)
    .map((entry) => entry.symbol);
}
