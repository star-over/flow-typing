/**
 * Вычислитель ролей темы: разрешает грамматику `src/themes/*.css` в конкретные
 * координаты OKLCH. Нужен как гейт цветового равенства при сведении ядра тем —
 * сравниваются координаты, ровно то, что вычисляет браузер из `oklch(from …)`.
 *
 * Грамматика узкая и закрытая; всё, что в неё не попадает, роняет разбор.
 * Молчаливое значение по умолчанию здесь опаснее падения: оно дало бы
 * одинаково неверный результат до и после правки и показало бы ложную зелень.
 */

export type Oklch = { l: number; c: number; h: number; alpha: number };

/** Округление до 6 знаков: снимает шум плавающей точки (0.93 - 0.01 = 0.9199999999999999). */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function normalizeHue(hue: number): number {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** `oklch(L C H)` / `oklch(L C H / A)` — абсолютное значение ядрового токена. */
const ABSOLUTE = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/;
/** `var(--x)` — плоская пересылка. */
const PLAIN_VAR = /^var\(\s*(--[a-z0-9-]+)\s*\)$/;
/** `oklch(from var(--x) ‹c1› ‹c2› ‹c3› [/ ‹a›])` — вывод от базы. */
const RELATIVE = /^oklch\(\s*from\s+var\(\s*(--[a-z0-9-]+)\s*\)\s+(.+?)\s*\)$/;
/** `calc(l - 0.08)` / `calc(c * 2)` / `calc(h + 10)`. */
const CALC = /^calc\(\s*([lch])\s*([+\-*/])\s*([\d.]+)\s*\)$/;

/**
 * Разбить список компонентов по пробелам верхнего уровня: `calc(...)` не режется,
 * `/` перед альфой выделяется отдельной лексемой.
 */
function splitComponents(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  const flush = () => {
    if (current) parts.push(current);
    current = '';
  };
  for (const char of source) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth === 0 && /\s/.test(char)) {
      flush();
      continue;
    }
    if (depth === 0 && char === '/') {
      flush();
      parts.push('/');
      continue;
    }
    current += char;
  }
  flush();
  return parts;
}

function channelOf({ channel, base }: { channel: string; base: Oklch }): number {
  if (channel === 'l') return base.l;
  if (channel === 'c') return base.c;
  if (channel === 'h') return base.h;
  throw new Error(`Unsupported channel: ${channel}`);
}

function componentValue({ token, base }: { token: string; base: Oklch }): number {
  if (token === 'l' || token === 'c' || token === 'h') return channelOf({ channel: token, base });

  const literal = Number(token);
  if (token !== '' && !Number.isNaN(literal)) return literal;

  const calc = CALC.exec(token);
  if (!calc) throw new Error(`Unsupported component: ${token}`);
  const [, channel, operator, operandText] = calc;
  if (!channel || !operator || !operandText) throw new Error(`Malformed calc: ${token}`);
  const left = channelOf({ channel, base });
  const operand = Number(operandText);
  switch (operator) {
    case '+':
      return left + operand;
    case '-':
      return left - operand;
    case '*':
      return left * operand;
    case '/':
      return left / operand;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function resolveValue({
  value,
  lookup,
}: {
  value: string;
  lookup: (name: string) => Oklch;
}): Oklch {
  const plain = PLAIN_VAR.exec(value);
  if (plain) {
    const [, name] = plain;
    if (!name) throw new Error(`Malformed var(): ${value}`);
    return lookup(name);
  }

  const absolute = ABSOLUTE.exec(value);
  if (absolute) {
    const [, lightness, chroma, hue, alpha] = absolute;
    if (!lightness || !chroma || !hue) throw new Error(`Malformed oklch(): ${value}`);
    return {
      l: round(Number(lightness)),
      c: round(Number(chroma)),
      h: round(normalizeHue(Number(hue))),
      alpha: alpha === undefined ? 1 : round(Number(alpha)),
    };
  }

  const relative = RELATIVE.exec(value);
  if (relative) {
    const [, baseName, componentText] = relative;
    if (!baseName || !componentText) throw new Error(`Malformed relative color: ${value}`);
    const base = lookup(baseName);
    const parts = splitComponents(componentText);
    const slash = parts.indexOf('/');
    const channels = slash === -1 ? parts : parts.slice(0, slash);
    const alphaToken = slash === -1 ? undefined : parts[slash + 1];
    const [first, second, third] = channels;
    if (channels.length !== 3 || !first || !second || !third) {
      throw new Error(`Expected three channels in: ${value}`);
    }
    return {
      l: round(componentValue({ token: first, base })),
      c: round(componentValue({ token: second, base })),
      h: round(normalizeHue(componentValue({ token: third, base }))),
      alpha: alphaToken === undefined ? base.alpha : round(Number(alphaToken)),
    };
  }

  throw new Error(`Unsupported value: ${value}`);
}

/**
 * Разрешить все custom properties темы в координаты. Не-custom-properties
 * (`color-scheme`) пропускаются. Циклы и висячие ссылки — исключение.
 */
export function resolveTokens(tokens: Record<string, string>): Record<string, Oklch> {
  const resolved: Record<string, Oklch> = {};
  const inProgress = new Set<string>();

  function resolveName(name: string): Oklch {
    const cached = resolved[name];
    if (cached) return cached;
    if (inProgress.has(name)) throw new Error(`var() cycle at ${name}`);
    const value = tokens[name];
    if (value === undefined) throw new Error(`Undeclared token ${name}`);
    inProgress.add(name);
    const color = resolveValue({ value, lookup: resolveName });
    inProgress.delete(name);
    resolved[name] = color;
    return color;
  }

  for (const name of Object.keys(tokens)) {
    if (!name.startsWith('--')) continue;
    resolveName(name);
  }
  return resolved;
}

export function formatOklch({ l, c, h, alpha }: Oklch): string {
  return alpha === 1 ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${alpha})`;
}

function toLab({ l, c, h }: Oklch): { l: number; a: number; b: number } {
  const radians = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}

/** Евклидово расстояние в OKLab. Альфа не участвует. */
export function deltaE({ first, second }: { first: Oklch; second: Oklch }): number {
  const one = toLab(first);
  const two = toLab(second);
  return Math.hypot(one.l - two.l, one.a - two.a, one.b - two.b);
}

/**
 * OKLCH → линейный sRGB с отсечением в [0, 1]. Отсечение грубее реального
 * gamut mapping браузера, но для оценки контраста этого достаточно: значения
 * тем и так подобраны в охвате.
 */
function toLinearSrgb(color: Oklch): { r: number; g: number; b: number } {
  const { l: lightness, a, b: blue } = toLab(color);

  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * blue;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * blue;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * blue;

  const long = lRoot ** 3;
  const medium = mRoot ** 3;
  const short = sRoot ** 3;

  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    r: clamp(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    g: clamp(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    b: clamp(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short),
  };
}

/** Относительная яркость WCAG. Альфа игнорируется — цвет считается плотным. */
export function relativeLuminance(color: Oklch): number {
  const { r, g, b } = toLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio({ first, second }: { first: Oklch; second: Oklch }): number {
  const one = relativeLuminance(first);
  const two = relativeLuminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}
