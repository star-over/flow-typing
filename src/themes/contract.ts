import { KEY_CAP_CONTRACT } from '@/components/key-cap/KeyCap.contract';
import { FINGER_CONTRACT } from '@/components/hands-scene/Finger.contract';
import { HANDS_SCENE_CONTRACT } from '@/components/hands-scene/HandsScene.contract';
import { MOVEMENT_PATH_CONTRACT } from '@/components/hands-scene/MovementPath.contract';
import { FLOW_LINE_CONTRACT } from '@/components/flow-line/FlowLine.contract';
import { RHYTHM_CHANNEL_CONTRACT } from '@/components/rhythm-channel/RhythmChannel.contract';
import { CURSOR_SYMBOL_CONTRACT } from '@/components/flow-line/CursorSymbol.contract';
import { REGULAR_SYMBOL_CONTRACT } from '@/components/flow-line/RegularSymbol.contract';
import { NAV_ARROW_CONTRACT } from '@/components/key-cap/NavArrow.contract';
import { SELECT_CONTRACT } from '@/components/ui/Select.contract';
import { AVATAR_CONTRACT } from '@/components/ui/Avatar.contract';
import { SESSION_STATS_DISPLAY_CONTRACT } from '@/components/train/SessionStatsDisplay.contract';
import { REPERTOIRE_PROGRESS_CONTRACT } from '@/components/train/RepertoireProgress.contract';
import { SURVEY_PROMPT_CONTRACT } from '@/components/train/SurveyPrompt.contract';
import { SETTINGS_PAGE_CONTRACT } from '@/components/settings/SettingsPage.contract';
import { LANDING_CONTRACT } from '@/components/landing/LandingScreen.contract';
import { FOOTER_ACTIONS_CONTRACT } from '@/components/app/FooterActions.contract';
import { HEADER_CONTRACT } from '@/components/header/Header.contract';
import { MAIN_CONTENT_CONTRACT } from '@/components/app/MainContent.contract';
import { ROOT_CONTRACT } from '@/Root.contract';
import { SIGN_IN_SCREEN_CONTRACT } from '@/components/auth/SignInScreen.contract';
import { USER_MENU_CONTRACT } from '@/components/auth/UserMenu.contract';
import { WORDMARK_CONTRACT } from '@/components/ui/Wordmark.contract';

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
  ...KEY_CAP_CONTRACT,
  ...FINGER_CONTRACT,
  ...HANDS_SCENE_CONTRACT,
  ...MOVEMENT_PATH_CONTRACT,
  ...FLOW_LINE_CONTRACT,
  ...RHYTHM_CHANNEL_CONTRACT,
  ...CURSOR_SYMBOL_CONTRACT,
  ...REGULAR_SYMBOL_CONTRACT,
  ...NAV_ARROW_CONTRACT,
  ...FOOTER_ACTIONS_CONTRACT,
  ...HEADER_CONTRACT,
  ...MAIN_CONTENT_CONTRACT,
  ...SELECT_CONTRACT,
  ...SESSION_STATS_DISPLAY_CONTRACT,
  ...REPERTOIRE_PROGRESS_CONTRACT,
  ...SURVEY_PROMPT_CONTRACT,
  ...SETTINGS_PAGE_CONTRACT,
  ...SIGN_IN_SCREEN_CONTRACT,
  ...USER_MENU_CONTRACT,
  ...AVATAR_CONTRACT,
  ...WORDMARK_CONTRACT,
  ...LANDING_CONTRACT,
] as const satisfies readonly `--${string}`[];

export type ThemeContractToken = (typeof THEME_CONTRACT)[number];
