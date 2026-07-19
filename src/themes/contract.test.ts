import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

import { THEMES } from './registry';
import { ROLE_DICTIONARY } from './roles';

/**
 * Контракт-тест двухслойной модели (ADR 0029, после растворения L3).
 *
 * Слой 3 (компонентные токены `--<компонент>-*`) растворён: компоненты ссылаются
 * на роли L2 (`--color-*`) напрямую, темы несут только ядро (L1) + роли (L2).
 * Здесь НЕТ префиксных эвристик «имя с префиксом ⇒ L3» — они не отличают L3 от
 * приватного ядра тем (у light/dark/nord ядро зовётся `--finger-1`, `--keycap-tint-1`…)
 * и от компонентных локальных переменных (`--keycap-unit`, `--avatar-size`). Вместо этого:
 *   - остаток оставшегося L3 В ТЕМЕ ловит L1-дисциплина (ядерный токен со
 *     значением-`var()` — это и есть не срезанный до конца контракт);
 *   - остаток L3-ссылок В КОМПОНЕНТАХ — прямой скан с исключением двух локальных переменных.
 */

const REPO_ROOT = resolve(__dirname, '..', '..');
const themesDir = resolve(REPO_ROOT, 'src', 'themes');
const srcDir = resolve(REPO_ROOT, 'src');
const appHtmlPath = resolve(REPO_ROOT, 'src', 'app.html');
const appCssPath = resolve(REPO_ROOT, 'src', 'app.css');

// Префиксы растворённого слоя 3 (компонентные семьи). Только для скана компонентов
// на остаток L3-ссылок — НЕ применяются к темам (там их ловит L1-дисциплина).
const LEGACY_PREFIXES = [
  'keycap', 'finger', 'hands', 'movement-path', 'flow-line', 'cursor-symbol',
  'regular-symbol', 'rhythm-channel', 'footer-actions', 'header', 'main-content',
  'select', 'session-stats-display', 'repertoire-progress', 'survey-prompt',
  'settings-page', 'sign-in-screen', 'user-menu', 'avatar', 'wordmark', 'landing', 'body',
];
// Компонентные локальные переменные, делящие легаси-префикс, но НЕ являющиеся
// токенами темы (это размеры). Исключены из скана остатка L3.
const LOCAL_VAR_EXCEPTIONS = new Set(['--keycap-unit', '--avatar-size']);

const ROLE_SET = new Set<string>(ROLE_DICTIONARY);
const REQUIRED_THEMES = ['sepia', 'light', 'dark', 'nord'] as const;
const TEMPLATE_SELECTOR = ':root[data-theme="__TEMPLATE__"]';

function stripComments(src: string): string {
  // Убираем CSS-комментарии: их текст может содержать `имя: значение;` (пояснение
  // к роли), и жадное сопоставление проглотило бы соседнюю реальную декларацию.
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Тело блока `<selector> { ... }` (без внешних фигурных скобок), учитывая вложенность. */
function selectorBody(src: string, selector: string, path: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const selectorRe = new RegExp(escaped + '\\s*\\{', 'g');
  const match = selectorRe.exec(src);
  if (!match) throw new Error(`Selector ${selector} { ... } not found in ${path}`);
  const open = match.index + match[0].length - 1;
  let depth = 1;
  let i = open + 1;
  while (depth > 0 && i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(open + 1, i - 1);
}

/** map `property → value` (последнее определение побеждает). */
function parseRootTokens(path: string, selector: string): Record<string, string> {
  const body = selectorBody(stripComments(readFileSync(path, 'utf-8')), selector, path);
  const out: Record<string, string> = {};
  const decl = /([a-zA-Z-][\w-]*)\s*:\s*([^;]+);/g;
  for (const m of body.matchAll(decl)) {
    const [, name, value] = m;
    if (name && value) out[name] = value.trim();
  }
  return out;
}

/** dup-preserving: пары `[name, value]` в исходном порядке (для обнаружения дублей). */
function parseRawDeclarations(path: string, selector: string): [string, string][] {
  const body = selectorBody(stripComments(readFileSync(path, 'utf-8')), selector, path);
  const out: [string, string][] = [];
  const decl = /([a-zA-Z-][\w-]*)\s*:\s*([^;]+);/g;
  for (const m of body.matchAll(decl)) {
    const [, name, value] = m;
    if (name && value) out.push([name, value.trim()]);
  }
  return out;
}

function themePath(id: string): string {
  return resolve(themesDir, `${id}.css`);
}
function themeSelector(id: string): string {
  return `:root[data-theme="${id}"]`;
}

/** Рекурсивно собрать `*.svelte` под каталогом. */
function svelteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...svelteFiles(full));
    else if (entry.endsWith('.svelte')) out.push(full);
  }
  return out;
}

