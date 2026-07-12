/**
 * @file Решение о росте репертуара — чистая функция (ADR 0008). Монотонный +1:
 * следующий шаг открывается, когда НЕ-готовых символов текущего шага ≤ долгового
 * лимита (предохранитель от застревания при случайной выдаче). Никогда не
 * уменьшает openedSteps; не растит выше потолка лестницы (maxStep).
 */
import { evaluateStepReadiness, type ProfileCell, type ReadinessParams } from './readiness.ts';

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
  const notReady = evaluateStepReadiness({ currentStepSymbols, cells, params }).symbols.filter(
    (s) => !s.ready,
  ).length;
  return notReady <= debtLimit ? openedSteps + 1 : openedSteps;
}
