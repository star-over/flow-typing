import type { UserPreferences } from '@/interfaces/user-preferences';
import type { SettingMetadata, SettingOption } from '@/interfaces/types';

// Options for language setting
const LANGUAGE_OPTIONS: SettingOption<UserPreferences['language']>[] = [
  { value: 'en', labelCode: 'language.en' },
  { value: 'ru', labelCode: 'language.ru' },
];

// Options for keyboard layout setting
const SYMBOL_LAYOUT_OPTIONS: SettingOption<UserPreferences['symbolLayoutId']>[] = [
  { value: 'qwerty', labelCode: 'symbolLayoutId.qwerty' },
  { value: 'йцукен', labelCode: 'symbolLayoutId.йцукен' },
];

/**
 * Metadata for all user preferences, defining their structure, display, and storage.
 */
const USER_PREFERENCE_METADATA: (| SettingMetadata<UserPreferences['language']>
  | SettingMetadata<UserPreferences['symbolLayoutId']>)[] = [
  {
    key: 'language',
    storageKey: 'userLanguage',
    labelCode: 'user_preferences.language_label',
    descriptionCode: 'user_preferences.language_description', // Assuming a description will be added to i18n
    type: 'enum',
    defaultValue: 'en',
    options: LANGUAGE_OPTIONS,
    categoryCode: 'user_preferences.category.general', // Assuming a category will be added to i18n
    componentType: 'select',
  },
  {
    key: 'symbolLayoutId',
    storageKey: 'userSymbolLayoutId',
    labelCode: 'user_preferences.symbol_layout_label',
    descriptionCode: 'user_preferences.symbol_layout_description', // Assuming a description will be added to i18n
    type: 'enum',
    defaultValue: 'qwerty',
    options: SYMBOL_LAYOUT_OPTIONS,
    categoryCode: 'user_preferences.category.general',
    componentType: 'select',
  },
  // 'shared' property is awaiting user clarification
];

// Helper function to find metadata by key and extract its defaultValue
const getSettingDefaultValue = <K extends keyof UserPreferences>(key: K): UserPreferences[K] => {
  // Cast the found metadata item to the specific SettingMetadata type for the given key.
  // This asserts that if an item is found, its type matches the expected UserPreferences[K].
  const metadataItem = USER_PREFERENCE_METADATA.find((m) => m.key === key) as SettingMetadata<UserPreferences[K]> | undefined;

  if (!metadataItem) {
    throw new Error(`Metadata not found for setting key: ${key}`);
  }
  return metadataItem.defaultValue;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: getSettingDefaultValue('language'),
  symbolLayoutId: getSettingDefaultValue('symbolLayoutId'),
  shared: {}, // 'shared' is not a user preference that needs metadata, it's a state property.
};