#!/usr/bin/env node
/**
 * @file Отчёт по теме для работы с ядром: разрешённые координаты, близкие пары
 * ядровых токенов (кандидаты на сведение) и контраст ролей к подложкам.
 *
 * Запуск (Node ≥ 22, нативный TS): `make theme-report` или
 *   node src/scripts/theme-report.ts [themeId …]
 *
 * Вывод детерминирован и предназначен для сравнения: снять отчёт до правки
 * темы, снять после, сравнить `diff`. Относительные импорты с расширением
 * `.ts` — требование Node-ESM.
 */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROLE_DICTIONARY } from '../themes/roles.ts';
import { parseRootTokens } from '../themes/parse-theme-css.ts';
import {
  resolveTokens,
  formatOklch,
  deltaE,
  contrastRatio,
  compositeOver,
  type Oklch,
} from '../themes/resolve-color.ts';

/**
 * Список ID тем берётся с диска (`src/themes/*.css`, кроме `_template.css`),
 * а не из `THEMES` (`../themes/registry.ts`): этот модуль тянет за собой
 * `@/lib/settings` → `$app/environment` — виртуальный модуль SvelteKit,
 * которого нет вне сборки Vite, и который поэтому не резолвится при
 * нативном запуске TS через Node. Эквивалентность списка с `THEMES`
 * зафиксирована `contract.test.ts` («file list matches registry»).
 */
const THEMES_DIR = resolve(import.meta.dirname, '..', 'themes');

function listThemeIds(): string[] {
  return readdirSync(THEMES_DIR)
    .filter((file) => file.endsWith('.css') && file !== '_template.css')
    .map((file) => file.replace(/\.css$/, ''))
    .sort();
}

/** Порог сведения близких значений (спек: ΔE ≤ 0.05). */
const COLLAPSE_THRESHOLD = 0.05;

/** Роли-подложки: к ним считается контраст (спек, правило контраста). Все плотные (alpha 1). */
const BACKDROPS = [
  '--color-background',
  '--color-surface',
  '--color-surface-raised',
  '--color-surface-hover',
  '--color-surface-accent',
  '--color-primary-background',
  '--color-error',
  '--color-success',
  '--color-target-1',
  '--color-target-2',
  '--color-target-3',
  '--color-target-4',
  '--color-target-5',
  '--color-cursor-background',
] as const;

/**
 * Полупрозрачные заливки клавиш: метки и символы реально лежат на них, а не на
 * плоских ролях из `BACKDROPS`. В отчёт они попадают не сырыми (сравнение с
 * плотной ролью дало бы систематически оптимистичный контраст — см.
 * `relativeLuminance`), а уже наложенными на `--color-background` через
 * `compositeOver`; колонка помечается суффиксом `·composite@background`.
 */
const COMPOSITE_KEYCAP_BACKDROPS = [
  '--color-keycap-correct-background',
  '--color-keycap-error-background',
  '--color-keycap-group-1-background',
  '--color-keycap-group-2-background',
  '--color-keycap-group-3-background',
  '--color-keycap-group-4-background',
  '--color-keycap-group-5-background',
] as const;

function fixed({ value, digits }: { value: number; digits: number }): string {
  return value.toFixed(digits);
}

/** Секция «ЯДРО»/«РОЛИ»: имя токена + разрешённое значение, при наличии. */
function printTokenSection({
  title,
  names,
  resolved,
  padTo,
}: {
  title: string;
  names: string[];
  resolved: Record<string, Oklch>;
  padTo: number;
}): void {
  console.log(`\n-- ${title} (${names.length}) ---------------------------------------------`);
  for (const name of names) {
    const color = resolved[name];
    if (color) console.log(`${name.padEnd(padTo)} ${formatOklch(color)}`);
  }
}

/**
 * Сгруппировать разрешённые значения по координатам (не по имени): все токены
 * (ядро и роли) с одинаковым `formatOklch` попадают в одну группу. Так
 * псевдонимы (роль = var(ядро), ΔE 0) схлопываются и не засоряют вывод, а
 * близкая пара видна со всеми носителями — в том числе когда одна сторона
 * уже стала выведенной ролью, а не ядровым токеном.
 */
