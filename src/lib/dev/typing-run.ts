/**
 * @file Dev-only: запись одного завершённого drill'а для офлайн-анализа и тестов.
 *
 * Это НЕ продакшн-путь. Сырые нажатия никогда не уходят на сервер (ADR 0005) —
 * запись складывается только в локальный IndexedDB (`typing-capture-store`) и
 * выгружается файлом из консоли. Набор данных нужен, чтобы настроить «числа»
 * адаптивной системы по реальной печати и дать golden-fixtures будущей `summarize`.
 */
import type { SymbolLayoutId, TypingStream } from '@/interfaces/types';

/** Одна запись набора данных: сырой поток + контекст, без агрегации (lossless). */
export interface TypingRunRecord {
  /** Время завершения drill'а (Date.now). */
  capturedAt: number;
  symbolLayoutId: SymbolLayoutId;
  /** Текст drill'а, восстановленный из целевых символов потока. */
  text: string;
  /** Сырой поток: символы, попытки, нажатые клавиши, временные метки. */
  symbols: TypingStream;
}

/**
 * Чистая сериализация завершённого потока в запись набора данных.
 * Ничего не агрегирует: все метрики (точность, латентность, ритм, путаницы)
 * выводятся из сырого потока на стороне анализа.
 */
export function streamToRunRecord({
  stream,
  symbolLayoutId,
  capturedAt,
}: {
  stream: TypingStream;
  symbolLayoutId: SymbolLayoutId;
  capturedAt: number;
}): TypingRunRecord {
  return {
    capturedAt,
    symbolLayoutId,
    text: stream.map((symbol) => symbol.targetSymbol).join(''),
    symbols: stream,
  };
}
