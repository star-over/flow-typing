/**
 * Единая точка входа для всех слоёв раскладок.
 *
 * Источники истины:
 * - `src/data/layouts/physical-layout-*.jsonl`
 * - `src/data/layouts/symbol-layout-*.jsonl`
 * - `src/data/layouts/finger-layout-*.jsonl`
 *
 * Файлы грузятся на старте модуля через Vite `?raw`, проверяются Zod-схемами,
 * собираются в три module-level Map'а. Каждая раскладка — атомарная единица:
 * имя файла = id, поле `id` в записях не дублируется.
 *
 * Когда понадобится UGC или БД-источник, в этом файле появится fallback
 * (`get*Layout` сначала ищет в builtin Map'е, потом в пользовательском хранилище);
 * call-site'ы при этом не меняются.
 */
import { z } from 'zod';
import { KEY_CAP_IDS } from '@/interfaces/key-cap-id';
import {
  KEY_CAP_HOME_KEY_MARKERS,
  KEY_CAP_SYMBOL_SIZES,
  SYMBOL_LAYOUT_IDS,
  FINGER_IDS,
} from '@/interfaces/types';
import type {
  FingerLayout,
  FingerLayoutId,
  PhysicalLayout,
  PhysicalLayoutId,
  SymbolLayout,
  SymbolLayoutDescriptor,
  SymbolLayoutId,
  TextLanguage,
} from '@/interfaces/types';

import physicalAnsiRaw from '@/data/layouts/physical-layout-ansi.jsonl?raw';
import symbolQwertyRaw from '@/data/layouts/symbol-layout-qwerty.jsonl?raw';
import symbolJcukenRaw from '@/data/layouts/symbol-layout-jcuken.jsonl?raw';
import fingerAsdfRaw from '@/data/layouts/finger-layout-asdf.jsonl?raw';
import fingerSdfvRaw from '@/data/layouts/finger-layout-sdfv.jsonl?raw';

// ---------- Zod-схемы для записей JSONL ----------

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

// ---------- Парсеры JSONL → массивы с runtime-инвариантами ----------

function parseJsonl<T>({
  raw,
  parseLine,
}: {
  raw: string;
  parseLine: (obj: unknown, lineNum: number) => T;
}): T[] {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line, i) => {
    try {
      return parseLine(JSON.parse(line), i + 1);
    } catch (e) {
      throw new Error(`Invalid JSONL at line ${i + 1}: ${(e as Error).message}`, { cause: e });
    }
  });
}

function parsePhysicalLayout(raw: string): PhysicalLayout {
  const keys = parseJsonl({ raw, parseLine: (obj) => PhysicalKeySchema.parse(obj) });
  // Инвариант: уникальность keyCapId в файле
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k.keyCapId)) {
      throw new Error(`Duplicate keyCapId in physical layout: ${k.keyCapId}`);
    }
    seen.add(k.keyCapId);
  }
  return keys;
}

function parseSymbolLayout(raw: string): SymbolLayout {
  const entries = parseJsonl({ raw, parseLine: (obj) => SymbolEntrySchema.parse(obj) });
  // Инвариант: уникальность symbol
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.symbol)) {
      throw new Error(`Duplicate symbol in symbol layout: "${e.symbol}"`);
    }
    seen.add(e.symbol);
  }
  return entries;
}

function parseFingerLayout(raw: string): FingerLayout {
  const entries = parseJsonl({ raw, parseLine: (obj) => FingerEntrySchema.parse(obj) });
  // Инвариант: уникальность keyCapId
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.keyCapId)) {
      throw new Error(`Duplicate keyCapId in finger layout: ${e.keyCapId}`);
    }
    seen.add(e.keyCapId);
  }
  return entries;
}

// ---------- Meta для symbol-layouts (то, что было в SYMBOL_LAYOUT_REGISTRY) ----------

interface SymbolLayoutMeta {
  textLanguage: TextLanguage;
  isDefaultForTextLanguages: TextLanguage[];
}

