import { KEYCAP_CONTRACT } from '@/components/ui/KeyCap.contract';
import { FINGER_CONTRACT } from '@/components/ui/Finger.contract';
import { HANDS_SCENE_CONTRACT } from '@/components/ui/HandsScene.contract';
import { FLOW_LINE_CONTRACT } from '@/components/ui/FlowLine.contract';
import { CURSOR_SYMBOL_CONTRACT } from '@/components/ui/CursorSymbol.contract';
import { REGULAR_SYMBOL_CONTRACT } from '@/components/ui/RegularSymbol.contract';
import { NAV_ARROW_CONTRACT } from '@/components/ui/NavArrow.contract';
import { TRAINING_SCENE_CONTRACT } from '@/components/ui/TrainingScene.contract';
import { SELECT_CONTRACT } from '@/components/ui/Select.contract';
import { LESSON_STATS_DISPLAY_CONTRACT } from '@/components/ui/LessonStatsDisplay.contract';
import { SETTINGS_PAGE_CONTRACT } from '@/components/ui/SettingsPage.contract';
import { FOOTER_ACTIONS_CONTRACT } from '@/components/app/FooterActions.contract';
import { HEADER_CONTRACT } from '@/components/app/Header.contract';
import { MAIN_CONTENT_CONTRACT } from '@/components/app/MainContent.contract';
import { ROOT_CONTRACT } from '@/Root.contract';

/**
 * Объединённый список CSS-токенов, которые ОБЯЗАНА декларировать каждая тема
 * (`src/themes/<id>.css`) и `_template.css`. Контракт-тест в
 * `src/themes/contract.test.ts` enforce-ит это.
 *
 * Каждая запись — полное имя CSS custom property (с префиксом `--`). Имена
 * описывают визуальную роль элемента компонента (например, `--keycap-l2-border`
 * — полное значение `border` для клавиш левого указательного пальца), а не
 * палитровый цвет. Принцип см. в header-комментариях `<Component>.contract.ts`.
 *
 * Внутренние палитровые переменные темы (например, `--t-success` или
 * `--key-blue`) НЕ входят в контракт — это внутренняя кухня темы.
 */
export const THEME_CONTRACT = [
  ...ROOT_CONTRACT,
  ...KEYCAP_CONTRACT,
  ...FINGER_CONTRACT,
  ...HANDS_SCENE_CONTRACT,
  ...FLOW_LINE_CONTRACT,
  ...CURSOR_SYMBOL_CONTRACT,
  ...REGULAR_SYMBOL_CONTRACT,
  ...NAV_ARROW_CONTRACT,
  ...FOOTER_ACTIONS_CONTRACT,
  ...HEADER_CONTRACT,
  ...MAIN_CONTENT_CONTRACT,
  ...TRAINING_SCENE_CONTRACT,
  ...SELECT_CONTRACT,
  ...LESSON_STATS_DISPLAY_CONTRACT,
  ...SETTINGS_PAGE_CONTRACT,
] as const satisfies readonly `--${string}`[];

export type ThemeContractToken = (typeof THEME_CONTRACT)[number];
