// src/lib/confusion-display.ts
/**
 * @file Перевод путаницы сессии в пару символов для показа.
 *
 * В журнале `pressed` хранится как `KeyCapId` (`'KeyR'`), а не как символ:
 * клавиша layout-нейтральна, символ на ней зависит от раскладки. Перевод —
 * работа слоя показа, ровно как предписывает CONTEXT.md («UI переводит в символ
 * через (pressed, symbolLayoutId)»).
 *
 * Зачем вообще: `confusions` считались, проверялись и лежали в схеме, но не
 * показывались нигде. Между тем это единственное на экране результатов, что
 * человек может унести и применить, — а интерференция раскладок, по CONTEXT.md,
 * «самый воспроизводимый сигнал слабости».
 */
import type { SessionConfusion } from './session-summarize';
import type { SymbolLayout } from '@/interfaces/types';

/** Путаница, готовая к показу: оба конца — печатные символы. */
export interface DisplayConfusion {
  from: string; // целевой символ
  to: string; // символ, который нажали вместо него
  count: number;
}

/**
 * Символ, который даёт клавиша сама по себе (без модификаторов), или `undefined`.
 * V1 путаницы записывает только одиночные нажатия, поэтому ищем запись ровно с
 * одной клавишей: у `'Ш'` в keyCaps лежал бы ещё Shift, и это не наш случай.
 */
function symbolForBareKey({
  keyCapId,
  symbolLayout,
}: {
  keyCapId: string;
  symbolLayout: SymbolLayout;
}): string | undefined {
  const entry = symbolLayout.find((e) => e.keyCaps.length === 1 && e.keyCaps[0] === keyCapId);
  return entry?.symbol;
}

/** Печатен ли символ: пробел и пустое на экране выглядят дырой, а не подсказкой. */
const isPrintable = (symbol: string | undefined): symbol is string =>
  symbol !== undefined && symbol.trim().length > 0;

/**
 * Самая частая путаница, пригодная к показу. `confusions` приходят уже
 * отсортированными по убыванию `count` (`sessionSummarize`), поэтому берём
 * первую переводимую: клавиша без символа в этой раскладке или пробел на любом
 * конце — пропускаем, показать их всё равно нечем. Ничего не нашлось —
 * `undefined`, и подсказки на экране просто нет.
 */
export function topConfusionForDisplay({
  confusions,
  symbolLayout,
}: {
  confusions: readonly SessionConfusion[];
  symbolLayout: SymbolLayout;
}): DisplayConfusion | undefined {
  for (const confusion of confusions) {
    const to = symbolForBareKey({ keyCapId: confusion.pressed, symbolLayout });
    if (!isPrintable(to) || !isPrintable(confusion.target)) continue;
    return { from: confusion.target, to, count: confusion.count };
  }
  return undefined;
}