function groupByResolvedValue({
  names,
  resolved,
}: {
  names: string[];
  resolved: Record<string, Oklch>;
}): [string, { color: Oklch; names: string[] }][] {
  const groups = new Map<string, { color: Oklch; names: string[] }>();
  for (const name of names) {
    const color = resolved[name];
    if (!color) continue;
    const key = formatOklch(color);
    const group = groups.get(key);
    if (group) group.names.push(name);
    else groups.set(key, { color, names: [name] });
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

interface ClosePair {
  first: string;
  second: string;
  distance: number;
  sameAlpha: boolean;
}

/** Все пары групп с ΔE в пределах порога сведения, отсортированные по возрастанию ΔE. */
function findClosePairs(
  entries: [string, { color: Oklch; names: string[] }][]
): ClosePair[] {
  const pairs: ClosePair[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const left = entries[i];
      const right = entries[j];
      if (!left || !right) continue;
      const [leftKey, leftGroup] = left;
      const [rightKey, rightGroup] = right;
      const distance = deltaE({ first: leftGroup.color, second: rightGroup.color });
      if (distance > COLLAPSE_THRESHOLD) continue;
      pairs.push({
        first: `${leftKey}  ← ${leftGroup.names.join(', ')}`,
        second: `${rightKey}  ← ${rightGroup.names.join(', ')}`,
        distance,
        sameAlpha: leftGroup.color.alpha === rightGroup.color.alpha,
      });
    }
  }
  return pairs.sort((a, b) => a.distance - b.distance || a.first.localeCompare(b.first));
}

function printClosePairsSection({
  coreNames,
  roleNames,
  resolved,
}: {
  coreNames: string[];
  roleNames: string[];
  resolved: Record<string, Oklch>;
}): void {
  console.log(`\n-- БЛИЗКИЕ ЗНАЧЕНИЯ (ΔE ≤ ${COLLAPSE_THRESHOLD}) ------------------------`);
  const entries = groupByResolvedValue({ names: [...coreNames, ...roleNames], resolved });
  const pairs = findClosePairs(entries);
  if (pairs.length === 0) console.log('(нет)');
  for (const pair of pairs) {
    const alphaNote = pair.sameAlpha ? '' : '   [разная альфа — сведение запрещено]';
    console.log(`\nΔE ${fixed({ value: pair.distance, digits: 4 })}${alphaNote}\n  ${pair.first}\n  ${pair.second}`);
  }
}

function printContrastSection({
  roleNames,
  resolved,
}: {
  roleNames: string[];
  resolved: Record<string, Oklch>;
}): void {
  console.log('\n-- КОНТРАСТ РОЛЕЙ К ПОДЛОЖКАМ -----------------------------------');
  console.log(
    '-- Колонки `·composite@background` — заливки клавиш (полупрозрачные) наложены на\n' +
      '-- `--color-background` и посчитаны уже плотными. Это честно для меток на сцене\n' +
      '-- фона; подложки поверх чего-то ещё (клавиша поверх пальца, поверх соседней роли\n' +
      '-- с альфой) этот расчёт не покрывает — число для них не даётся.'
  );
  const backdrops: { name: string; color: Oklch }[] = [];
  for (const name of BACKDROPS) {
    const color = resolved[name];
    if (color) backdrops.push({ name, color });
  }
  const background = resolved['--color-background'];
  if (background) {
    for (const name of COMPOSITE_KEYCAP_BACKDROPS) {
      const overlay = resolved[name];
      if (!overlay) continue;
      const composite = compositeOver({ overlay, backdrop: background });
      backdrops.push({ name: `${name}·composite@background`, color: composite });
    }
  }
  for (const roleName of roleNames) {
    const color = resolved[roleName];
    if (!color) continue;
    const ratios = backdrops.map(
      (backdrop) =>
        `${backdrop.name.replace('--color-', '')}=${fixed({ value: contrastRatio({ first: color, second: backdrop.color }), digits: 2 })}`
    );
    console.log(`${roleName.padEnd(36)} ${ratios.join(' ')}`);
  }
}

function reportTheme(themeId: string): void {
  const tokens = parseRootTokens({
    path: resolve(import.meta.dirname, '..', 'themes', `${themeId}.css`),
    selector: `:root[data-theme="${themeId}"]`,
  });
  const resolved = resolveTokens(tokens);

  const coreNames = Object.keys(tokens)
    .filter((name) => name.startsWith('--') && !name.startsWith('--color-'))
    .sort();
  const roleNames = [...ROLE_DICTIONARY].sort();

  console.log(`\n${'='.repeat(72)}\nТЕМА ${themeId}\n${'='.repeat(72)}`);

  printTokenSection({ title: 'ЯДРО', names: coreNames, resolved, padTo: 24 });
  printTokenSection({ title: 'РОЛИ', names: roleNames, resolved, padTo: 36 });
  printClosePairsSection({ coreNames, roleNames, resolved });
  printContrastSection({ roleNames, resolved });
}

const requested = process.argv.slice(2);
const themeIds = requested.length > 0 ? requested : listThemeIds();
for (const themeId of themeIds) reportTheme(themeId);
