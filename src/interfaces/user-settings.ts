import type {
  InterfaceLanguage,
  SymbolLayoutId,
  TextLanguage,
} from '@/interfaces/types';
import type { ThemeSetting } from '@/themes/registry';

/**
 * Структура пользовательских настроек.
 * - `interfaceLanguage` — язык UI (меню, словари).
 * - `textLanguage` — язык упражнений (первичная ось выбора в настройках,
 *   определяет какие drill'ы попадают в тренировку, какие раскладки доступны).
 * - `symbolLayoutId` — выбранная пользователем раскладка (производное от textLanguage).
 * - `theme` — визуальная тема: либо конкретный `ThemeId`, либо `'auto'` (следует за системным
 *   `prefers-color-scheme`). Зеркалится отдельным ключом `flow-typing-theme` для FOUC-free bootstrap.
 */
export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  theme: ThemeSetting;
}
