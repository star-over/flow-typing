/**
 * @file fs-загрузчик символьной раскладки для офлайн-инструментов мастерской.
 * Читает json по пути (данные приложения, src/data/layouts); чистые помощники и
 * тип — в `shared/symbol-layout.ts` (рантайм-модель, общая с сервером).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SymbolEntry } from '../../shared/symbol-layout.ts';

/** symbolLayoutId → имя файла раскладки. */
const LAYOUT_FILE: Record<string, string> = {
  'йцукен': 'symbol-layout-jcuken.json',
  qwerty: 'symbol-layout-qwerty.json',
};

export function loadSymbolLayout(symbolLayoutId: string): SymbolEntry[] {
  const file = LAYOUT_FILE[symbolLayoutId];
  if (!file) {
    throw new Error(`Неизвестная раскладка: ${symbolLayoutId}. Доступны: ${Object.keys(LAYOUT_FILE).join(', ')}`);
  }
  const raw = readFileSync(join(process.cwd(), 'src/data/layouts', file), 'utf-8');
  return JSON.parse(raw) as SymbolEntry[];
}
