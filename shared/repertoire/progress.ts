/**
 * @file Снимок прогресса репертуара для UI (чистая функция). Текущая ступень +
 * готовность символов текущего шага + что тормозит. Переиспользует Readiness
 * этапа репертуара (ADR 0008). Витринная производная — в подборе не участвует.
 */
import type { KeyLadder } from '../key-ladder/types.ts';
import { maxLadderStep } from '../key-ladder/key-step-map.ts';
import { symbolsAtStep } from '../key-ladder/step-symbols.ts';
import type { SymbolEntry } from '../symbol-layout.ts';
import { readinessGaps, repertoireMedianLatency, type ProfileCell } from './readiness.ts';
import { READINESS_PARAMS, REPERTOIRE_DEBT_LIMIT } from './config.ts';

export interface RepertoireProgress {
  openedSteps: number;
  totalSteps: number; // всего ступеней в лестнице (для «N из M»); = maxLadderStep + 1
  totalOnStep: number;
  readyCount: number;
  maturingNeeded: number;
  blockers: { exposure: number; accuracy: number; latency: number };
}

export function computeRepertoireProgress({
  openedSteps,
  symbolCells,
  symbolLayout,
  keyLadder,
}: {
  openedSteps: number;
  symbolCells: readonly ProfileCell[];
  symbolLayout: SymbolEntry[];
  keyLadder: KeyLadder;
}): RepertoireProgress {
  const currentStepSymbols = symbolsAtStep({ step: openedSteps - 1, symbolLayout, ladder: keyLadder });
  const median = repertoireMedianLatency(symbolCells);
  const bySymbol = new Map(symbolCells.map((c) => [c.symbol, c]));
  const blockers = { exposure: 0, accuracy: 0, latency: 0 };
  let readyCount = 0;
  for (const symbol of currentStepSymbols) {
    const gaps = readinessGaps({ cell: bySymbol.get(symbol), params: READINESS_PARAMS, repertoireMedianLatency: median });
    if (!gaps.exposure && !gaps.accuracy && !gaps.latency) {
      readyCount += 1;
      continue;
    }
    if (gaps.exposure) blockers.exposure += 1;
    if (gaps.accuracy) blockers.accuracy += 1;
    if (gaps.latency) blockers.latency += 1;
  }
  const notReady = currentStepSymbols.length - readyCount;
  return {
    openedSteps,
    totalSteps: maxLadderStep(keyLadder) + 1, // индекс макс. шага → количество ступеней
    totalOnStep: currentStepSymbols.length,
    readyCount,
    maturingNeeded: Math.max(0, notReady - REPERTOIRE_DEBT_LIMIT),
    blockers,
  };
}
