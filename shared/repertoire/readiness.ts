/**
 * @file Readiness — критерий «символ достаточно хорош для расширения репертуара»
 * (CONTEXT.md → Readiness): достаточно предъявлений + точность с первой попытки
 * выше порога + латентность не хуже k× медианы репертуара. Критерий относительный
 * (медиана по самому пользователю), не абсолютный. Чистые функции.
 */
export interface ProfileCell {
  symbol: string;
  exposures: number;
  clean: number;
  latencyEwma: number;
  latencySamples: number;
}

export interface ReadinessParams {
  minExposures: number;
  minFirstTryAccuracy: number;
  latencyK: number;
}

/** Медиана latencyEwma по символам с латентными замерами (0 — если таких нет). */
export function repertoireMedianLatency(cells: readonly ProfileCell[]): number {
  const samples = cells
    .filter((c) => c.latencySamples > 0)
    .map((c) => c.latencyEwma)
    .sort((a, b) => a - b);
  if (samples.length === 0) return 0;
  const mid = Math.floor(samples.length / 2);
  if (samples.length % 2 === 1) return samples[mid] ?? 0;
  return ((samples[mid - 1] ?? 0) + (samples[mid] ?? 0)) / 2;
}

export interface ReadinessGaps {
  exposure: boolean; // не хватает предъявлений
  accuracy: boolean; // точность с первой попытки ниже порога
  latency: boolean;  // медленнее k× медианы репертуара
}

/**
 * Какие условия Readiness символ НЕ выполнил. Точность/латентность оцениваем только
 * при достаточных предъявлениях (иначе нет данных); латентность — только при
 * собственных замерах и ненулевой медиане репертуара (холодный старт не штрафуем).
 * Для отсутствующей ячейки (символ ни разу не печатался) все три условия не выполнены.
 */
export function readinessGaps({
  cell,
  params,
  repertoireMedianLatency,
}: {
  cell: ProfileCell | undefined;
  params: ReadinessParams;
  repertoireMedianLatency: number;
}): ReadinessGaps {
  if (!cell) return { exposure: true, accuracy: true, latency: true };
  if (cell.exposures < params.minExposures) return { exposure: true, accuracy: false, latency: false };
  const accuracy = cell.clean / cell.exposures < params.minFirstTryAccuracy;
  // Латентность судим только при собственных замерах и наличии базы сравнения;
  // на cold-start латентных данных (медиана 0) гейт неактивен — by design.
  const latency =
    cell.latencySamples > 0 &&
    repertoireMedianLatency > 0 &&
    cell.latencyEwma > params.latencyK * repertoireMedianLatency;
  return { exposure: false, accuracy, latency };
}

export function isSymbolReady({
  cell,
  params,
  repertoireMedianLatency,
}: {
  cell: ProfileCell | undefined;
  params: ReadinessParams;
  repertoireMedianLatency: number;
}): boolean {
  const gaps = readinessGaps({ cell, params, repertoireMedianLatency });
  return !gaps.exposure && !gaps.accuracy && !gaps.latency;
}
