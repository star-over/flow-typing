import { describe, it, expect } from 'vitest';

import {
  resolveTokens,
  formatOklch,
  deltaE,
  contrastRatio,
  relativeLuminance,
  compositeOver,
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

  it('падает на битом числе светлоты (одна точка)', () => {
    expect(() => resolveTokens({ '--a': 'oklch(. 0 0)' })).toThrow(/\./);
  });

  it('падает на битом числе с двумя точками', () => {
    expect(() => resolveTokens({ '--a': 'oklch(0.5.5 0 0)' })).toThrow(/0\.5\.5/);
  });

  it('падает на битой альфе', () => {
    expect(() => resolveTokens({ '--a': 'oklch(0.5 0 0 / .)' })).toThrow(/\./);
  });

  it('падает на пустом слоте альфы в relative color', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) l c h /)',
      }),
    ).toThrow();
  });

  it('падает на лишнем токене после альфы', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) l c h / 0.5 0.7)',
      }),
    ).toThrow();
  });

  it('падает на двойном слэше альфы', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) l c h / 0.5 / 0.7)',
      }),
    ).toThrow();
  });

  it('падает на делении на ноль в calc (оттенок становится NaN)', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) calc(h / 0) c h)',
      }),
    ).toThrow();
  });

  it('падает на делении на ноль в calc (светлота становится Infinity)', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) calc(l / 0) c h)',
      }),
    ).toThrow();
  });

  it('падает на голом литерале Infinity в relative color', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) Infinity c h)',
      }),
    ).toThrow();
  });

  it('падает на шестнадцатеричном литерале (0x10)', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) 0x10 c h)',
      }),
    ).toThrow();
  });

  it('падает на экспоненциальном литерале (1e2)', () => {
    expect(() =>
      resolveTokens({
        '--x': 'oklch(0.5 0.1 30)',
        '--a': 'oklch(from var(--x) 1e2 c h)',
      }),
    ).toThrow();
  });

  it('падает на неизвестном канале в calc', () => {
    expect(() =>
      resolveTokens({ '--x': 'oklch(0.5 0.1 30)', '--a': 'oklch(from var(--x) calc(a - 0.1) c h)' }),
    ).toThrow(/a - 0.1/);
  });
});

describe('formatOklch', () => {
  it('печатает без альфы, когда она равна 1', () => {
    expect(formatOklch({ l: 0.93, c: 0.04, h: 80, alpha: 1 })).toBe('oklch(0.93 0.04 80)');
  });

  it('печатает альфу, когда она меньше 1', () => {
    expect(formatOklch({ l: 0.93, c: 0.04, h: 80, alpha: 0.16 })).toBe('oklch(0.93 0.04 80 / 0.16)');
  });

  it('канонизирует оттенок в 0 при нулевой хроме', () => {
    expect(formatOklch({ l: 0.97, c: 0, h: 20, alpha: 1 })).toBe('oklch(0.97 0 0)');
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

  it('для цвета вне охвата sRGB редуцирует хрому вместо покомпонентного отсечения', () => {
    // oklch(0.55 0.4 250) вне охвата: канал b (синий) сильно превышает 1.
    // Наивное покомпонентное отсечение и редукция хромы дают разную яркость.
    const outOfGamut = { l: 0.55, c: 0.4, h: 250, alpha: 1 };

    const raw = (() => {
      const radians = (outOfGamut.h * Math.PI) / 180;
      const a = outOfGamut.c * Math.cos(radians);
      const b = outOfGamut.c * Math.sin(radians);
      const lRoot = outOfGamut.l + 0.3963377774 * a + 0.2158037573 * b;
      const mRoot = outOfGamut.l - 0.1055613458 * a - 0.0638541728 * b;
      const sRoot = outOfGamut.l - 0.0894841775 * a - 1.291485548 * b;
      const long = lRoot ** 3;
      const medium = mRoot ** 3;
      const short = sRoot ** 3;
      return {
        r: 4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
        g: -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
        b: -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
      };
    })();
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const naiveLuminance = 0.2126 * clamp(raw.r) + 0.7152 * clamp(raw.g) + 0.0722 * clamp(raw.b);

    const actual = relativeLuminance(outOfGamut);
    expect(actual).toBeGreaterThanOrEqual(0);
    expect(actual).toBeLessThanOrEqual(1);
    expect(actual).not.toBeCloseTo(naiveLuminance, 3);
  });

  it('для цвета внутри охвата sRGB редукция хромы не меняет яркость', () => {
    const inGamut = { l: 0.93, c: 0.04, h: 80, alpha: 1 };
    // Значение получено независимым расчётом по тем же формулам (см. комментарий выше) —
    // при попадании в охват обе стратегии (отсечение и редукция) дают идентичный результат.
    expect(relativeLuminance(inGamut)).toBeCloseTo(0.8028691785914531, 9);
  });
});

describe('compositeOver — наложение в гамма-кодированном sRGB', () => {
  it('заливка ошибки (0.8 альфы) поверх тёмного фона даёт контраст ≈4.54 к белому символу', () => {
    // Контрольный случай из ролей `dark`: `--color-keycap-error-foreground` = oklch(0.96 0 0)
    // поверх композита `oklch(0.65 0.2 30 / 0.8)` над `oklch(0.14 0 0)`. Значение посчитано
    // вручную по тем же формулам (OKLCH → линейный sRGB → гамма-кодирование → alpha-blend →
    // декодирование → OKLab) и независимо подтверждено экспериментом в браузере (Canvas 2D
    // при наложении этой пары даёт то же ≈4.54 — линейное смешение вместо этого предсказало
    // бы физически другой, но на экране не существующий пиксель с контрастом ≈3.776).
    const overlay = { l: 0.65, c: 0.2, h: 30, alpha: 0.8 };
    const backdrop = { l: 0.14, c: 0, h: 0, alpha: 1 };

    const composite = compositeOver({ overlay, backdrop });
    const foreground = { l: 0.96, c: 0, h: 0, alpha: 1 };

    expect(contrastRatio({ first: foreground, second: composite })).toBeCloseTo(4.54, 1);
  });
});
