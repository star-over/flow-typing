/**
 * @file Решение о росте репертуара — чистая функция (ADR 0008). Монотонный +1:
 * следующий шаг открывается, когда НЕ-готовых символов текущего шага ≤ долгового
 * лимита (предохранитель от застревания при случайной выдаче). Никогда не
 * уменьшает openedSteps; не растит выше потолка лестницы (maxStep).
 */
import { isSymbolReady, repertoireMedianLatency, type ProfileCell, type ReadinessParams } from './readiness.ts';

export function decideOpenedSteps({
  openedSteps,
  maxStep,
  currentStepSymbols,
  cells,
  params,
  debtLimit,
}: {
  openedSteps: number;
  maxStep: number;
  currentStepSymbols: string[];
  cells: readonly ProfileCell[];
  params: ReadinessParams;
  debtLimit: number;
}): number {
  if (openedSteps > maxStep) return openedSteps; // потолок: все шаги открыты
  if (currentStepSymbols.length === 0) return openedSteps;
  const median = repertoireMedianLatency(cells);
  const bySymbol = new Map(cells.map((c) => [c.symbol, c]));
  const notReady = currentStepSymbols.filter(
    (symbol) => !isSymbolReady({ cell: bySymbol.get(symbol), params, repertoireMedianLatency: median }),
  ).length;
  return notReady <= debtLimit ? openedSteps + 1 : openedSteps;
}