function relative(path: string): string {
  return path.startsWith(REPO_ROOT + '/') ? path.slice(REPO_ROOT.length + 1) : path;
}

// ============================================================
// registry ↔ filesystem
// ============================================================
describe('themes/registry ↔ filesystem sync', () => {
  it('file list matches registry (excluding _template.css)', () => {
    const filesOnDisk = readdirSync(themesDir)
      .filter((f) => f.endsWith('.css') && f !== '_template.css')
      .map((f) => f.replace(/\.css$/, ''))
      .sort();
    expect(filesOnDisk).toEqual(THEMES.map((t) => t.id).sort());
  });

  it('declares required theme `light` with colorScheme=light', () => {
    expect(THEMES.find((t) => t.id === 'light')?.colorScheme).toBe('light');
  });

  it('declares required theme `dark` with colorScheme=dark', () => {
    expect(THEMES.find((t) => t.id === 'dark')?.colorScheme).toBe('dark');
  });
});

// ============================================================
// L2: словарь ролей объявлен каждой темой И шаблоном
// ============================================================
describe('L2 role dictionary — declaration', () => {
  const targets = [
    ...THEMES.map((t) => ({ id: t.id, path: themePath(t.id), selector: themeSelector(t.id) })),
    { id: '_template', path: resolve(themesDir, '_template.css'), selector: TEMPLATE_SELECTOR },
  ];

  for (const t of targets) {
    it(`'${t.id}' declares every role in ROLE_DICTIONARY`, () => {
      const tokens = parseRootTokens(t.path, t.selector);
      for (const role of ROLE_DICTIONARY) {
        expect(tokens, `'${t.id}' is missing role ${role}`).toHaveProperty(role);
      }
    });
  }

  it('every theme declares its registered color-scheme', () => {
    for (const t of THEMES) {
      const tokens = parseRootTokens(themePath(t.id), themeSelector(t.id));
      expect(tokens['color-scheme'], `'${t.id}' color-scheme`).toBe(t.colorScheme);
    }
  });
});

// ============================================================
// Дисциплина слоёв (реальные темы)
//   L1: токен НЕ --color-* и НЕ color-scheme = ядро → значение без var().
//       Оставшийся L3 (`--keycap-l1-background: var(...)`) падает здесь —
//       это RED-драйвер до среза (Task B2).
//   L2: --color-* начинается с var( или oklch(from var(.
// ============================================================
describe('layer discipline (real themes)', () => {
  const L2_FORM = /^(var\(|oklch\(from var\()/;

  for (const id of REQUIRED_THEMES) {
    const tokens = parseRootTokens(themePath(id), themeSelector(id));

    it(`'${id}': L1 core tokens carry no var() (also catches non-fully-stripped L3)`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (name.startsWith('--color-') || name === 'color-scheme') continue;
        expect(
          value,
          `${id}: non-role token ${name} contains var() (leftover L3 or core-with-var): ${value}`
        ).not.toContain('var(');
      }
    });

    it(`'${id}': L2 roles are var()/oklch(from var()`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (!name.startsWith('--color-')) continue;
        expect(value, `${id}: role ${name} with absolute value: ${value}`).toMatch(L2_FORM);
      }
    });
  }
});

