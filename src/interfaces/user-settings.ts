import type {
  FingerLayoutId,
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
 * - `fingerLayoutId` — схема постановки рук (какой палец нажимает каждую клавишу).
 *   Не зависит от языка/раскладки; дефолт — `asdf` (стандартный home-ряд).
 * - `theme` — визуальная тема: либо конкретный `ThemeId`, либо `'auto'` (следует за системным
 *   `prefers-color-scheme`). Зеркалится отдельным ключом `flow-typing-theme` для FOUC-free bootstrap.
 */
export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  fingerLayoutId: FingerLayoutId;
  theme: ThemeSetting;
}
