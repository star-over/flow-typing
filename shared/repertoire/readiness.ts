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

export function isSymbolReady({
  cell,
  params,
  repertoireMedianLatency,
}: {
  cell: ProfileCell | undefined;
  params: ReadinessParams;
  repertoireMedianLatency: number;
}): boolean {
  if (!cell) return false;
  if (cell.exposures < params.minExposures) return false;
  if (cell.clean / cell.exposures < params.minFirstTryAccuracy) return false;
  // Латентность судим только при собственных замерах и наличии базы сравнения;
  // на cold-start латентных данных (медиана 0) гейт неактивен — by design.
  if (cell.latencySamples === 0 || repertoireMedianLatency === 0) return true;
  return cell.latencyEwma <= params.latencyK * repertoireMedianLatency;
}
