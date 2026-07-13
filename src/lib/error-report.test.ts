import { describe, expect, test } from 'vitest';
import { toErrorReport } from './error-report';

describe('toErrorReport', () => {
  test('Error → message + stack', () => {
    const err = new Error('boom');
    const result = toErrorReport({ error: err, url: '/train' });
    expect(result.message).toBe('boom');
    expect(result.stack).toBe(err.stack);
    expect(result.url).toBe('/train');
  });

  test('не-Error → String(), без stack', () => {
    const result = toErrorReport({ error: 'plain string', url: undefined });
    expect(result.message).toBe('plain string');
    expect(result.stack).toBeUndefined();
    expect(result.url).toBeUndefined();
  });

  test('пустое сообщение подменяется на Unknown error', () => {
    const result = toErrorReport({ error: new Error(''), url: '/' });
    expect(result.message).toBe('Unknown error');
  });
});
