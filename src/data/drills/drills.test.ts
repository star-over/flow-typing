import { describe, expect, it } from 'vitest';
import rawCorpus from './drills.jsonl?raw';
import { DrillSchema } from '../../interfaces/drill-data.types';

function parseCorpus(raw: string) {
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  return lines.map((line, i) => {
    try {
      return DrillSchema.parse(JSON.parse(line));
    } catch (e) {
      throw new Error(`Invalid drill at line ${i + 1}: ${e}`, { cause: e });
    }
  });
}

describe('drills.jsonl', () => {
  it('весь корпус успешно парсится через DrillSchema (инварианты 6, 7)', () => {
    expect(() => parseCorpus(rawCorpus)).not.toThrow();
  });

  it('корпус не пустой', () => {
    expect(parseCorpus(rawCorpus).length).toBeGreaterThan(0);
  });

  it('в корпусе есть и en, и ru drills', () => {
    const corpus = parseCorpus(rawCorpus);
    const langs = new Set(corpus.map(d => d.textLanguage));
    expect(langs.has('en')).toBe(true);
    expect(langs.has('ru')).toBe(true);
  });
});
