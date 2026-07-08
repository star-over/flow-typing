import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import physicalAnsi from './physical-layout-ansi.json';
import symbolQwerty from './symbol-layout-qwerty.json';
import symbolJcuken from './symbol-layout-jcuken.json';
import fingerAsdf from './finger-layout-asdf.json';

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

function parseLayout<T>(data: unknown, schema: z.ZodType<T>): T[] {
  return z.array(schema).parse(data);
}

describe('physical-layout-ansi.json', () => {
  it('весь файл успешно парсится через PhysicalKeySchema', () => {
    expect(() => parseLayout(physicalAnsi, PhysicalKeySchema)).not.toThrow();
  });

  it('keyCapId уникален в файле', () => {
    const keys = parseLayout(physicalAnsi, PhysicalKeySchema);
    const ids = new Set(keys.map((k) => k.keyCapId));
    expect(ids.size).toBe(keys.length);
  });

  it('файл содержит как минимум одну запись', () => {
    expect(parseLayout(physicalAnsi, PhysicalKeySchema).length).toBeGreaterThan(0);
  });
});

describe('symbol-layout-qwerty.json и symbol-layout-jcuken.json', () => {
  it('qwerty: весь файл парсится, symbol уникален', () => {
    const entries = parseLayout(symbolQwerty, SymbolEntrySchema);
    expect(entries.length).toBeGreaterThan(0);
    const symbols = new Set(entries.map((e) => e.symbol));
    expect(symbols.size).toBe(entries.length);
  });

  it('йцукен: весь файл парсится, symbol уникален', () => {
    const entries = parseLayout(symbolJcuken, SymbolEntrySchema);
    expect(entries.length).toBeGreaterThan(0);
    const symbols = new Set(entries.map((e) => e.symbol));
    expect(symbols.size).toBe(entries.length);
  });
});

describe('finger-layout-asdf.json', () => {
  it('весь файл парсится через FingerEntrySchema', () => {
    expect(() => parseLayout(fingerAsdf, FingerEntrySchema)).not.toThrow();
  });

  it('keyCapId уникален в файле', () => {
    const entries = parseLayout(fingerAsdf, FingerEntrySchema);
    const ids = new Set(entries.map((e) => e.keyCapId));
    expect(ids.size).toBe(entries.length);
  });
});
