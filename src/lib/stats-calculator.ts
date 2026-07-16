// src/lib/stats-calculator.ts
/**
 * @file Числа статистики упражнения для экрана результатов (SessionStatsDisplay).
 * Источник — КАНОНИЧЕСКАЯ SessionSummaryPayload (та же, что пишется в журнал
 * sessionSummaries), а не «настенное» время по attempts: длительность —
 * активное время за вычетом пауз (displayElapsedMs, ≤ окна), посчитанное в
 * sessionMachine. Значения отдаём СЫРЫМИ — округляет уже отображающий слой; и
 * карточка результатов, и строка /stats берут точность из одной `accuracyPercent`
 * (а не синхронизируют формулу комментарием), поэтому числа на двух экранах совпадают.
 *
 * Чего здесь намеренно НЕТ:
 * - `wpm` — тождественно `cpm / 5` (в жанре «слово» = 5 знаков по определению;
 *   у Monkeytype это буквально множитель единиц). Второе имя одного числа,
 *   информации не несёт; на русском рынке единица счёта и так зн/мин.
 * - `cpm` — пропускная способность за активную минуту, а НЕ скорость (см. ниже).
 *   На фиксированном окне сессии она вырождается в «сколько символов прошло»,
 *   поэтому карточка показывает честный `exposures` + время, а не производное.
 *   Строке /stats cpm по-прежнему нужна (окна там разные) — она берёт её из
 *   `session.cpm` напрямую, мимо этого модуля.
 */
import type { SessionSummaryPayload } from './session-summarize';

export interface SessionStats {
  elapsedSeconds: number; // активное время сеанса (measured, не config)
  accuracy: number; // процент: см. accuracyPercent (как в журнале)
  exposures: number; // сколько символов предъявлено — «объём» карточки
  misses: number; // exposures − clean: промахи штуками, без счёта в уме
  latencyMedianMs: number; // медиана межсимвольного интервала
  paceInMotion: number | undefined; // зн/мин «в движении»; undefined — нечем мерить
  rhythm: number | undefined; // ровность ритма 0–100; undefined — мало интервалов
}

/**
 * Точность предъявлений (%): доля чистых первого нажатия. 0 при нулевых exposures
 * (без деления на ноль). Единственный дом формулы — её читают и карточка результатов
 * (`sessionStatsFromSummary`), и строка /stats (`formatSessionRow`).
 */
export function accuracyPercent({ exposures, clean }: { exposures: number; clean: number }): number {
  return exposures > 0 ? (clean / exposures) * 100 : 0;
}

/**
 * Активное время сессии в секундах из `durationMs` (measured). Единственный дом
 * конверсии `durationMs`→`elapsedSeconds` (канон-пара target/measured, CONTEXT.md);
 * сырая — округляет отображающий слой (строка /stats).
 */
export function elapsedSecondsFromDurationMs(durationMs: number): number {
  return durationMs / 1000;
}

/**
 * Темп «в движении» (зн/мин): сколько бы вышло, держись весь сеанс типичный
 * межсимвольный интервал. Это и есть та «чистая моторная скорость», на которую
 * указывает `session-summarize` («не моторная скорость — та из latencyMedianMs»):
 * пауз и раздумий в ней нет, потому что медиана их отбрасывает.
 *
 * `undefined` при неположительной медиане (сеанс без замеров латентности —
 * первый символ отрезка из неё исключён): показать «—» честнее, чем Infinity.
 */
export function paceInMotionFromLatency(latencyMedianMs: number): number | undefined {
  return latencyMedianMs > 0 ? 60_000 / latencyMedianMs : undefined;
}

/** Сводка завершённой сессии → числа карточки результатов. Сырые, без округления. */
export function sessionStatsFromSummary(summary: SessionSummaryPayload): SessionStats {
  return {
    elapsedSeconds: elapsedSecondsFromDurationMs(summary.durationMs),
    accuracy: accuracyPercent({ exposures: summary.exposures, clean: summary.clean }),
    exposures: summary.exposures,
    misses: summary.exposures - summary.clean,
    latencyMedianMs: summary.latencyMedianMs,
    paceInMotion: paceInMotionFromLatency(summary.latencyMedianMs),
    // Опционально в источнике: при нехватке интервалов поле опущено (и старые
    // строки журнала его не имеют) — не подменяем нулём, несём undefined дальше.
    rhythm: summary.rhythm,
  };
}
