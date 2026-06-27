import { describe, expect, test } from 'vitest';
import { formatSessionRow, type SessionSummary } from './sessions-store.svelte';

function session(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    _id: 's1',
    _creationTime: 0,
    userId: 'u1',
    symbolLayoutId: 'йцукен',
    capturedAt: 1782232838140,
    openedSteps: 5,
    durationMs: 61000,
    exposures: 216,
    clean: 210,
    cpm: 200.4,
    latencyMedianMs: 228,
    confusions: [],
    ...overrides,
  } as unknown as SessionSummary;
}

describe('formatSessionRow', () => {
  test('cpm округляется до целого', () => {
    expect(formatSessionRow({ session: session({ cpm: 200.4 }), locale: 'en' }).cpm).toBe(200);
  });

  test('точность = clean / exposures × 100, один знак', () => {
    expect(formatSessionRow({ session: session({ clean: 210, exposures: 216 }), locale: 'en' }).accuracy).toBe('97.2');
  });

  test('точность 0.0 при нулевых exposures (нет деления на ноль)', () => {
    expect(formatSessionRow({ session: session({ clean: 0, exposures: 0 }), locale: 'en' }).accuracy).toBe('0.0');
  });

  test('длительность — целые секунды', () => {
    expect(formatSessionRow({ session: session({ durationMs: 61400 }), locale: 'en' }).durationSeconds).toBe(61);
  });

  test('id прокинут, дата — непустая строка', () => {
    const row = formatSessionRow({ session: session(), locale: 'en' });
    expect(row.id).toBe('s1');
    expect(typeof row.date).toBe('string');
    expect(row.date.length).toBeGreaterThan(0);
  });

  test('ровность: число → "NN%"', () => {
    expect(formatSessionRow({ session: session({ rhythm: 82 }), locale: 'en' }).rhythm).toBe('82%');
  });

  test('ровность: нет данных (старая строка) → "—"', () => {
    expect(formatSessionRow({ session: session(), locale: 'en' }).rhythm).toBe('—');
  });
});
