/**
 * Единая точка входа для всех слоёв раскладок.
 *
 * Источники истины:
 * - `src/data/layouts/physical-layout-*.json`
 * - `src/data/layouts/symbol-layout-*.json`
 * - `src/data/layouts/finger-layout-*.json`
 *
 * Файлы импортируются как JSON, проверяются Zod-схемами,
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

import physicalAnsi from '@/data/layouts/physical-layout-ansi.json';
import symbolQwerty from '@/data/layouts/symbol-layout-qwerty.json';
import symbolJcuken from '@/data/layouts/symbol-layout-jcuken.json';
import fingerAsdf from '@/data/layouts/finger-layout-asdf.json';
import fingerSdfv from '@/data/layouts/finger-layout-sdfv.json';

// ---------- Zod-схемы для записей раскладок ----------

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

// ---------- Парсеры массивов с runtime-инвариантами ----------

function parsePhysicalLayout(data: unknown): PhysicalLayout {
  const keys = z.array(PhysicalKeySchema).parse(data);
  // Инвариант: уникальность keyCapId
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k.keyCapId)) {
      throw new Error(`Duplicate keyCapId in physical layout: ${k.keyCapId}`);
    }
    seen.add(k.keyCapId);
  }
  return keys;
}

function parseSymbolLayout(data: unknown): SymbolLayout {
  const entries = z.array(SymbolEntrySchema).parse(data);
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

function parseFingerLayout(data: unknown): FingerLayout {
  const entries = z.array(FingerEntrySchema).parse(data);
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
  ['ansi', parsePhysicalLayout(physicalAnsi)],
]);

const FINGER_LAYOUTS: ReadonlyMap<FingerLayoutId, FingerLayout> = new Map([
  ['asdf', parseFingerLayout(fingerAsdf)],
  ['sdfv', parseFingerLayout(fingerSdfv)],
]);

const SYMBOL_LAYOUTS: ReadonlyMap<SymbolLayoutId, SymbolLayoutDescriptor> = new Map(
  SYMBOL_LAYOUT_IDS.map((id) => {
    const data = id === 'qwerty' ? symbolQwerty : symbolJcuken;
    const meta = SYMBOL_LAYOUT_META[id];
    const descriptor: SymbolLayoutDescriptor = {
      symbolLayoutId: id,
      textLanguage: meta.textLanguage,
      isDefaultForTextLanguages: meta.isDefaultForTextLanguages,
      symbolLayout: parseSymbolLayout(data),
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