const SYMBOL_LAYOUT_META: Record<SymbolLayoutId, SymbolLayoutMeta> = {
  qwerty: { textLanguage: 'en', isDefaultForTextLanguages: ['en'] },
  'йцукен': { textLanguage: 'ru', isDefaultForTextLanguages: ['ru'] },
};

// ---------- Module-level registries (загружаются на старте) ----------

const PHYSICAL_LAYOUTS: ReadonlyMap<PhysicalLayoutId, PhysicalLayout> = new Map([
  ['ansi', parsePhysicalLayout(physicalAnsiRaw)],
]);

const FINGER_LAYOUTS: ReadonlyMap<FingerLayoutId, FingerLayout> = new Map([
  ['asdf', parseFingerLayout(fingerAsdfRaw)],
  ['sdfv', parseFingerLayout(fingerSdfvRaw)],
]);

const SYMBOL_LAYOUTS: ReadonlyMap<SymbolLayoutId, SymbolLayoutDescriptor> = new Map(
  SYMBOL_LAYOUT_IDS.map((id) => {
    const raw = id === 'qwerty' ? symbolQwertyRaw : symbolJcukenRaw;
    const meta = SYMBOL_LAYOUT_META[id];
    const descriptor: SymbolLayoutDescriptor = {
      symbolLayoutId: id,
      textLanguage: meta.textLanguage,
      isDefaultForTextLanguages: meta.isDefaultForTextLanguages,
      symbolLayout: parseSymbolLayout(raw),
    };
    return [id, descriptor] as const;
  })
);

export const SYMBOL_LAYOUT_REGISTRY: SymbolLayoutDescriptor[] = [...SYMBOL_LAYOUTS.values()];

// ---------- Helpers (публичный API) ----------

export const getPhysicalLayout = (id: PhysicalLayoutId): PhysicalLayout => {
  const layout = PHYSICAL_LAYOUTS.get(id);
  if (!layout) throw new Error(`Unknown physicalLayoutId: ${id}`);
  return layout;
};

export const getFingerLayout = (id: FingerLayoutId): FingerLayout => {
  const layout = FINGER_LAYOUTS.get(id);
  if (!layout) throw new Error(`Unknown fingerLayoutId: ${id}`);
  return layout;
};

export const getSymbolLayout = (id: SymbolLayoutId): SymbolLayout =>
  getSymbolLayoutDescriptor(id).symbolLayout;

export const getSymbolLayoutDescriptor = (id: SymbolLayoutId): SymbolLayoutDescriptor => {
  const descriptor = SYMBOL_LAYOUTS.get(id);
  if (!descriptor) throw new Error(`Unknown symbolLayoutId: ${id}`);
  return descriptor;
};

export const getDefaultSymbolLayoutForTextLanguage = (
  textLanguage: TextLanguage
): SymbolLayoutDescriptor => {
  const exact = SYMBOL_LAYOUT_REGISTRY.find((d) =>
    d.isDefaultForTextLanguages.includes(textLanguage)
  );
  if (exact) return exact;
  // Фолбэк по родителю (BCP 47): 'en-CA' → 'en'
  const parent = textLanguage.split('-').slice(0, -1).join('-');
  if (parent.length > 0) {
    return getDefaultSymbolLayoutForTextLanguage(parent as TextLanguage);
  }
  throw new Error(`No default symbol layout for textLanguage: ${textLanguage}`);
};

export const getCompatibleSymbolLayoutsForTextLanguage = (
  textLanguage: TextLanguage
): SymbolLayoutDescriptor[] =>
  SYMBOL_LAYOUT_REGISTRY.filter(
    (d) => d.textLanguage === textLanguage || d.textLanguage.startsWith(textLanguage + '-')
  );

export const getSymbolsSupportedBySymbolLayout = (symbolLayout: SymbolLayout): Set<string> =>
  new Set(symbolLayout.map((e) => e.symbol));
