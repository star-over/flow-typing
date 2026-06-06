import type {
  InterfaceLanguage,
  SymbolLayoutId,
  TextLanguage,
} from '@/interfaces/types';

/**
 * Структура пользовательских предпочтений.
 * - `interfaceLanguage` — язык UI (меню, словари).
 * - `textLanguage` — язык упражнений (первичная ось выбора в настройках,
 *   определяет какие drill'ы попадают в тренировку, какие раскладки доступны).
 * - `symbolLayoutId` — выбранная пользователем раскладка (производное от textLanguage).
 */
export interface UserPreferences {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  shared: {
    exerciseId?: string;
  };
}
