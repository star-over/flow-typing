import type { UserSettings } from '@/interfaces/user-settings';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  theme: 'auto',
  displayName: '',
  rhythmChannelEnabled: false,
  sessionDurationSeconds: 60,
};
