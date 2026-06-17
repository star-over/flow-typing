/**
 * @file Сбор и склейка порции drill'ов в непрерывный TypingStream.
 * Склейка чистая; локальный сбор читает DRILL_CORPUS (детерминированно-чистый
 * по входу, кроме случайного выбора). Серверный fetch живёт в session-impl.ts
 * (импурный, там же Convex).
 */
import type { SymbolLayout, SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { createTypingStream } from '@/lib/typing-stream';
import { getSymbolLayoutDescriptor } from '@/lib/layouts';
import { DRILL_CORPUS } from '@/lib/drill-corpus';
import { filterDrillsBySymbolLayout, selectRandomDrill } from '@/lib/drill-selection';

/** Склеивает тексты drill'ов в один поток, разделяя ровно одним пробелом-символом. */
export function glueDrillsIntoStream({
  drillTexts,
  symbolLayout,
}: {
  drillTexts: string[];
  symbolLayout: SymbolLayout;
}): TypingStream {
  const spaceStream = createTypingStream({ drillText: ' ', symbolLayout });
  return drillTexts.flatMap((text, index) => {
    const drillStream = createTypingStream({ drillText: text, symbolLayout });
    return index === 0 ? drillStream : [...spaceStream, ...drillStream];
  });
}

/** Локальный сбор порции: случайные совместимые drill'ы до бюджета символов. */
export function fetchLocalDrillStream({
  symbolLayoutId,
  budgetChars,
}: {
  symbolLayoutId: SymbolLayoutId;
  budgetChars: number;
}): TypingStream {
  const descriptor = getSymbolLayoutDescriptor(symbolLayoutId);
  const compatible = filterDrillsBySymbolLayout({
    allDrills: DRILL_CORPUS,
    symbolLayoutDescriptor: descriptor,
  });
  const texts: string[] = [];
  let total = 0;
  while (total < budgetChars && compatible.length > 0) {
    const drill = selectRandomDrill({ drills: compatible });
    if (!drill) break;
    texts.push(drill.text);
    total += drill.text.length + (texts.length > 1 ? 1 : 0); // +1 пробел только между drill'ами
  }
  return glueDrillsIntoStream({ drillTexts: texts, symbolLayout: descriptor.symbolLayout });
}

/** Чистый маппинг ответа drillNext в склеенный поток. */
export function glueServerDrills({
  drills,
  symbolLayoutId,
}: {
  drills: { text: string }[];
  symbolLayoutId: SymbolLayoutId;
}): TypingStream {
  const descriptor = getSymbolLayoutDescriptor(symbolLayoutId);
  return glueDrillsIntoStream({
    drillTexts: drills.map((d) => d.text),
    symbolLayout: descriptor.symbolLayout,
  });
}

