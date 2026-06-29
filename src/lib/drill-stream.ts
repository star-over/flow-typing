/**
 * @file Склейка порции drill'ов в непрерывный TypingStream. Чистая. Серверный
 * сбор живёт в session-impl.ts (там же Convex). Клиентского корпуса нет — источник
 * drill'ов тотально серверный (ADR 0011), деградации на локальный набор не осталось.
 */
import type { SymbolLayout, SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { createTypingStream } from '@/lib/typing-stream';
import { getSymbolLayoutDescriptor } from '@/lib/layouts';

/**
 * Разделитель между drill'ами в TypingStream — ровно один пробел-символ. Один дом
 * правила «границы drill'ов невидимы, но разделены пробелом» (CONTEXT.md: пробел
 * внутри неотличим от стыка): потребляется и склейкой внутри порции
 * (glueDrillsIntoStream), и склейкой на стыке порций (joinBatchToStream).
 */
export function drillSeparatorStream(symbolLayout: SymbolLayout): TypingStream {
  return createTypingStream({ drillText: ' ', symbolLayout });
}

/** Склеивает тексты drill'ов в один поток, разделяя ровно одним пробелом-символом. */
export function glueDrillsIntoStream({
  drillTexts,
  symbolLayout,
}: {
  drillTexts: string[];
  symbolLayout: SymbolLayout;
}): TypingStream {
  const separator = drillSeparatorStream(symbolLayout);
  return drillTexts.flatMap((text, index) => {
    const drillStream = createTypingStream({ drillText: text, symbolLayout });
    return index === 0 ? drillStream : [...separator, ...drillStream];
  });
}

/**
 * Присоединяет уже склеенную порцию к идущей очереди через тот же разделитель-стык,
 * что и внутри порции (один дом — drillSeparatorStream): иначе хвост старой порции
 * слипается с началом новой. Пустую порцию пропускает (присоединять нечего). Дом
 * стыка порций для appendFetched в session.machine.ts.
 */
export function joinBatchToStream({
  batch,
  symbolLayout,
}: {
  batch: TypingStream;
  symbolLayout: SymbolLayout;
}): TypingStream {
  if (batch.length === 0) return [];
  return [...drillSeparatorStream(symbolLayout), ...batch];
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
