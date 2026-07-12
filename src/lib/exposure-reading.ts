/**
 * @file `readExposures` — единственный проход `TypingStream`, превращающий поток в
 * чтения предъявлений. Точка истины самого тонкого правила домена: вычитания
 * **проскока** и межсимвольной латентности. Обе сводки (`drillSummarize` —
 * дельта профиля, `summarizeSession` — журнал сессии) строятся как свёртки поверх
 * этого чтения; правило живёт здесь и только здесь.
 *
 * Доменные понятия — в CONTEXT.md (этот модуль их не вводит, лишь реализует):
 *
 *  - **Предъявление (Exposure)** — одна встреча с целевым символом (один
 *    `StreamSymbol`), знаменатель всех оценок. Незавершённый символ (нет нажатий)
 *    предъявлением не считается — в чтение не попадает.
 *  - **Проскок (skip-ahead)** — символ судим ТОЛЬКО по первому нажатию (`clean`):
 *    хвостовые промахи суть цели следующих позиций, ошибку не множим (вычитание
 *    проскока v1; точное отнесение хвоста к настоящим целям — отложено).
 *  - **Латентность** — межсимвольный интервал `startAt(первое нажатие текущего) −
 *    startAt(ВЕРНОГО нажатия предыдущего)`. База — момент верного нажатия, не
 *    первого. Первое предъявление исключаем (нет предыдущего); паузы
 *    > `PAUSE_CAP_MS` и неположительные интервалы отбрасываем (отвлёкся / расхождение
 *    часов ≠ моторный сигнал). Незавершённый символ рвёт цепь латентности.
 */
import type { StreamAttempt, TypingStream } from '@/interfaces/types';
import { areKeyCapIdArraysEqual } from './key-cap';

// Порог «паузы»: межсимвольный интервал длиннее — человек отвлёкся, не моторный
// сигнал, в латентность не идёт. Провизорно (план «Числа-настройки»).
export const PAUSE_CAP_MS = 1500;

/** Чтение одного предъявления — общая единица для обеих сводок. */
export interface ExposureReading {
  targetSymbol: string;
  firstAttempt: StreamAttempt; // первое нажатие предъявления (всегда есть — иначе не предъявление)
  clean: boolean; // первое нажатие верное (вычитание проскока)
  latency?: number; // межсимвольная латентность (мс); undefined для первого / паузы / разрыва цепи
}

export function readExposures(stream: TypingStream): ExposureReading[] {
  const readings: ExposureReading[] = [];

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

    // Латентность перехода к этому предъявлению.
    let latency: number | undefined;
    if (prevCorrectAt !== undefined && firstAttempt.startAt !== undefined) {
      const delta = firstAttempt.startAt - prevCorrectAt;
      if (delta > 0 && delta <= PAUSE_CAP_MS) latency = delta;
    }

    readings.push({ targetSymbol: symbol.targetSymbol, firstAttempt, clean, latency });

    // Момент, когда символ набран верно, — база латентности следующего.
    const correctAttempt = symbol.attempts.find((attempt) =>
      areKeyCapIdArraysEqual({ a: attempt.pressedKeyCaps, b: symbol.targetKeyCaps })
    );
    prevCorrectAt = correctAttempt?.startAt;
  }

  return readings;
}
