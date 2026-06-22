import type { UserSettings } from '@/interfaces/user-settings';

/**
 * Shape of userSettings row returned by Convex getMine.
 * Mirror'ит `Doc<'userSettings'>` без runtime-зависимости от convex types
 * (тесты этого модуля бегут в node env без convex code-generation).
 */
export interface CloudSettings {
  interfaceLanguage: string;
  textLanguage: string;
  symbolLayoutId: string;
  // Optional: row'ы, созданные до добавления полей, их не имеют.
  // На входе в store отсутствие догоняется normalizeSettings (→ дефолты).
  fingerLayoutId?: string;
  cursorType?: string;
  cursorMode?: string;
  theme: string;
  // Optional на чтение: строки, записанные до появления поля, его не имеют.
  displayName?: string;
  updatedAt: number;
}

export type SyncOnLoginDecision =
  | { action: 'pull'; settings: UserSettings }
  | { action: 'push'; settings: UserSettings };

/**
 * Pure decision: при transition authStore → 'authenticated', что делать?
 *
 * Стратегия — «cloud wins при login»:
 * - cloud пуст → push локальные настройки (first sync).
 * - cloud есть → pull cloud (это и есть source of truth).
 *
 * НЕ classic LWW с явным сравнением timestamps. Для одного-активного-юзера
 * паттерна cloud == последнее актуальное состояние.
 */
export function decideSyncOnLogin({
  cloudRow,
  localSettings,
}: {
  cloudRow: CloudSettings | null;
  localSettings: UserSettings;
}): SyncOnLoginDecision {
  if (cloudRow === null) {
    return { action: 'push', settings: localSettings };
  }
  return { action: 'pull', settings: cloudRowToSettings(cloudRow) };
}

/**
 * Cloud row → UserSettings shape. Raw type-cast — без runtime нормализации.
 *
 * Любой невалидный value (legacy theme, future-compat значение, dashboard edit)
 * НЕ нормализуется здесь — это утечка abstraction. settings-sync должен быть
 * pure pipeline без зависимости от normalizeSettings (циклической зависимости избегаем).
 *
 * Orchestrator вызывает `settings.set(decision.settings)`; settings.set внутри
 * прогоняет через `normalizeSettings`. То есть pull → settings.set → нормализация
 * отфильтрует невалидные значения «на входе» в store. Push отправляет нормализованный
 * snapshot — cloud получает clean data от текущего клиента.
 */
export function cloudRowToSettings(cloud: CloudSettings): UserSettings {
  return {
    interfaceLanguage: cloud.interfaceLanguage,
    textLanguage: cloud.textLanguage,
    symbolLayoutId: cloud.symbolLayoutId,
    fingerLayoutId: cloud.fingerLayoutId,
    cursorType: cloud.cursorType,
    cursorMode: cloud.cursorMode,
    theme: cloud.theme,
    displayName: cloud.displayName ?? '',
  } as UserSettings;
}

/**
 * UserSettings → upsertMine args. Сейчас identity, но typed boundary —
 * будущее расширение UserSettings (e.g. device-local поле) не утечёт
 * в cloud schema без явной правки этой функции.
 */
export function settingsToCloudArgs(settings: UserSettings): {
  interfaceLanguage: string;
  textLanguage: string;
  symbolLayoutId: string;
  fingerLayoutId: string;
  cursorType: string;
  cursorMode: string;
  theme: string;
  displayName: string;
} {
  return {
    interfaceLanguage: settings.interfaceLanguage,
    textLanguage: settings.textLanguage,
    symbolLayoutId: settings.symbolLayoutId,
    fingerLayoutId: settings.fingerLayoutId,
    cursorType: settings.cursorType,
    cursorMode: settings.cursorMode,
    theme: settings.theme,
    displayName: settings.displayName,
  };
}
