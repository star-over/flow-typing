/**
 * Theme contract for UserMenu.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * UserMenu — компактный компонент для Header. Три состояния:
 * loading (skeleton), authenticated (name + dropdown с Выйти), guest (link to /signin).
 */
export const USER_MENU_CONTRACT = [
  '--user-menu-loading-color',
  '--user-menu-guest-link-color',
  '--user-menu-guest-link-hover-color',
  '--user-menu-authenticated-name-color',
  '--user-menu-dropdown-background',
  '--user-menu-dropdown-border',
  '--user-menu-dropdown-item-color',
  '--user-menu-dropdown-item-hover-background',
] as const satisfies readonly `--${string}`[];

export type UserMenuToken = (typeof USER_MENU_CONTRACT)[number];
