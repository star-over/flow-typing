/**
 * @file Снимок прогресса репертуара для UI (чистая функция). Текущая ступень +
 * готовность символов текущего шага + что тормозит. Переиспользует Readiness
 * этапа репертуара (ADR 0008). Витринная производная — в подборе не участвует.
 */
import { maxLadderStep, symbolsAtStep, type SymbolEntry } from '../symbol-layout.ts';
import { evaluateStepReadiness, type ProfileCell, type ReadinessGaps } from './readiness.ts';
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
}: {
  openedSteps: number;
  symbolCells: readonly ProfileCell[];
  symbolLayout: SymbolEntry[];
}): RepertoireProgress {
  const currentStepSymbols = symbolsAtStep({ step: openedSteps - 1, symbolLayout });
  const { symbols } = evaluateStepReadiness({ currentStepSymbols, cells: symbolCells, params: READINESS_PARAMS });
  const blockers = { exposure: 0, accuracy: 0, latency: 0 };
  let readyCount = 0;
  for (const { gaps, ready } of symbols) {
    if (ready) {
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
    totalSteps: maxLadderStep(symbolLayout) + 1, // индекс макс. шага → количество ступеней
    totalOnStep: currentStepSymbols.length,
    readyCount,
    maturingNeeded: Math.max(0, notReady - REPERTOIRE_DEBT_LIMIT),
    blockers,
  };
}

/**
 * Per-symbol разбор готовности символов ТЕКУЩЕГО шага — те самые входные данные,
 * на которых `decideOpenedSteps` решает открыть ли следующую ступень (growth.ts).
 * Для каждого символа: сырые ячейки (предъявления/чистые/латентность), три гейта
 * Readiness и итог. Плюс пороги, медиана и порог латентности репертуара (база
 * сравнения) и долговой лимит — чтобы UI мог показать «сколько до созревания».
 * Витринная производная для /stats; в подборе/писателе не участвует.
 */
export interface SymbolProgress {
  symbol: string;
  exposures: number;
  clean: number;
  /** clean / exposures; null при нуле предъявлений (точность ещё не определена). */
  firstTryAccuracy: number | null;
  /** EWMA латентности (мс); null при отсутствии замеров. */
  latencyEwmaMs: number | null;
  latencySamples: number;
  /** Какие из трёх условий Readiness символ НЕ выполнил. */
  gaps: ReadinessGaps;
  ready: boolean;
}

export interface ProgressionDetail {
  openedSteps: number;
  totalSteps: number;
  totalOnStep: number;
  readyCount: number;
  maturingNeeded: number;
  debtLimit: number;
  params: { minExposures: number; minFirstTryAccuracy: number; latencyK: number };
  /** Медиана latencyEwma по символам с замерами (0 — на холодном старте). */
  repertoireMedianLatencyMs: number;
  /** Порог латентности гейта = latencyK × медиана (0 → гейт неактивен). */
  latencyThresholdMs: number;
  /** Символы текущего шага в порядке раскладки. */
  symbols: SymbolProgress[];
}

export function computeProgressionDetail({
  openedSteps,
  symbolCells,
  symbolLayout,
}: {
  openedSteps: number;
  symbolCells: readonly ProfileCell[];
  symbolLayout: SymbolEntry[];
}): ProgressionDetail {
  const currentStepSymbols = symbolsAtStep({ step: openedSteps - 1, symbolLayout });
  const { repertoireMedianLatency: median, symbols: evaluated } = evaluateStepReadiness({
    currentStepSymbols,
    cells: symbolCells,
    params: READINESS_PARAMS,
  });
  const symbols: SymbolProgress[] = evaluated.map(({ symbol, cell, gaps, ready }) => {
    const exposures = cell?.exposures ?? 0;
    return {
      symbol,
      exposures,
      clean: cell?.clean ?? 0,
      firstTryAccuracy: cell && exposures > 0 ? cell.clean / exposures : null,
      latencyEwmaMs: cell && cell.latencySamples > 0 ? cell.latencyEwma : null,
      latencySamples: cell?.latencySamples ?? 0,
      gaps,
      ready,
    };
  });
  const readyCount = evaluated.filter((s) => s.ready).length;
  const notReady = currentStepSymbols.length - readyCount;
  return {
    openedSteps,
    totalSteps: maxLadderStep(symbolLayout) + 1,
    totalOnStep: currentStepSymbols.length,
    readyCount,
    maturingNeeded: Math.max(0, notReady - REPERTOIRE_DEBT_LIMIT),
    debtLimit: REPERTOIRE_DEBT_LIMIT,
    params: READINESS_PARAMS,
    repertoireMedianLatencyMs: median,
    latencyThresholdMs: median > 0 ? READINESS_PARAMS.latencyK * median : 0,
    symbols,
  };
}
