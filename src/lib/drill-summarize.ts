/**
 * @file `drillSummarize` — чистая клиентская функция `TypingStream → DrillSummary`
 * (клиентская часть агрегатора, ADR 0005). Сворачивает завершённый поток в
 * компактную дельту по затронутым ячейкам профиля; payload мутации `drillRecord`.
 * Сырые нажатия на сервер не уходят (CONTEXT.md → DrillSummary).
 *
 * Три преобразования:
 *  1. Предъявление — каждый набранный символ потока (CONTEXT.md → Exposure).
 *  2. Чистое = первое нажатие верное. Это вычитание проскока v1: символ судим
 *     ТОЛЬКО по первому нажатию, хвостовые промахи (цели следующих позиций при
 *     проскоке) игнорируем — ошибку не множим. Точное отнесение хвостовых
 *     промахов к их настоящим целям — отложено.
 *  3. Латентность — межсимвольный интервал startAt(первое нажатие символа) −
 *     startAt(верное нажатие предыдущего). Первый символ исключаем (нет
 *     предыдущего), паузы отбрасываем по PAUSE_CAP_MS (отвлёкся ≠ моторный сигнал).
 *
 * Scope этапа 1 — perSymbol + overall; ячейки per-биграмма появятся на этапе
 * «Фокус», где будет потребитель. Форма результата — массивы: ключи не-ASCII, в объекты
 * Convex их не положить (как `symbolFrequency` в схеме drills).
 */
import type { TypingStream } from '@/interfaces/types';
import { areKeyCapIdArraysEqual } from './symbol-utils';

// Порог «паузы»: межсимвольный интервал длиннее — человек отвлёкся, не моторный
// сигнал, в латентность не идёт. Провизорно (план «Числа-настройки»).
export const PAUSE_CAP_MS = 1500;

/** Дельта одной ячейки профиля per-символ. */
export interface SymbolStat {
  symbol: string;
  exposures: number; // предъявлений символа в этом drill'е
  clean: number; // из них чистых (первое нажатие верное)
  latencies: number[]; // межсимвольные латентности (мс), сервер сложит в EWMA
}

/** Сводка завершённого drill'а — payload `drillRecord`. */
export interface DrillSummary {
  perSymbol: SymbolStat[];
  overall: {
    exposures: number;
    clean: number;
    accuracy: number; // clean / exposures
    latencyMedian: number; // медиана латентности drill'а (0 при отсутствии)
    latencySpread: number; // разброс — MAD относительно медианы
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid] ?? 0;
  if (sorted.length % 2 === 1) return hi;
  const lo = sorted[mid - 1] ?? 0;
  return (lo + hi) / 2;
}

/** Median absolute deviation — робастный разброс. */
function meanAbsoluteDeviation({ nums, center }: { nums: number[]; center: number }): number {
  if (nums.length === 0) return 0;
  return median(nums.map((n) => Math.abs(n - center)));
}

export function drillSummarize(stream: TypingStream): DrillSummary {
  const bySymbol = new Map<string, SymbolStat>();
  const allLatencies: number[] = [];
  let totalExposures = 0;
  let totalClean = 0;

  // startAt верного нажатия предыдущего набранного символа — база латентности.
  let prevCorrectAt: number | undefined;

  for (const symbol of stream) {
    const firstAttempt = symbol.attempts[0];
    if (firstAttempt === undefined) {
      // Символ не набирался (незавершённый поток) — не предъявление; цепь рвём.
      prevCorrectAt = undefined;
      continue;
    }

    const clean = areKeyCapIdArraysEqual({ a: firstAttempt.pressedKeyCaps, b: symbol.targetKeyCaps });

    // Латентность перехода к этому символу.
    let latency: number | undefined;
    if (prevCorrectAt !== undefined && firstAttempt.startAt !== undefined) {
      const delta = firstAttempt.startAt - prevCorrectAt;
      if (delta > 0 && delta <= PAUSE_CAP_MS) latency = delta;
    }

    const cell = bySymbol.get(symbol.targetSymbol) ?? {
      symbol: symbol.targetSymbol,
      exposures: 0,
      clean: 0,
      latencies: [],
    };
    cell.exposures += 1;
    if (clean) cell.clean += 1;
    if (latency !== undefined) {
      cell.latencies.push(latency);
      allLatencies.push(latency);
    }
    bySymbol.set(symbol.targetSymbol, cell);

    totalExposures += 1;
    if (clean) totalClean += 1;

    // Момент, когда символ набран верно, — база латентности следующего.
    const correctAttempt = symbol.attempts.find((attempt) =>
      areKeyCapIdArraysEqual({ a: attempt.pressedKeyCaps, b: symbol.targetKeyCaps })
    );
    prevCorrectAt = correctAttempt?.startAt;
  }

  const latencyMedian = median(allLatencies);
  return {
    perSymbol: [...bySymbol.values()],
    overall: {
      exposures: totalExposures,
      clean: totalClean,
      accuracy: totalExposures > 0 ? totalClean / totalExposures : 0,
      latencyMedian,
      latencySpread: meanAbsoluteDeviation({ nums: allLatencies, center: latencyMedian }),
    },
  };
}
