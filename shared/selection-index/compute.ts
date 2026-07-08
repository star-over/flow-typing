/**
 * @file Расчёт `stepLevel` drill'а — производное поле таблицы отбора
 * (`drillSelectionIndex`). `stepLevel` = самый высокий `ladderStep` среди
 * символов drill'а (шаг открытия живёт на символе, ADR 0020; аккорд Shift уже
 * учтён в шаге шифтового символа). drill доступен ⟺ `stepLevel < openedSteps`
 * (ADR 0001).
 *
 * Чистая функция: карта «символ → шаг» передаётся параметром (строится из
 * раскладки вне ядра, `symbolToStep`).
 */

export function computeStepLevel({
  uniqueSymbols,
  symbolToStep,
}: {
  uniqueSymbols: string[];
  symbolToStep: ReadonlyMap<string, number>;
}): number {
  let stepLevel = 0;
  for (const symbol of uniqueSymbols) {
    const step = symbolToStep.get(symbol);
    if (step === undefined) throw new Error(`символ вне раскладки или без шага: ${JSON.stringify(symbol)}`);
    if (step > stepLevel) stepLevel = step;
  }
  return stepLevel;
}
