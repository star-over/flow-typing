/**
 * Вычислитель ролей темы: разрешает грамматику `src/themes/*.css` в конкретные
 * координаты OKLCH. Нужен как гейт цветового равенства при сведении ядра тем —
 * сравниваются координаты, ровно то, что вычисляет браузер из `oklch(from …)`.
 *
 * Грамматика узкая и закрытая; всё, что в неё не попадает, роняет разбор.
 * Молчаливое значение по умолчанию здесь опаснее падения: оно дало бы
 * одинаково неверный результат до и после правки и показало бы ложную зелень.
 */

export interface Oklch {
  l: number;
  c: number;
  h: number;
  alpha: number;
}

/**
 * Округление до 6 знаков: снимает шум плавающей точки (0.93 - 0.01 = 0.9199999999999999).
 *
 * Намеренно НЕ зажимает светлоту и хрому в диапазон CSS ([0, 1] и c ≥ 0), хотя
 * браузер их зажимает. Причина: при зажатии здесь две разные формулы, обе дающие
 * светлоту ниже нуля, стали бы в снапшоте неотличимы друг от друга — это ложная
 * зелень, а она опаснее ложной красноты. Ни один реальный токен проекта к этой
 * границе не подходит.
 */
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
 * Числовой литерал компонента relative color: только десятичная запись
 * (`0.47`, `250`, ведущая точка `.90`). Явно исключает то, что `Number()`
 * молча принимает — `Infinity`, экспоненту (`1e2`), шестнадцатеричную запись
 * (`0x10`) — иначе они проходят в координату OKLCH необнаруженными.
 */
const DECIMAL_LITERAL = /^\d*\.?\d+$/;

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

function channelOf({ channel, base }: { channel: 'l' | 'c' | 'h'; base: Oklch }): number {
  if (channel === 'l') return base.l;
  if (channel === 'c') return base.c;
  return base.h;
}

/** Регекс `CALC` допускает только один символ из `[lch]`; сузить строку без `as`-приведения. */
function assertChannelName(value: string): asserts value is 'l' | 'c' | 'h' {
  if (value !== 'l' && value !== 'c' && value !== 'h') {
    throw new Error(`Unsupported channel: ${value}`);
  }
}

/** Разобрать числовой литерал; бросает исключение с самим значением, если оно не конечно (например `.` или `0.5.5`). */
function parseFiniteNumber({ text, context }: { text: string; context: string }): number {
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`Malformed number in ${context}: "${text}"`);
  return value;
}

