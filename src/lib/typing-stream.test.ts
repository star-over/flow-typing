import { describe, expect, it } from 'vitest';
import { symbolLayoutQwerty } from '@/data/layouts/symbol-layout-qwerty';
import { createTypingStream } from './typing-stream';

describe('createTypingStream', () => {
  it('generates a correct stream for a simple word', () => {
    const stream = createTypingStream('hi', symbolLayoutQwerty);

    expect(stream).toHaveLength(2);
    expect(stream[0]).toEqual({ targetSymbol: 'h', targetKeyCaps: ['KeyH'], attempts: [] });
    expect(stream[1]).toEqual({ targetSymbol: 'i', targetKeyCaps: ['KeyI'], attempts: [] });
  });

  it('skips characters not present in the symbol layout', () => {
    // The contract is "skip unknown chars". Whether or not a console.warn
    // is emitted is an implementation detail, not part of the contract.
    const stream = createTypingStream('a€b', symbolLayoutQwerty);

    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');
  });

  it('handles an empty string', () => {
    expect(createTypingStream('', symbolLayoutQwerty)).toHaveLength(0);
  });

  it('keeps the space character as a regular stream symbol', () => {
    const stream = createTypingStream('a b', symbolLayoutQwerty);
    expect(stream).toHaveLength(3);
    expect(stream[1]!.targetSymbol).toBe(' ');
  });

  it('skips multi-byte characters not present in the layout (CJK)', () => {
    const stream = createTypingStream('a你好b', symbolLayoutQwerty);
    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');
  });
});
