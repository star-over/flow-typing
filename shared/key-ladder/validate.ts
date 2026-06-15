/**
 * @file Валидатор KeyLadder. Лестница должна покрывать ровно набор клавиш
 * раскладки (без дублей и лишних), шаги — `0..max` без дыр, стартовый блок
 * (Space) в шаге 0. Чистая функция: набор клавиш раскладки передаётся
 * параметром. Возвращает список проблем (пусто = валидна).
 */
import type { KeyLadder } from './types.ts';

export function validateKeyLadder({
  ladder,
  layoutKeyCaps,
}: {
  ladder: KeyLadder;
  layoutKeyCaps: ReadonlySet<string>;
}): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const { keyCapId, step } of ladder.keys) {
    if (seen.has(keyCapId)) problems.push(`дубль клавиши: ${keyCapId}`);
    seen.add(keyCapId);
    if (!layoutKeyCaps.has(keyCapId)) problems.push(`клавиша вне раскладки: ${keyCapId}`);
    if (!Number.isInteger(step) || step < 0) problems.push(`некорректный шаг у ${keyCapId}: ${step}`);
  }

  for (const keyCapId of layoutKeyCaps) {
    if (!seen.has(keyCapId)) problems.push(`клавиша раскладки не покрыта: ${keyCapId}`);
  }

  // Шаги 0..max без дыр.
  const steps = new Set(ladder.keys.map((entry) => entry.step));
  const maxStep = Math.max(-1, ...steps);
  for (let step = 0; step <= maxStep; step++) {
    if (!steps.has(step)) problems.push(`пропущен шаг: ${step}`);
  }

  // Стартовый блок: Space в шаге 0.
  const space = ladder.keys.find((entry) => entry.keyCapId === 'Space');
  if (!space) problems.push('нет клавиши Space');
  else if (space.step !== 0) problems.push(`Space должен быть в шаге 0, а он в ${space.step}`);

  return problems;
}
