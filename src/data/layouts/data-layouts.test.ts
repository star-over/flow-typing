import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import physicalAnsiRaw from './physical-layout-ansi.jsonl?raw';
import symbolQwertyRaw from './symbol-layout-qwerty.jsonl?raw';
import symbolJcukenRaw from './symbol-layout-jcuken.jsonl?raw';
import fingerAsdfRaw from './finger-layout-asdf.jsonl?raw';

import { KEY_CAP_IDS } from '@/interfaces/key-cap-id';
import { FINGER_IDS, KEY_CAP_HOME_KEY_MARKERS, KEY_CAP_SYMBOL_SIZES } from '@/interfaces/types';

const KeyCapIdSchema = z.enum(KEY_CAP_IDS);

const PhysicalKeySchema = z.object({
  keyCapId: KeyCapIdSchema,
  x: z.number().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().positive(),
  label: z.string(),
  type: z.enum(['SYMBOL', 'SYSTEM', 'MODIFIER']),
  homeKeyMarker: z.enum(KEY_CAP_HOME_KEY_MARKERS).optional(),
  symbolSize: z.enum(KEY_CAP_SYMBOL_SIZES).optional(),
});

const SymbolEntrySchema = z.object({
  symbol: z.string().min(1),
  keyCaps: z.array(KeyCapIdSchema).min(1),
});

const FingerEntrySchema = z.object({
  keyCapId: KeyCapIdSchema,
  fingerId: z.enum(FINGER_IDS),
  home: z.boolean().optional(),
});

function parseJsonl<T>(raw: string, schema: z.ZodType<T>): T[] {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line, i) => {
    try {
      return schema.parse(JSON.parse(line));
    } catch (e) {
      throw new Error(`Invalid line ${i + 1}: ${(e as Error).message}`, { cause: e });
    }
  });
}

describe('physical-layout-ansi.jsonl', () => {
  it('весь файл успешно парсится через PhysicalKeySchema', () => {
    expect(() => parseJsonl(physicalAnsiRaw, PhysicalKeySchema)).not.toThrow();
  });

  it('keyCapId уникален в файле', () => {
    const keys = parseJsonl(physicalAnsiRaw, PhysicalKeySchema);
    const ids = new Set(keys.map((k) => k.keyCapId));
    expect(ids.size).toBe(keys.length);
  });

  it('файл содержит как минимум одну запись', () => {
    expect(parseJsonl(physicalAnsiRaw, PhysicalKeySchema).length).toBeGreaterThan(0);
  });
});

describe('symbol-layout-qwerty.jsonl и symbol-layout-jcuken.jsonl', () => {
  it('qwerty: весь файл парсится, symbol уникален', () => {
    const entries = parseJsonl(symbolQwertyRaw, SymbolEntrySchema);
    expect(entries.length).toBeGreaterThan(0);
    const symbols = new Set(entries.map((e) => e.symbol));
    expect(symbols.size).toBe(entries.length);
  });

  it('йцукен: весь файл парсится, symbol уникален', () => {
    const entries = parseJsonl(symbolJcukenRaw, SymbolEntrySchema);
    expect(entries.length).toBeGreaterThan(0);
    const symbols = new Set(entries.map((e) => e.symbol));
    expect(symbols.size).toBe(entries.length);
  });
});

describe('finger-layout-asdf.jsonl', () => {
  it('весь файл парсится через FingerEntrySchema', () => {
    expect(() => parseJsonl(fingerAsdfRaw, FingerEntrySchema)).not.toThrow();
  });

  it('keyCapId уникален в файле', () => {
    const entries = parseJsonl(fingerAsdfRaw, FingerEntrySchema);
    const ids = new Set(entries.map((e) => e.keyCapId));
    expect(ids.size).toBe(entries.length);
  });
});
