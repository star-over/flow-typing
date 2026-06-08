import { preferences } from '@/lib/preferences';

/**
 * Каталог тем FlowTyping.
 *
 * Каждая тема — полный colour snapshot (semantic + domain), задаваемый
 * отдельным CSS-файлом `src/themes/<id>.css` с селектором `:root[data-theme="<id>"]`.
 * Primitives темами не покрываются (radius/spacing/typography/motion — единые).
 *
 * `light` и `dark` — обязательные ID каталога: inline-bootstrap-script
 * в `src/app.html` использует их как auto-fallback при `setting === 'auto'`,
 * и contract-тест enforce-ит их наличие. Не удалять.
 *
 * Labels тем НЕ хранятся здесь: UI читает их из словаря через
 * `dictionary.options.themes[id]` (`dictionaries/{en,ru}.json`).
 */
export const THEMES = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark',  colorScheme: 'dark'  },
] as const;

export type ThemeId = typeof THEMES[number]['id'];
export type ColorScheme = 'light' | 'dark';

/**
 * Значение поля `UserPreferences.theme`. Включает sentinel-значение `'auto'`,
 * которое в рантайме резолвится в конкретный `ThemeId` через
 * `prefers-color-scheme` (см. {@link resolveTheme}).
 */
export type ThemeSetting = ThemeId | 'auto';

const THEME_IDS = THEMES.map((t) => t.id);

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v);
}

export function isThemeSetting(v: unknown): v is ThemeSetting {
  return v === 'auto' || isThemeId(v);
}

/**
 * Резолвит `ThemeSetting` в конкретную `ThemeId`, активную прямо сейчас.
 * Для `'auto'` берёт системное предпочтение через `matchMedia`; в окружениях
 * без `matchMedia` (например, тесты) падает на `'light'`.
 */
export function resolveTheme(setting: ThemeSetting): ThemeId {
  if (setting !== 'auto') return setting;
  if (typeof matchMedia !== 'function') return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Меняет выбранную пользователем тему. Stub-реализация Phase 0:
 * пишет значение в preferences-store — DOM-атрибут обновится через
 * `$effect` в `App.svelte`, mirror-key в localStorage — через subscriber
 * в `preferences.ts`. Phase 1 оборачивает вызов в View Transitions API.
 */
export function setTheme(setting: ThemeSetting): void {
  preferences.update((current) => ({ ...current, theme: setting }));
}
