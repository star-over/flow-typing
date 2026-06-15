/**
 * @file KeyLadder — порядок открытия клавиш ученику (per Layout Context).
 *
 * Плоский список: у каждой клавиши — ручной номер шага. Клавиши одного шага
 * открываются вместе; шаги нарезаются вручную (геометрия — лишь подсказка).
 *
 * Связка с моделью:
 *   - Repertoire пользователя кодируется числом `openedSteps` (Skill Profile).
 *   - drill получает `stepLevel` = макс. шаг среди его клавиш (таблица отбора).
 *   - drill доступен ⟺ `stepLevel < openedSteps`.
 *
 * Имена `keyCapId`/`symbolLayoutId` — строки (мастерская не импортирует типы из
 * src; корректность значений обеспечивает валидатор против реальной раскладки).
 */

export interface KeyLadderEntry {
  keyCapId: string; // KeyCapId раскладки
  step: number;     // ручной номер шага открытия; 0 = стартовый блок (домашний ряд + пробел)
}

export interface KeyLadder {
  symbolLayoutId: string;  // Layout Context
  version: number;         // версия лестницы (миграция: пересчёт таблицы отбора)
  keys: KeyLadderEntry[];  // все клавиши раскладки; step проставлен вручную
}
