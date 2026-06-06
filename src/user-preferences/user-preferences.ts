import type { UserPreferences } from '@/interfaces/user-preferences';
import type { SettingMetadata, SettingOption } from '@/interfaces/types';

const INTERFACE_LANGUAGE_OPTIONS: SettingOption<UserPreferences['interfaceLanguage']>[] = [
  { value: 'en', labelCode: 'options.interfaceLanguages.en' },
  { value: 'ru', labelCode: 'options.interfaceLanguages.ru' },
];

const TEXT_LANGUAGE_OPTIONS: SettingOption<UserPreferences['textLanguage']>[] = [
  { value: 'en', labelCode: 'options.textLanguages.en' },
  { value: 'ru', labelCode: 'options.textLanguages.ru' },
];

const USER_PREFERENCE_METADATA: Array<
  | SettingMetadata<UserPreferences['interfaceLanguage']>
  | SettingMetadata<UserPreferences['textLanguage']>
  | SettingMetadata<UserPreferences['symbolLayoutId']>
> = [
  {
    key: 'interfaceLanguage',
    storageKey: 'userInterfaceLanguage',
    labelCode: 'user_preferences.interface_language_label',
    descriptionCode: 'user_preferences.interface_language_description',
    type: 'enum',
    defaultValue: 'en',
    options: INTERFACE_LANGUAGE_OPTIONS,
    categoryCode: 'user_preferences.category.general',
    componentType: 'select',
  },
  {
    key: 'textLanguage',
    storageKey: 'userTextLanguage',
    labelCode: 'user_preferences.text_language_label',
    descriptionCode: 'user_preferences.text_language_description',
    type: 'enum',
    defaultValue: 'en',
    options: TEXT_LANGUAGE_OPTIONS,
    categoryCode: 'user_preferences.category.general',
    componentType: 'select',
  },
  {
    key: 'symbolLayoutId',
    storageKey: 'userSymbolLayoutId',
    labelCode: 'user_preferences.symbol_layout_label',
    descriptionCode: 'user_preferences.symbol_layout_description',
    type: 'enum',
    defaultValue: 'qwerty',
    // Опции для symbolLayoutId — динамические, рендерятся в UserPreferencesPage напрямую
    // из getCompatibleSymbolLayoutsForTextLanguage(prefs.textLanguage).
    options: [],
    categoryCode: 'user_preferences.category.general',
    componentType: 'select',
  },
];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  shared: {},
};
