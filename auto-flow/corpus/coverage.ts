/**
 * @file Шаг 6 конвейера: отчёт покрытия. Какие символы раскладки корпус
 * покрывает, а какие — нет (дыры помешают росту набора букв позже). Это
 * предупреждение, не фильтр.
 */
import type { CoverageReport, DrillRecord } from './types.ts';

export function computeCoverage({
  drills,
  symbolSet,
}: {
  drills: DrillRecord[];
  symbolSet: ReadonlySet<string>;
}): CoverageReport {
  const seen = new Set<string>();
  for (const drill of drills) {
    for (const symbol of drill.uniqueSymbols) seen.add(symbol);
  }

  const covered: string[] = [];
  const missing: string[] = [];
  for (const symbol of symbolSet) {
    (seen.has(symbol) ? covered : missing).push(symbol);
  }
  return { covered: covered.sort(), missing: missing.sort() };
}
