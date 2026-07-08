/**
 * @file Чистые помощники символьной раскладки (без I/O): тип записи, карты и
 * лестница шагов открытия. Часть рантайм-модели: импортируется сервером (Convex)
 * и инструментами (auto-flow). Загрузка с диска — в `auto-flow/symbol-layout.ts`.
 *
 * Шаг открытия живёт на символе (`ladderStep`, ADR 0020) — отдельного артефакта
 * KeyLadder больше нет. `ladderStep` опционален: раскладка без нарезки (qwerty
 * ждёт своей лестницы, P0-9) записей-шагов не имеет; зарегистрированная раскладка
 * обязана иметь `ladderStep` у каждого символа (проверяет `validateSymbolLadder`).
 */

export interface SymbolEntry {
  symbol: string;
  keyCaps: string[]; // полный аккорд: базовая клавиша + Shift у шифтовых символов
  ladderStep?: number; // шаг открытия символа (ADR 0002/0020); 0 = стартовый блок (домашний ряд + пробел)
}

/** Множество всех клавиш раскладки (объединение аккордов). */
export function layoutKeyCaps(entries: SymbolEntry[]): Set<string> {
  return new Set(entries.flatMap((entry) => entry.keyCaps));
}

/** Карта символ → клавиши (аккорд). */
export function symbolToKeyCaps(entries: SymbolEntry[]): Map<string, string[]> {
  return new Map(entries.map((entry) => [entry.symbol, entry.keyCaps]));
}

/** Карта символ → шаг открытия. Только записи с проставленным `ladderStep`. */
export function symbolToStep(entries: SymbolEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (entry.ladderStep !== undefined) map.set(entry.symbol, entry.ladderStep);
  }
  return map;
}

/** Символы, открывающиеся ровно на шаге `step`. */
export function symbolsAtStep({
  step,
  symbolLayout,
}: {
  step: number;
  symbolLayout: SymbolEntry[];
}): string[] {
  return symbolLayout.filter((entry) => entry.ladderStep === step).map((entry) => entry.symbol);
}

/** Максимальный шаг лестницы раскладки (`-1`, если ни у одного символа нет шага). */
export function maxLadderStep(symbolLayout: SymbolEntry[]): number {
  let max = -1;
  for (const entry of symbolLayout) {
    if (entry.ladderStep !== undefined && entry.ladderStep > max) max = entry.ladderStep;
  }
  return max;
}

/**
 * Инварианты нарезки для раскладки, которая ДОЛЖНА быть ладдерной: у каждого
 * символа целый `ladderStep ≥ 0`, шаги `0..max` без дыр, пробел на шаге 0.
 * Чистая функция: возвращает список проблем (пусто = валидна). Заменяет прежний
 * `validateKeyLadder` — источник теперь один (сама раскладка), сверять не с чем.
 */
export function validateSymbolLadder(entries: SymbolEntry[]): string[] {
  const problems: string[] = [];

  for (const entry of entries) {
    const step = entry.ladderStep;
    if (step === undefined) problems.push(`нет ladderStep у символа: ${JSON.stringify(entry.symbol)}`);
    else if (!Number.isInteger(step) || step < 0) problems.push(`некорректный ladderStep у ${JSON.stringify(entry.symbol)}: ${step}`);
  }

  // Шаги 0..max без дыр.
  const steps = new Set(entries.map((entry) => entry.ladderStep).filter((s): s is number => s !== undefined));
  const maxStep = maxLadderStep(entries);
  for (let step = 0; step <= maxStep; step++) {
    if (!steps.has(step)) problems.push(`пропущен шаг: ${step}`);
  }

  // Стартовый блок: пробел на шаге 0.
  const space = entries.find((entry) => entry.symbol === ' ');
  if (!space) problems.push('нет символа пробела');
  else if (space.ladderStep !== 0) problems.push(`пробел должен быть на шаге 0, а он на ${space.ladderStep}`);

  return problems;
}
