import type { UserSettings } from '@/interfaces/user-settings';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  cursorMode: 'HALF',
  theme: 'auto',
  displayName: '',
};
