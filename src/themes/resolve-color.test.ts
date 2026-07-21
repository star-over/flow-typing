import { describe, it, expect } from 'vitest';

import {
  resolveTokens,
  formatOklch,
  deltaE,
  contrastRatio,
  relativeLuminance,
} from './resolve-color';

describe('resolveTokens — грамматика тем', () => {
  it('разрешает абсолютное ядровое значение', () => {
    const resolved = resolveTokens({ '--parchment': 'oklch(0.93 0.04 80)' });
    expect(resolved['--parchment']).toEqual({ l: 0.93, c: 0.04, h: 80, alpha: 1 });
  });

  it('разрешает абсолютное значение с альфой', () => {
    const resolved = resolveTokens({ '--tint': 'oklch(0.95 0 0 / 0.7)' });
    expect(resolved['--tint']).toEqual({ l: 0.95, c: 0, h: 0, alpha: 0.7 });
  });

  it('разрешает плоскую пересылку var()', () => {
    const resolved = resolveTokens({
      '--ink': 'oklch(0.30 0.04 60)',
      '--color-text-primary': 'var(--ink)',
    });
    expect(resolved['--color-text-primary']).toEqual({ l: 0.3, c: 0.04, h: 60, alpha: 1 });
  });

  it('разрешает вывод с наследованием всех трёх компонентов', () => {
    const resolved = resolveTokens({
      '--parchment': 'oklch(0.93 0.04 80)',
      '--color-surface': 'oklch(from var(--parchment) calc(l - 0.04) c h)',
    });
    expect(resolved['--color-surface']).toEqual({ l: 0.89, c: 0.04, h: 80, alpha: 1 });
  });

  it('разрешает умножение и деление в calc', () => {
    const resolved = resolveTokens({
      '--ink': 'oklch(0.30 0.04 60)',
      '--color-link': 'oklch(from var(--ink) calc(l * .90) calc(c * 2) calc(h / 2))',
    });
    expect(resolved['--color-link']).toEqual({ l: 0.27, c: 0.08, h: 30, alpha: 1 });
  });

  it('разрешает вывод с литеральными светлотой и хромой и наследованным оттенком', () => {
    const resolved = resolveTokens({
      '--finger-3': 'oklch(0.70 0.135 250)',
      '--color-target-3': 'oklch(from var(--finger-3) 0.47 0.09 h)',
    });
    expect(resolved['--color-target-3']).toEqual({ l: 0.47, c: 0.09, h: 250, alpha: 1 });
  });

  it('берёт альфу из слота, когда он задан', () => {
    const resolved = resolveTokens({
      '--red': 'oklch(0.55 0.14 30)',
      '--color-error-dim': 'oklch(from var(--red) l c h / 0.16)',
    });
    expect(resolved['--color-error-dim']).toEqual({ l: 0.55, c: 0.14, h: 30, alpha: 0.16 });
  });

  it('наследует альфу базы, когда слот не задан', () => {
    const resolved = resolveTokens({
      '--dim': 'oklch(0.65 0.13 25 / 0.2)',
      '--color-error-dim': 'oklch(from var(--dim) l c h)',
    });
    expect(resolved['--color-error-dim']?.alpha).toBe(0.2);
  });

  it('разрешает цепочку роль → роль', () => {
    const resolved = resolveTokens({
      '--snow': 'oklch(0.96 0 0)',
      '--color-text-primary': 'var(--snow)',
      '--color-primary-background': 'var(--color-text-primary)',
    });
    expect(resolved['--color-primary-background']).toEqual({ l: 0.96, c: 0, h: 0, alpha: 1 });
  });

  it('нормализует оттенок в диапазон [0, 360)', () => {
    const resolved = resolveTokens({
      '--pink': 'oklch(0.55 0.17 355)',
      '--color-x': 'oklch(from var(--pink) l c calc(h + 10))',
    });
    expect(resolved['--color-x']?.h).toBe(5);
  });

  it('снимает шум плавающей точки округлением', () => {
    const resolved = resolveTokens({
      '--parchment': 'oklch(0.93 0.04 80)',
      '--color-surface-raised': 'oklch(from var(--parchment) calc(l - 0.01) c h)',
    });
    expect(resolved['--color-surface-raised']?.l).toBe(0.92);
  });

  it('пропускает не-custom-property (color-scheme)', () => {
    const resolved = resolveTokens({ 'color-scheme': 'light', '--ink': 'oklch(0.3 0 0)' });
    expect(Object.keys(resolved)).toEqual(['--ink']);
  });

  it('падает на цикле var()', () => {
    expect(() => resolveTokens({ '--a': 'var(--b)', '--b': 'var(--a)' })).toThrow(/cycle/i);
  });

  it('падает на необъявленной ссылке', () => {
    expect(() => resolveTokens({ '--a': 'var(--missing)' })).toThrow(/--missing/);
  });

  it('падает на неподдержанном значении', () => {
    expect(() => resolveTokens({ '--a': 'rgb(1 2 3)' })).toThrow(/rgb\(1 2 3\)/);
  });
});

describe('formatOklch', () => {
  it('печатает без альфы, когда она равна 1', () => {
    expect(formatOklch({ l: 0.93, c: 0.04, h: 80, alpha: 1 })).toBe('oklch(0.93 0.04 80)');
  });

  it('печатает альфу, когда она меньше 1', () => {
    expect(formatOklch({ l: 0.93, c: 0.04, h: 80, alpha: 0.16 })).toBe('oklch(0.93 0.04 80 / 0.16)');
  });
});

describe('deltaE — евклидово расстояние в OKLab', () => {
  it('на противоположных оттенках равен удвоенной хроме', () => {
    const first = { l: 0.5, c: 0.1, h: 0, alpha: 1 };
    const second = { l: 0.5, c: 0.1, h: 180, alpha: 1 };
    expect(deltaE({ first, second })).toBeCloseTo(0.2, 6);
  });

  it('при нулевой хроме сводится к разнице светлот, оттенок не влияет', () => {
    const first = { l: 0.98, c: 0, h: 0, alpha: 1 };
    const second = { l: 0.97, c: 0, h: 20, alpha: 1 };
    expect(deltaE({ first, second })).toBeCloseTo(0.01, 6);
  });

  it('не зависит от альфы', () => {
    const first = { l: 0.5, c: 0.1, h: 30, alpha: 1 };
    const second = { l: 0.5, c: 0.1, h: 30, alpha: 0.2 };
    expect(deltaE({ first, second })).toBe(0);
  });
});

describe('contrastRatio / relativeLuminance', () => {
  it('белый даёт яркость 1', () => {
    expect(relativeLuminance({ l: 1, c: 0, h: 0, alpha: 1 })).toBeCloseTo(1, 6);
  });

  it('чёрный даёт яркость 0', () => {
    expect(relativeLuminance({ l: 0, c: 0, h: 0, alpha: 1 })).toBeCloseTo(0, 6);
  });

  it('чёрный к белому даёт 21:1', () => {
    const first = { l: 1, c: 0, h: 0, alpha: 1 };
    const second = { l: 0, c: 0, h: 0, alpha: 1 };
    expect(contrastRatio({ first, second })).toBeCloseTo(21, 6);
  });

  it('симметричен по порядку аргументов', () => {
    const first = { l: 0.93, c: 0.04, h: 80, alpha: 1 };
    const second = { l: 0.3, c: 0.04, h: 60, alpha: 1 };
    expect(contrastRatio({ first, second })).toBeCloseTo(contrastRatio({ first: second, second: first }), 12);
  });
});
