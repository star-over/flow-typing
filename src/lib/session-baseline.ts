// src/lib/session-baseline.ts
/**
 * @file База сравнения «ваша недавняя норма» для экрана результатов: скользящее
 * среднее по прошлым сессиям и дельта к нему.
 *
 * Зачем не «к прошлой сессии»: ADR 0004 по итогам валидации на реальных
 * прохождениях зафиксировал, что ритм — шумный сигнал, сильно зависящий от
 * человека (в детекторе он вторичный, подтверждающий). Дельта к одному прошлому
 * замеру на шумной величине хлопала бы случайно и учила бы гнаться за шумом.
 * Сравниваем с собственной недавней нормой — та же идиома, что `latencyEwma`
 * в ячейках профиля (CONTEXT.md: портрет «по паттернам»).
 *
 * Чистая логика: без I/O и runes, живёт плоско в `src/lib` рядом с
 * `session-summarize` / `session-config` (см. `src/lib/CLAUDE.md`).
 */

/**
 * Предельный вес свежего замера в скользящем среднем. Эффективное окно
 * ≈ 2/α − 1 ≈ 7 сессий: «недавняя норма», а не вся история.
 */
export const BASELINE_ALPHA = 0.25;

/**
 * Сколько прошлых замеров нужно, чтобы показать дельту. Меньше — молчим:
 * на двух точках «изменение» неотличимо от разброса. Тот же приём, что у
 * keybr (рекорд не объявляется первые два урока) и у нашего `rhythm`,
 * который при нехватке интервалов не выдумывает 0, а опускается.
 */
export const MIN_BASELINE_SAMPLES = 3;

/**
 * Самонагревающаяся EWMA: вес свежего замера `α(t) = max(BASELINE_ALPHA, 1/t)`.
 *
 * На первом замере α=1 — база равна ему самому; дальше 1/2, 1/3, и с четвёртого
 * садится на BASELINE_ALPHA. Пока данных мало — это обычное среднее, когда их
 * хватает — скользящее. Отдельной ветки «мало данных» и магического размера
 * окна не нужно: переход непрерывный.
 *
 * `values` — в хронологическом порядке (старые → новые), как отдаёт `listMine`.
 * `undefined` на пустом входе: пусть слой отображения покажет «—», а не 0.
 */
export function rollingBaseline(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  let ewma = 0;
  for (const [index, value] of values.entries()) {
    const alpha = Math.max(BASELINE_ALPHA, 1 / (index + 1));
    ewma = alpha * value + (1 - alpha) * ewma;
  }
  return ewma;
}

/**
 * Дельта текущего замера к недавней норме по `history` (прошлые сессии, без
 * текущей). `undefined`, если истории не хватает — дельты просто нет, и это
 * честнее выдуманного нуля.
 */
export function deltaToBaseline({
  current,
  history,
}: {
  current: number;
  history: readonly number[];
}): number | undefined {
  if (history.length < MIN_BASELINE_SAMPLES) return undefined;
  const baseline = rollingBaseline(history);
  if (baseline === undefined) return undefined;
  return current - baseline;
}

/** Числа сводки, которых достаточно, чтобы опознать сессию среди строк журнала. */
export interface JournalIdentity {
  exposures: number;
  clean: number;
  durationMs: number;
  latencyMedianMs: number;
}

function sameSession({ a, b }: { a: JournalIdentity; b: JournalIdentity }): boolean {
  return (
    a.exposures === b.exposures &&
    a.clean === b.clean &&
    a.durationMs === b.durationMs &&
    a.latencyMedianMs === b.latencyMedianMs
  );
}

/**
 * Прошлые сессии из журнала БЕЗ текущей.
 *
 * Журнал (`sessions.listMine`) — живая подписка, а сводка пишется fire-and-forget
 * (ADR 0015): строка только что законченной сессии прилетает в список через
 * сотни мс ПОСЛЕ того, как экран результатов уже показан. Не убрать её — и
 * текущая сессия попадёт в траекторию вторым разом (точка-сегодня раздвоится
 * на глазах у человека) и подтянет к себе базу сравнения, занизив дельту.
 *
 * Опознаём по совпадению чисел в НОВЕЙШЕЙ строке (`journal` — старые → новые).
 * Совпадение чисел у двух подряд идущих сессий возможно, но безобидно: отбросим
 * ровно одну строку, и траектория сдвинется на точку — не соврав.
 */
export function historyWithoutCurrent<T extends JournalIdentity>({
  journal,
  current,
}: {
  journal: readonly T[];
  current: JournalIdentity;
}): T[] {
  const newest = journal[journal.length - 1];
  return newest !== undefined && sameSession({ a: newest, b: current })
    ? journal.slice(0, -1)
    : [...journal];
}
