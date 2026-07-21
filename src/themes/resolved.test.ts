import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';

import { THEMES } from './registry';
import { ROLE_DICTIONARY } from './roles';
import { parseRootTokens } from './parse-theme-css';
import { resolveTokens, formatOklch } from './resolve-color';

/**
 * Гейт цветового равенства при работе с ядром тем.
 *
 * Контракт-тест держит ФОРМУ слоёв, но не значение: перестановка значения из
 * ядра в вывод роли для него неотличима от подмены цвета. Здесь каждая роль
 * каждой темы разрешается в конкретные координаты OKLCH и попадает в снапшот.
 * Переписывание темы обязано оставить снапшот нетронутым; изменение снапшота —
 * это заявленное изменение цвета, и оно должно быть обосновано в коммите.
 *
 * `_template.css` не участвует: там роли заданы как `unset`, цветов нет.
 */
describe('разрешённые цвета ролей', () => {
  it('каждая тема разрешает все роли словаря в координаты OKLCH', () => {
    const report: Record<string, Record<string, string>> = {};

    for (const theme of THEMES) {
      const tokens = parseRootTokens({
        path: resolve(__dirname, `${theme.id}.css`),
        selector: `:root[data-theme="${theme.id}"]`,
      });
      const resolved = resolveTokens(tokens);

      const roles: Record<string, string> = {};
      for (const role of [...ROLE_DICTIONARY].sort()) {
        const color = resolved[role];
        if (!color) throw new Error(`${theme.id}: роль ${role} не разрешилась`);
        roles[role] = formatOklch(color);
      }
      report[theme.id] = roles;
    }

    expect(report).toMatchSnapshot();
  });
});
