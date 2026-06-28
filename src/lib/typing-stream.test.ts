import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSymbolLayout } from '@/lib/layouts';
import { createTypingStream } from './typing-stream';

const symbolLayoutQwerty = getSymbolLayout('qwerty');

describe('createTypingStream', () => {
  // Символы вне раскладки createTypingStream отбрасывает и пишет console.warn
  // (implementation detail, см. тест ниже). Тесты ниже намеренно подают такие
  // символы — глушим warn, чтобы он не засорял вывод тестов.
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('generates a correct stream for a simple word', () => {
    const stream = createTypingStream({ drillText: 'hi', symbolLayout: symbolLayoutQwerty });

    expect(stream).toHaveLength(2);
    expect(stream[0]).toEqual({ targetSymbol: 'h', targetKeyCaps: ['KeyH'], attempts: [] });
    expect(stream[1]).toEqual({ targetSymbol: 'i', targetKeyCaps: ['KeyI'], attempts: [] });
  });

  it('skips characters not present in the symbol layout', () => {
    // The contract is "skip unknown chars". Whether or not a console.warn
    // is emitted is an implementation detail, not part of the contract.
    const stream = createTypingStream({ drillText: 'a€b', symbolLayout: symbolLayoutQwerty });

    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');
  });

  it('handles an empty string', () => {
    expect(createTypingStream({ drillText: '', symbolLayout: symbolLayoutQwerty })).toHaveLength(0);
  });

  it('keeps the space character as a regular stream symbol', () => {
    const stream = createTypingStream({ drillText: 'a b', symbolLayout: symbolLayoutQwerty });
    expect(stream).toHaveLength(3);
    expect(stream[1]!.targetSymbol).toBe(' ');
  });

  it('skips multi-byte characters not present in the layout (CJK)', () => {
    const stream = createTypingStream({ drillText: 'a你好b', symbolLayout: symbolLayoutQwerty });
    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');
  });
});
