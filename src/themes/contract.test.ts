import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { THEMES } from './registry';

/**
 * Парсит CSS-блок селектора и возвращает map `property → value`.
 * Returns both custom properties (`--color-bg`) and regular CSS properties
 * (`color-scheme`) — тест использует оба.
 *
 * Селектор ищется как пара `<selector> + optional whitespace + {`, чтобы
 * не поймать упоминание селектора внутри JSDoc-комментария файла.
 */
function parseRootTokens(path: string, selector: string): Record<string, string> {
  const src = readFileSync(path, 'utf-8');
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
const appCssPath = resolve(REPO_ROOT, 'src', 'app.css');
const appHtmlPath = resolve(REPO_ROOT, 'src', 'app.html');

const baseTokens = parseRootTokens(appCssPath, ':root');
const baseColorTokens = Object.fromEntries(
  Object.entries(baseTokens).filter(([name]) => name.startsWith('--color-'))
);

function themePath(id: string): string {
  return resolve(themesDir, `${id}.css`);
}

describe('parseRootTokens', () => {
  it('parses base :root and returns at least 50 tokens including --color-bg', () => {
    expect(Object.keys(baseTokens).length).toBeGreaterThan(50);
    expect(baseTokens['--color-bg']).toBe('oklch(1 0 0)');
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

      it('declares every base --color-* token', () => {
        for (const name of Object.keys(baseColorTokens)) {
          expect(tokens, `theme '${theme.id}' is missing ${name}`).toHaveProperty(name);
        }
      });

      it(`declares color-scheme: ${theme.colorScheme}`, () => {
        expect(tokens['color-scheme']).toBe(theme.colorScheme);
      });
    });
  }
});

describe('_template.css', () => {
  const tokens = parseRootTokens(
    resolve(themesDir, '_template.css'),
    ':root[data-theme="__TEMPLATE__"]'
  );

  it('declares every base --color-* token (values may be unset)', () => {
    for (const name of Object.keys(baseColorTokens)) {
      expect(tokens, `_template.css is missing ${name}`).toHaveProperty(name);
    }
  });
});

describe('themes/light.css ↔ base :root parity', () => {
  const lightTokens = parseRootTokens(themePath('light'), ':root[data-theme="light"]');

  it('every base --color-* token has identical value in light.css', () => {
    for (const [name, baseValue] of Object.entries(baseColorTokens)) {
      expect(lightTokens[name], `mismatch on ${name}`).toBe(baseValue);
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