// ============================================================
// L2: ссылки на роли внутри темы разрешаются (нет висячих var(--color-*))
// ============================================================
describe('themes: referenced --color-* roles are declared in the same theme', () => {
  const varColorRe = /var\(\s*(--color-[a-z0-9-]+)/g;

  for (const t of THEMES) {
    it(`'${t.id}': every referenced --color-* is declared`, () => {
      const tokens = parseRootTokens(themePath(t.id), themeSelector(t.id));
      const declared = new Set(Object.keys(tokens).filter((k) => k.startsWith('--color-')));
      for (const value of Object.values(tokens)) {
        for (const m of value.matchAll(varColorRe)) {
          if (m[1]) expect(declared, `'${t.id}': dangling var(${m[1]})`).toContain(m[1]);
        }
      }
    });
  }
});

// ============================================================
// Дубли имён + циклы var() (реальные темы) — вобран backlog «усилить контракт-тест»
// ============================================================
describe('themes: no duplicate names, no var() cycles', () => {
  for (const id of REQUIRED_THEMES) {
    it(`'${id}': no duplicate custom-property names`, () => {
      const decls = parseRawDeclarations(themePath(id), themeSelector(id));
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const [name] of decls) {
        if (!name.startsWith('--')) continue;
        if (seen.has(name)) duplicates.push(name);
        seen.add(name);
      }
      expect(duplicates, `${id}: duplicate names: ${duplicates.join(', ')}`).toEqual([]);
    });

    it(`'${id}': no var() reference cycles`, () => {
      const tokens = parseRootTokens(themePath(id), themeSelector(id));
      const refRe = /var\(\s*(--[a-z0-9-]+)/g;
      const graph = new Map<string, string[]>();
      for (const [name, value] of Object.entries(tokens)) {
        const edges: string[] = [];
        for (const m of value.matchAll(refRe)) {
          if (m[1] && m[1] in tokens) edges.push(m[1]);
        }
        graph.set(name, edges);
      }
      const WHITE = 0;
      const GRAY = 1;
      const BLACK = 2;
      const color = new Map<string, number>();
      const stack: string[] = [];
      function dfs(node: string): string[] | null {
        color.set(node, GRAY);
        stack.push(node);
        for (const next of graph.get(node) ?? []) {
          const c = color.get(next) ?? WHITE;
          if (c === GRAY) return [...stack.slice(stack.indexOf(next)), next];
          if (c === WHITE) {
            const cyc = dfs(next);
            if (cyc) return cyc;
          }
        }
        color.set(node, BLACK);
        stack.pop();
        return null;
      }
      for (const node of graph.keys()) {
        if ((color.get(node) ?? WHITE) === WHITE) {
          const cyc = dfs(node);
          expect(cyc, `${id}: var() cycle: ${cyc?.join(' → ')}`).toBeNull();
        }
      }
    });
  }
});

// ============================================================
// Компоненты: ссылаются только на валидные роли; не осталось L3-ссылок
//   Скан src/**/*.svelte + src/app.css.
// ============================================================
describe('components: valid role references, no leftover L3', () => {
  const files = [...svelteFiles(srcDir), appCssPath];
  const legacyRe = new RegExp(`var\\(\\s*--(${LEGACY_PREFIXES.join('|')})-[a-z0-9-]+`, 'g');
  const colorRefRe = /var\(\s*(--color-[a-z0-9-]+)/g;

  it('no component references a legacy L3 contract token (except known local vars)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf-8');
      for (const m of src.matchAll(legacyRe)) {
        const token = m[0].replace(/^var\(\s*/, '');
        if (!LOCAL_VAR_EXCEPTIONS.has(token)) offenders.push(`${relative(file)}: ${token}`);
      }
    }
    expect(offenders, `leftover L3 references:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every static var(--color-*) reference is a declared role (dynamic ${} refs skipped)', () => {
    const bad: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf-8');
      for (const m of src.matchAll(colorRefRe)) {
        // Пропускаем динамические шаблоны: var(--color-finger-${…}) / var(--color-route-${…})
        if (src[m.index + m[0].length] === '$') continue;
        if (m[1] && !ROLE_SET.has(m[1])) bad.push(`${relative(file)}: ${m[1]}`);
      }
    }
    expect(bad, `unknown --color-* roles referenced:\n${bad.join('\n')}`).toEqual([]);
  });
});

// ============================================================
// app.html inline bootstrap
// ============================================================
describe('app.html inline bootstrap', () => {
  const html = readFileSync(appHtmlPath, 'utf-8');

  it('sets document.documentElement.dataset.theme synchronously', () => {
    expect(html).toMatch(/dataset\.theme\s*=/);
  });

  it('reads the mirror-key `flow-typing-theme`', () => {
    expect(html).toContain('flow-typing-theme');
  });

  it('falls back to prefers-color-scheme: dark', () => {
    expect(html).toMatch(/prefers-color-scheme:\s*dark/);
  });
});
