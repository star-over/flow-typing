/**
 * Theme contract for Header.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * Header — slim top bar: лого-бренд (Wordmark) слева, меню пользователя
 * (UserMenu) справа. Навигация (Settings / Stats) живёт в выпадающем меню
 * UserMenu. Единственная роль самого бара, которую задаёт тема, — нижняя
 * граница, отделяющая его от контента.
 */
export const HEADER_CONTRACT = [
  '--header-border', // полный border-bottom бара (divider между меню и контентом)
] as const satisfies readonly `--${string}`[];

export type HeaderContractToken = (typeof HEADER_CONTRACT)[number];
