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

/**
 * Все символы drill'а типизируемы в раскладке (у каждого есть `ladderStep`).
 * Таблица `drills` — общая для всех раскладок (нет колонки раскладки); drill
 * «чужой» (кириллица под qwerty и наоборот), если хоть один символ не в
 * раскладке. Предикат отфильтровывает такие ДО {@link computeStepLevel} —
 * тогда её throw остаётся инвариантом (вызывается только на своих drill'ах),
 * а таблица отбора одной раскладки индексирует только совместимые drill'ы.
 */
export function allSymbolsInLayout({
  uniqueSymbols,
  symbolToStep,
}: {
  uniqueSymbols: string[];
  symbolToStep: ReadonlyMap<string, number>;
}): boolean {
  return uniqueSymbols.every((symbol) => symbolToStep.has(symbol));
}
