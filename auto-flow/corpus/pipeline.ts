/**
 * @file Сборка конвейера корпуса: чистая функция
 * `тексты + набор символов раскладки → записи drills + отчёт покрытия`.
 *
 * Порядок шагов: clean → segment → фильтры (начало/длина/доля букв/членство) →
 * дедупликация → meta → coverage. Фильтры идут дешёвые-раньше-дорогих.
 *
 * LLM-гейт качества (отдельным кэширующим проходом) зарезервирован между
 * дедупликацией и meta — чтобы не считать мету по отбракованным предложениям.
 */
import { clean } from './clean.ts';
import { segment } from './segment.ts';
import { allSymbolsInLayout, letterRatioOk, startsValid, withinLength } from './filters.ts';
import { computeMeta } from './meta.ts';
import { computeCoverage } from './coverage.ts';
import type { CoverageReport, DrillRecord } from './types.ts';

export interface BuildOptions {
  /** Минимальная длина единицы (символов). */
  minLength: number;
  /** Максимальная длина единицы (символов) — отсекает марафоны. */
  maxLength: number;
  /** Минимальная доля букв среди символов. */
  minLetterRatio: number;
}

export const DEFAULT_BUILD_OPTIONS: BuildOptions = {
  minLength: 2,
  maxLength: 150,
  minLetterRatio: 0.5,
};

export interface BuildStats {
  inputTexts: number;
  units: number;
  kept: number;
  rejected: number;
  duplicates: number;
}

export interface BuildResult {
  drills: DrillRecord[];
  coverage: CoverageReport;
  stats: BuildStats;
}

export function buildDrills({
  texts,
  symbolSet,
  options = DEFAULT_BUILD_OPTIONS,
}: {
  texts: string[];
  symbolSet: ReadonlySet<string>;
  options?: BuildOptions;
}): BuildResult {
  const drills: DrillRecord[] = [];
  const seen = new Set<string>();
  let units = 0;
  let rejected = 0;
  let duplicates = 0;

  for (const raw of texts) {
    for (const unit of segment(clean(raw))) {
      units++;
      const passes =
        startsValid(unit) &&
        withinLength({ text: unit, min: options.minLength, max: options.maxLength }) &&
        letterRatioOk({ text: unit, minRatio: options.minLetterRatio }) &&
        allSymbolsInLayout({ text: unit, symbolSet });
      if (!passes) {
        rejected++;
        continue;
      }
      if (seen.has(unit)) {
        duplicates++;
        continue;
      }
      seen.add(unit);
      drills.push({ text: unit, ...computeMeta(unit) });
    }
  }

  return {
    drills,
    coverage: computeCoverage({ drills, symbolSet }),
    stats: { inputTexts: texts.length, units, kept: drills.length, rejected, duplicates },
  };
}
