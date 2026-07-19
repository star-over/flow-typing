import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { THEMES } from './registry';
import { THEME_CONTRACT } from './contract';
import { ROLE_DICTIONARY } from './roles';

/**
 * Парсит CSS-блок селектора и возвращает map `property → value`.
 * Returns both custom properties (`--keycap-l2-background`) and regular CSS
 * properties (`color-scheme`) — тест использует оба.
 *
 * Селектор ищется как пара `<selector> + optional whitespace + {`, чтобы
 * не поймать упоминание селектора внутри JSDoc-комментария файла.
 */
function parseRootTokens(path: string, selector: string): Record<string, string> {
  // Убираем CSS-комментарии: их текст может содержать `имя: значение;` (пример —
  // пояснение к роли внутри `/* … */`), и жадное сопоставление значения проглотило
  // бы соседнюю реальную декларацию. Комментарии CSS не вкладываются — `*?` корректен.
  const src = readFileSync(path, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
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
  const body = src.slice(open + 1, i - 1);
  const out: Record<string, string> = {};
  const decl = /([a-zA-Z-][\w-]*)\s*:\s*([^;]+);/g;
  for (const m of body.matchAll(decl)) {
    const [, name, value] = m;
    if (name && value) out[name] = value.trim();
  }
  return out;
}

function getThemeOrFail(id: string) {
  const t = THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`Required theme '${id}' missing from registry`);
  return t;
}

const REPO_ROOT = resolve(__dirname, '..', '..');
const themesDir = resolve(REPO_ROOT, 'src', 'themes');
const appHtmlPath = resolve(REPO_ROOT, 'src', 'app.html');

function themePath(id: string): string {
  return resolve(themesDir, `${id}.css`);
}

describe('THEME_CONTRACT', () => {
  it('has no duplicate tokens', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const token of THEME_CONTRACT) {
      if (seen.has(token)) duplicates.push(token);
      seen.add(token);
    }
    expect(duplicates, `duplicates: ${duplicates.join(', ')}`).toEqual([]);
  });

  it('lists at least 100 tokens (sanity check on aggregation)', () => {
    expect(THEME_CONTRACT.length).toBeGreaterThanOrEqual(100);
  });

  it('every token starts with `--`', () => {
    for (const token of THEME_CONTRACT) {
      expect(token.startsWith('--'), `token without -- prefix: ${token}`).toBe(true);
    }
  });
});

describe('themes/registry ↔ filesystem sync', () => {
  it('file list matches registry (excluding _template.css)', () => {
    const filesOnDisk = readdirSync(themesDir)
      .filter((f) => f.endsWith('.css') && f !== '_template.css')
      .map((f) => f.replace(/\.css$/, ''))
      .sort();
    const registry = THEMES.map((t) => t.id).sort();
    expect(filesOnDisk).toEqual(registry);
  });

  it('declares required theme `light` with colorScheme=light', () => {
    expect(getThemeOrFail('light').colorScheme).toBe('light');
  });

  it('declares required theme `dark` with colorScheme=dark', () => {
    expect(getThemeOrFail('dark').colorScheme).toBe('dark');
  });
});

describe('themes/*.css contract', () => {
  for (const theme of THEMES) {
    describe(`theme '${theme.id}'`, () => {
      const tokens = parseRootTokens(themePath(theme.id), `:root[data-theme="${theme.id}"]`);

      it('declares every contract token', () => {
        for (const name of THEME_CONTRACT) {
          expect(tokens, `theme '${theme.id}' is missing ${name}`).toHaveProperty(name);
        }
      });

      it(`declares color-scheme: ${theme.colorScheme}`, () => {
        expect(tokens['color-scheme']).toBe(theme.colorScheme);
      });
    });
  }
});

// Темы, приведённые к эталонному словарю ролей L2 (ADR 0029): все темы
// декларируют все 73 роли и держат трёхслойную структуру.
const NORMALIZED = ['sepia', 'light', 'dark', 'nord'] as const;

describe('L2 role dictionary — declaration', () => {
  for (const id of NORMALIZED) {
    it(`theme '${id}' declares every role in ROLE_DICTIONARY`, () => {
      const tokens = parseRootTokens(themePath(id), `:root[data-theme="${id}"]`);
      for (const role of ROLE_DICTIONARY) {
        expect(tokens, `theme '${id}' is missing role ${role}`).toHaveProperty(role);
      }
    });
  }
});

describe('L2 role dictionary — var() resolution (no dangling var(--color-*))', () => {
  const varColorRe = /var\(\s*(--color-[a-z0-9-]+)/g;

  for (const theme of THEMES) {
    it(`theme '${theme.id}': every referenced --color-* is declared`, () => {
      const tokens = parseRootTokens(themePath(theme.id), `:root[data-theme="${theme.id}"]`);
      const declared = new Set(Object.keys(tokens).filter((k) => k.startsWith('--color-')));
      const referenced = new Set<string>();
      for (const value of Object.values(tokens)) {
        for (const m of value.matchAll(varColorRe)) {
          if (m[1]) referenced.add(m[1]);
        }
      }
      for (const ref of referenced) {
        expect(
          declared,
          `theme '${theme.id}': dangling var(${ref}) — role never declared`
        ).toContain(ref);
      }
    });
  }
});

describe('_template.css', () => {
  const tokens = parseRootTokens(
    resolve(themesDir, '_template.css'),
    ':root[data-theme="__TEMPLATE__"]'
  );

  it('declares every contract token (values may be unset)', () => {
    for (const name of THEME_CONTRACT) {
      expect(tokens, `_template.css is missing ${name}`).toHaveProperty(name);
    }
  });
});

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

describe('layer discipline (NORMALIZED themes)', () => {
  // L1: голое имя (не --color-*, не токен контракта) — только абсолюты, ни одного var()
  // L2: --color-* — значение начинается с `var(` или `oklch(from var(` (нет новых абсолютов)
  // L3: токен из THEME_CONTRACT — цветовой слот только var(); запрещены oklch(/rgb(/hsl(/#hex/именованные цвета/currentColor; литерал `transparent` разрешён (ADR 0029)
  const L2_FORM = /^(var\(|oklch\(from var\()/;
  const COLOR_LITERAL = /(?:oklch|rgb|rgba|hsl|hsla|hwb|lab|lch|color)\(|#[0-9a-fA-F]{3,8}\b|\b(?:red|blue|green|black|white|yellow|cyan|magenta|orange|purple|brown|pink|gray|grey|lime|navy|teal|olive|silver|gold|indigo|violet|currentColor)\b/i;

  for (const id of NORMALIZED) {
    const tokens = parseRootTokens(themePath(id), `:root[data-theme="${id}"]`);
    const contractSet = new Set<string>(THEME_CONTRACT);

    it(`theme '${id}': L1 (ядро) не ссылается ни на что`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (name.startsWith('--color-') || contractSet.has(name) || name === 'color-scheme') continue;
        expect(value, `${id}: ядерный ${name} содержит var()`).not.toContain('var(');
      }
    });

    it(`theme '${id}': L2 (роли) — только var()/oklch(from var()`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (!name.startsWith('--color-')) continue;
        expect(value, `${id}: роль ${name} с абсолютом: ${value}`).toMatch(L2_FORM);
      }
    });

    it(`theme '${id}': L3 (контракт) — без цветовых литералов`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (!contractSet.has(name)) continue;
        const valueWithoutVarRefs = value.replace(/var\(--[\w-]+\)/g, '');
        expect(valueWithoutVarRefs, `${id}: контракт ${name} с цветовым литералом: ${value}`).not.toMatch(COLOR_LITERAL);
      }
    });
  }
});
