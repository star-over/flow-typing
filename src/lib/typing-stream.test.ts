import { describe, expect, it } from 'vitest';
import { symbolLayoutQwerty } from '@/data/layouts/symbol-layout-qwerty';
import { generateTypingStream } from './typing-stream';

describe('generateTypingStream', () => {
  it('generates a correct stream for a simple word', () => {
    const stream = generateTypingStream('hi', symbolLayoutQwerty);

    expect(stream).toHaveLength(2);
    expect(stream[0]).toEqual({ targetSymbol: 'h', targetKeyCaps: ['KeyH'], attempts: [] });
    expect(stream[1]).toEqual({ targetSymbol: 'i', targetKeyCaps: ['KeyI'], attempts: [] });
  });

  it('skips characters not present in the symbol layout', () => {
    // The contract is "skip unknown chars". Whether or not a console.warn
    // is emitted is an implementation detail, not part of the contract.
    const stream = generateTypingStream('a€b', symbolLayoutQwerty);

    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');
  });

  it('handles an empty string', () => {
    expect(generateTypingStream('', symbolLayoutQwerty)).toHaveLength(0);
  });
});
