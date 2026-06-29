/**
 * @file Чистые решения над проекцией очереди completed[]: предикат низкой воды
 * (когда дозагружать) и план чекпоинта (что свести и куда сдвинуть границу).
 * Прежде заперты в guard `needsRefill` и действии `checkpointAndRecord`
 * sessionMachine — тестировались только прогоном всей FSM.
 */
import type { TypingStream } from '@/interfaces/types';
import { drillSummarize, type DrillSummary } from './drill-summarize';

/**
 * Низкая вода очереди: непройденный хвост короче порога → пора дозагружать.
 * `+1` — позиция курсора: на момент проверки символ под курсором ещё не в
 * `completed[]` (guard бежит до pushCompleted), но из очереди он уже уходит, так
 * что хвост короче на единицу. Сравнение нестрогое (`≤`): дозагрузка срабатывает
 * уже на пороге, не на пороге−1.
 */
export function needsRefill({
  totalAppended,
  completedCount,
  threshold,
}: {
  totalAppended: number;
  completedCount: number;
  threshold: number;
}): boolean {
  return totalAppended - (completedCount + 1) <= threshold;
}

/**
 * План чекпоинта: свести напечатанный отрезок `[previousCheckpoint .. длина)` и
 * сдвинуть границу на хвост. Пустой отрезок → `null` (сводить нечего, граница на
 * месте). Точка истины «что попадает в чекпоинт»: одна для refill и для финала
 * сессии.
 */
export function planCheckpoint({
  completed,
  previousCheckpoint,
}: {
  completed: TypingStream;
  previousCheckpoint: number;
}): { summary: DrillSummary; nextCheckpoint: number } | null {
  const slice = completed.slice(previousCheckpoint);
  if (slice.length === 0) return null;
  return { summary: drillSummarize(slice), nextCheckpoint: completed.length };
}
