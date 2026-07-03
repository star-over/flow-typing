import type {
  FingerLayoutId,
  FlowLineCursorType,
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
 * - `cursorType` — форма курсора в FlowLine (RECTANGLE / UNDERSCORE / VERTICAL);
 *   дефолт — `RECTANGLE`.
 * - `theme` — визуальная тема: либо конкретный `ThemeId`, либо `'auto'` (следует за системным
 *   `prefers-color-scheme`). Отражается отдельным ключом `flow-typing-theme` для FOUC-free bootstrap.
 * - `displayName` — имя, показываемое рядом с аватаром. Редактируемый слой поверх
 *   `users.name` (которое остаётся нетронутым оригиналом от провайдера). Пустая
 *   строка = использовать имя провайдера; «сброс к оригиналу» = очистить поле.
 * - `rhythmChannelEnabled` — показывать ли «канал ритма» (визуальный ритм-гид) во
 *   время тренировки; дефолт — `false` (сцена по умолчанию тихая, гид — opt-in).
 */
export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  fingerLayoutId: FingerLayoutId;
  cursorType: FlowLineCursorType;
  theme: ThemeSetting;
  displayName: string;
  rhythmChannelEnabled: boolean;
}
