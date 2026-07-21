import { readFileSync } from 'node:fs';

/**
 * Разбор темы `src/themes/<id>.css`: тело блока `:root[data-theme="<id>"]`
 * в карту custom properties. Общая часть для contract.test.ts, resolved.test.ts
 * и скрипта отчёта `src/scripts/theme-report.ts`.
 */

/**
 * Убрать CSS-комментарии: их текст может содержать `имя: значение;` (пояснение
 * к роли), и жадное сопоставление проглотило бы соседнюю реальную декларацию.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Тело блока `<selector> { ... }` (без внешних фигурных скобок), учитывая вложенность. */
function selectorBody({
  source,
  selector,
  path,
}: {
  source: string;
  selector: string;
  path: string;
}): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const selectorRe = new RegExp(escaped + '\\s*\\{', 'g');
  const match = selectorRe.exec(source);
  if (!match) throw new Error(`Selector ${selector} { ... } not found in ${path}`);
  const open = match.index + match[0].length - 1;
  let depth = 1;
  let i = open + 1;
  while (depth > 0 && i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  return source.slice(open + 1, i - 1);
}

const DECLARATION = /([a-zA-Z-][\w-]*)\s*:\s*([^;]+);/g;

/** Карта `свойство → значение` (последнее определение побеждает). */
export function parseRootTokens({
  path,
  selector,
}: {
  path: string;
  selector: string;
}): Record<string, string> {
  const body = selectorBody({ source: stripComments(readFileSync(path, 'utf-8')), selector, path });
  const out: Record<string, string> = {};
  for (const match of body.matchAll(DECLARATION)) {
    const [, name, value] = match;
    if (name && value) out[name] = value.trim();
  }
  return out;
}

/** Пары `[имя, значение]` в исходном порядке, с сохранением дублей. */
export function parseRawDeclarations({
  path,
  selector,
}: {
  path: string;
  selector: string;
}): [string, string][] {
  const body = selectorBody({ source: stripComments(readFileSync(path, 'utf-8')), selector, path });
  const out: [string, string][] = [];
  for (const match of body.matchAll(DECLARATION)) {
    const [, name, value] = match;
    if (name && value) out.push([name, value.trim()]);
  }
  return out;
}
