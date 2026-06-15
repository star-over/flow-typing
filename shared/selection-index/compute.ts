/**
 * @file Расчёт `stepLevel` drill'а — производное поле таблицы отбора
 * (`drillSelectionIndex`). `stepLevel` = самый высокий шаг KeyLadder среди
 * клавиш, нужных чтобы напечатать символы drill'а (аккорд символа уже включает
 * Shift у шифтовых). drill доступен ⟺ `stepLevel < openedSteps` (ADR 0001).
 *
 * Чистая функция: карты «символ → клавиши» и «клавиша → шаг» передаются
 * параметрами (строятся из раскладки и KeyLadder вне ядра).
 */

export function computeStepLevel({
  uniqueSymbols,
  symbolToKeyCaps,
  keyToStep,
}: {
  uniqueSymbols: string[];
  symbolToKeyCaps: ReadonlyMap<string, string[]>;
  keyToStep: ReadonlyMap<string, number>;
}): number {
  let stepLevel = 0;
  for (const symbol of uniqueSymbols) {
    const keyCaps = symbolToKeyCaps.get(symbol);
    if (!keyCaps) throw new Error(`символ вне раскладки: ${JSON.stringify(symbol)}`);
    for (const keyCapId of keyCaps) {
      const step = keyToStep.get(keyCapId);
      if (step === undefined) throw new Error(`клавиша вне KeyLadder: ${keyCapId}`);
      if (step > stepLevel) stepLevel = step;
    }
  }
  return stepLevel;
}
