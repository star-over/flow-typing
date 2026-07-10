import { describe, expect, test } from 'vitest';
import { toErrorReport } from './error-report';

describe('toErrorReport', () => {
  test('Error → message + stack', () => {
    const err = new Error('boom');
    const result = toErrorReport(err, '/train');
    expect(result.message).toBe('boom');
    expect(result.stack).toBe(err.stack);
    expect(result.url).toBe('/train');
  });

  test('не-Error → String(), без stack', () => {
    const result = toErrorReport('plain string', undefined);
    expect(result.message).toBe('plain string');
    expect(result.stack).toBeUndefined();
    expect(result.url).toBeUndefined();
  });

  test('пустое сообщение подменяется на Unknown error', () => {
    const result = toErrorReport(new Error(''), '/');
    expect(result.message).toBe('Unknown error');
  });
});
