/**
 * Theme contract for Avatar.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая тема
 * (`src/themes/<id>.css`) и `_template.css` декларируют эти токены.
 *
 * Avatar — круглый аватар пользователя: `<img>` при наличии `src`, иначе
 * fallback на инициалы. Токены красят именно fallback-кружок (фон + цвет
 * инициалов) и общий ring вокруг аватара (виден в обоих состояниях).
 */
export const AVATAR_CONTRACT = [
  '--avatar-background',
  '--avatar-color',
  '--avatar-border',
] as const satisfies readonly `--${string}`[];

export type AvatarToken = (typeof AVATAR_CONTRACT)[number];