function componentValue({ token, base }: { token: string; base: Oklch }): number {
  if (token === 'l' || token === 'c' || token === 'h') return channelOf({ channel: token, base });

  if (DECIMAL_LITERAL.test(token)) {
    return parseFiniteNumber({ text: token, context: `component: ${token}` });
  }

  const calc = CALC.exec(token);
  if (!calc) throw new Error(`Unsupported component: ${token}`);
  const [, channel, operator, operandText] = calc;
  if (!channel || !operator || !operandText) throw new Error(`Malformed calc: ${token}`);
  assertChannelName(channel);
  const left = channelOf({ channel, base });
  const operand = parseFiniteNumber({ text: operandText, context: `calc(): ${token}` });
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

/**
 * Гейт против ложной зелени: арифметика (`calc(h / 0)`, `calc(l / 0)`, голый
 * `Infinity`) может дать нечисловой или бесконечный результат, который
 * незаметно проходит через `round`/`normalizeHue` и доезжает до сравнения
 * контраста — там `NaN`/`Infinity` в отношении не меньше 4.5 читается как
 * пройдено. Проверяется в конце обеих ветвей разбора значения (абсолютной и
 * выводимой), после того как все четыре координаты вычислены.
 */
function assertFiniteColor({ color, context }: { color: Oklch; context: string }): void {
  if (
    !Number.isFinite(color.l) ||
    !Number.isFinite(color.c) ||
    !Number.isFinite(color.h) ||
    !Number.isFinite(color.alpha)
  ) {
    throw new Error(`Non-finite color in ${context}: ${JSON.stringify(color)}`);
  }
}

/** `oklch(L C H [/ A])` — абсолютное значение ядрового токена. `undefined`, если `value` не в этой форме. */
function resolveAbsoluteValue(value: string): Oklch | undefined {
  const absolute = ABSOLUTE.exec(value);
  if (!absolute) return undefined;

  const [, lightness, chroma, hue, alpha] = absolute;
  if (!lightness || !chroma || !hue) throw new Error(`Malformed oklch(): ${value}`);
  const color: Oklch = {
    l: round(parseFiniteNumber({ text: lightness, context: value })),
    c: round(parseFiniteNumber({ text: chroma, context: value })),
    h: round(normalizeHue(parseFiniteNumber({ text: hue, context: value }))),
    alpha: alpha === undefined ? 1 : round(parseFiniteNumber({ text: alpha, context: value })),
  };
  assertFiniteColor({ color, context: value });
  return color;
}

/** `oklch(from var(--x) ‹c1› ‹c2› ‹c3› [/ ‹a›])` — вывод от базы. `undefined`, если `value` не в этой форме. */
function resolveRelativeValue({
  value,
  lookup,
}: {
  value: string;
  lookup: (name: string) => Oklch;
}): Oklch | undefined {
  const relative = RELATIVE.exec(value);
  if (!relative) return undefined;

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
  if (slash !== -1 && alphaToken === undefined) {
    throw new Error(`Empty alpha slot in: ${value}`);
  }
  // Ничего не должно остаться после токена альфы — ни ещё одного числа
  // (`l c h / 0.5 0.7`), ни второго `/` (`l c h / 0.5 / 0.7`). Иначе хвост
  // молча игнорируется, а альфа получается из первого попавшегося токена.
  if (slash !== -1 && parts.length !== slash + 2) {
    throw new Error(`Unexpected tokens after alpha in: ${value}`);
  }
  const color: Oklch = {
    l: round(componentValue({ token: first, base })),
    c: round(componentValue({ token: second, base })),
    h: round(normalizeHue(componentValue({ token: third, base }))),
    alpha:
      alphaToken === undefined
        ? base.alpha
        : round(parseFiniteNumber({ text: alphaToken, context: value })),
  };
  assertFiniteColor({ color, context: value });
  return color;
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

  const absolute = resolveAbsoluteValue(value);
  if (absolute) return absolute;

  const relative = resolveRelativeValue({ value, lookup });
  if (relative) return relative;

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
  // При нулевой хроме цвет ахроматичен — оттенок не влияет на отрисовку, но разные
  // ядровые токены дают разные значения `h` (0, 20, 250…). Снапшот сравнивает строки,
  // поэтому не канонизировать оттенок означало бы ложную красноту на цвете, который
  // фактически не изменился.
  //
  // Инвариант канонизации: она верна для цвета как отрисовываемого значения, но не
  // как базы вывода. Если появится роль, выводящая хрому от ахроматичной базы
  // (`oklch(from var(--achromatic) l calc(c + 0.05) h)`), смена оттенка базы не
  // отразится в строке этой роли — но пока это всё равно ловится: у производной
  // роли хрома больше нуля, и печатается уже её собственный, не обнулённый оттенок.
  const hue = c === 0 ? 0 : h;
  return alpha === 1 ? `oklch(${l} ${c} ${hue})` : `oklch(${l} ${c} ${hue} / ${alpha})`;
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

const GAMUT_TOLERANCE = 1e-6;
const CHROMA_SEARCH_ITERATIONS = 20;

/** OKLCH → линейный sRGB без ограничения диапазона (может выходить за [0, 1]). */
function rawLinearSrgb(color: Oklch): { r: number; g: number; b: number } {
  const { l: lightness, a, b: blue } = toLab(color);

  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * blue;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * blue;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * blue;

  const long = lRoot ** 3;
  const medium = mRoot ** 3;
  const short = sRoot ** 3;

  return {
    r: 4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    g: -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    b: -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  };
}

function isInGamut({ r, g, b }: { r: number; g: number; b: number }): boolean {
  const withinRange = (value: number) => value >= -GAMUT_TOLERANCE && value <= 1 + GAMUT_TOLERANCE;
  return withinRange(r) && withinRange(g) && withinRange(b);
}

function clampResidual(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * OKLCH → линейный sRGB. 28 токенов проекта лежат вне охвата sRGB (расхождение
 * по яркости против покомпонентного отсечения доходит до 0.025 — около 7% по
 * коэффициенту контраста, чего хватает, чтобы перевернуть решение на границе
 * 4.5:1), так что покомпонентное отсечение здесь недопустимо.
 *
 * Вместо этого — редукция хромы: если прямой перевод даёт канал вне [0, 1],
 * двоичным поиском уменьшаем хрому (светлоту и оттенок не трогаем) до
 * наибольшей, при которой все каналы попадают в охват, и лишь остаточную
 * погрешность плавающей точки зажимаем в [0, 1].
 *
 * Это ближе к тому, что рисует браузер, чем покомпонентное отсечение, но не
 * эквивалент `css-gamut-map` из CSS Color 4: браузер сочетает редукцию хромы
 * с локальным отсечением по порогу различимости 0.02. Остаточное расхождение
 * с нашей редукцией доходит до 0.012 по яркости и до 3% по коэффициенту
 * контраста — ни одно значение проекта сейчас не стоит у этой границы.
 */
function toLinearSrgb(color: Oklch): { r: number; g: number; b: number } {
  const raw = rawLinearSrgb(color);
  if (isInGamut(raw)) {
    return { r: clampResidual(raw.r), g: clampResidual(raw.g), b: clampResidual(raw.b) };
  }

  let lowChroma = 0;
  let highChroma = color.c;
  let bestFit = rawLinearSrgb({ l: color.l, c: lowChroma, h: color.h, alpha: color.alpha });

  for (let iteration = 0; iteration < CHROMA_SEARCH_ITERATIONS; iteration++) {
    const midChroma = (lowChroma + highChroma) / 2;
    const candidate = rawLinearSrgb({ l: color.l, c: midChroma, h: color.h, alpha: color.alpha });
    if (isInGamut(candidate)) {
      lowChroma = midChroma;
      bestFit = candidate;
    } else {
      highChroma = midChroma;
    }
  }

  return { r: clampResidual(bestFit.r), g: clampResidual(bestFit.g), b: clampResidual(bestFit.b) };
}

/**
 * Относительная яркость WCAG. Альфа игнорируется — цвет считается плотным.
 * Поэтому для ролей с альфой меньше единицы (суффикс `-dim`, тона групп клавиш)
 * полученный контраст систематически оптимистичен: реальная роль полупрозрачна
 * и смешивается с фоном под собой. Опираться на это значение как на единственный
 * гейт для таких ролей нельзя — нужно считать контраст после наложения на фон.
 */
export function relativeLuminance(color: Oklch): number {
  const { r, g, b } = toLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio({ first, second }: { first: Oklch; second: Oklch }): number {
  const one = relativeLuminance(first);
  const two = relativeLuminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

/** Обратная матрица OKLab: линейный sRGB → OKLab (используется только внутри `compositeOver`). */
function linearSrgbToOklab({ r, g, b }: { r: number; g: number; b: number }): {
  l: number;
  a: number;
  b: number;
} {
  const lRoot = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mRoot = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const sRoot = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

/** Порог передаточной функции sRGB (IEC 61966-2-1) со стороны линейного значения. */
const SRGB_LINEAR_THRESHOLD = 0.0031308;
/** Тот же порог со стороны гамма-кодированного значения (12.92 * SRGB_LINEAR_THRESHOLD). */
const SRGB_GAMMA_THRESHOLD = 0.04045;

/** Линейный sRGB-канал → гамма-кодированный (то, что реально лежит в пикселе на экране). */
function srgbEncode(value: number): number {
  if (value <= SRGB_LINEAR_THRESHOLD) return value * 12.92;
  return 1.055 * value ** (1 / 2.4) - 0.055;
}

/** Гамма-кодированный sRGB-канал → линейный (обратная передаточная функция). */
function srgbDecode(value: number): number {
  if (value <= SRGB_GAMMA_THRESHOLD) return value / 12.92;
  return ((value + 0.055) / 1.055) ** 2.4;
}

/**
 * Наложить полупрозрачный цвет (`overlay`) на непрозрачную подложку (`backdrop`):
 * результат — плотный цвет (`alpha: 1`), обратно переведённый в OKLCH.
 *
 * Смешение — в гамма-кодированном sRGB, а не в линейном. Это сознательное
 * отступление от физической корректности: линейная интерполяция интенсивности
 * света — то, как смешивался бы реальный полупрозрачный слой краски. Но браузер
 * `background-color` с альфой так не считает — композитинг CSS/Canvas выполняется
 * прямо над гамма-кодированными байтами пикселя, без линеаризации (подтверждено
 * экспериментом: Canvas 2D даёт ≈4.54 там, где линейное смешение предсказывает
 * 3.776). Нас интересует не физически верный свет, а тот пиксель, который увидит
 * пользователь — именно по нему WCAG считает коэффициент контраста. Поэтому:
 * линейный sRGB → гамма-кодировать (`srgbEncode`) → смешать по альфе покомпонентно
 * (подложка считается плотной) → декодировать обратно в линейный (`srgbDecode`) →
 * и только из этого линейного значения выводить светлоту/хрому/оттенок результата.
 *
 * `backdrop.alpha` не участвует — вызывающая сторона обязана передать уже плотный
 * цвет (проверить это в общем виде здесь нельзя: `Oklch` не различает «плотный» и
 * «случайно alpha=1»).
 */
export function compositeOver({ overlay, backdrop }: { overlay: Oklch; backdrop: Oklch }): Oklch {
  const foreground = toLinearSrgb(overlay);
  const background = toLinearSrgb(backdrop);
  const alpha = overlay.alpha;

  const foregroundGamma = {
    r: srgbEncode(foreground.r),
    g: srgbEncode(foreground.g),
    b: srgbEncode(foreground.b),
  };
  const backgroundGamma = {
    r: srgbEncode(background.r),
    g: srgbEncode(background.g),
    b: srgbEncode(background.b),
  };
  const blendedGamma = {
    r: foregroundGamma.r * alpha + backgroundGamma.r * (1 - alpha),
    g: foregroundGamma.g * alpha + backgroundGamma.g * (1 - alpha),
    b: foregroundGamma.b * alpha + backgroundGamma.b * (1 - alpha),
  };
  const blended = {
    r: srgbDecode(blendedGamma.r),
    g: srgbDecode(blendedGamma.g),
    b: srgbDecode(blendedGamma.b),
  };

  const lab = linearSrgbToOklab(blended);
  const chroma = Math.hypot(lab.a, lab.b);
  const hue = chroma === 0 ? 0 : normalizeHue((Math.atan2(lab.b, lab.a) * 180) / Math.PI);
  return { l: round(lab.l), c: round(chroma), h: round(hue), alpha: 1 };
}
