import type { UserSettings } from '@/interfaces/user-settings';
import { DEFAULT_USER_SETTINGS } from '@/user-settings/user-settings';

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
  theme: string;
  // Optional на чтение: строки, записанные до появления поля, его не имеют.
  displayName?: string;
  rhythmChannelEnabled?: boolean;
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
    theme: cloud.theme,
    displayName: cloud.displayName ?? '',
    rhythmChannelEnabled: cloud.rhythmChannelEnabled,
    // Cloud-ряды, созданные до добавления поля, не содержат его; заполняем дефолтом.
    sessionDurationSeconds: DEFAULT_USER_SETTINGS.sessionDurationSeconds,
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
  theme: string;
  displayName: string;
  rhythmChannelEnabled: boolean;
} {
  return {
    interfaceLanguage: settings.interfaceLanguage,
    textLanguage: settings.textLanguage,
    symbolLayoutId: settings.symbolLayoutId,
    fingerLayoutId: settings.fingerLayoutId,
    cursorType: settings.cursorType,
    theme: settings.theme,
    displayName: settings.displayName,
    rhythmChannelEnabled: settings.rhythmChannelEnabled,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Координатор cloud-sync — чистый reducer.
//
// Раньше координация эха и гонок жила в четырёх булевых замыканиях внутри
// `attachCloudSync` (settings.ts) и не имела чистого дома: баг комбинации флагов
// проявлялся только в работающей системе. Здесь те же решения подняты за шов с
// ЯВНЫМ состоянием — вход события (login / локальная-правка / приход-cloud),
// выход эффекты (pull / push / set / cancel). `attachCloudSync` стал тонким
// effect-runner'ом поверх этого reducer'а. Async-сериализация push (`pushChain`)
// и реальный I/O остаются в runner'е — это побочный эффект, не решение.
// ─────────────────────────────────────────────────────────────────────────────

export type SyncAuthStatus = 'guest' | 'loading' | 'authenticated';

/**
 * Явное состояние координатора — то, что было четырьмя булевыми замыканиями.
 * Поля переведены 1:1, чтобы рефакторинг оставался поведение-сохраняющим.
 */
export interface SyncCoordinatorState {
  /** Последний известный auth-статус. Проверка отправки сверяется с ним, а не с живым геттером authStore. */
  authStatus: SyncAuthStatus;
  /** One-shot login-sync per auth-session (ранее `hasSyncedThisSession`). */
  loginSyncDone: boolean;
  /** Подавить следующий emit, вызванный нашим же `settings.set` после pull (ранее `skipNextSubscribeCallback`). */
  skipNextEcho: boolean;
  /** writable стреляет на подписке — проглотить самый первый emit (ранее `isInitialSubscribe`). */
  awaitingInitialEmit: boolean;
}

export type SyncEvent =
  | { type: 'AUTH_CHANGED'; status: SyncAuthStatus }
  | { type: 'SETTINGS_EMITTED'; value: UserSettings }
  | { type: 'PULL_RESOLVED'; cloudRow: CloudSettings | null; localSettings: UserSettings }
  | { type: 'PULL_FAILED' };

export type SyncEffect =
  | { type: 'PULL' }
  | { type: 'PUSH'; args: ReturnType<typeof settingsToCloudArgs> }
  | { type: 'SET_LOCAL'; settings: UserSettings }
  | { type: 'CANCEL_PUSH_CHAIN' };

export const initialSyncCoordinatorState: SyncCoordinatorState = {
  authStatus: 'loading',
  loginSyncDone: false,
  skipNextEcho: false,
  awaitingInitialEmit: true,
};

/**
 * Чистый шаг координатора: (состояние, событие) → (новое состояние, эффекты).
 *
 * Решётка решений (порядок проверок в `SETTINGS_EMITTED` значим — повторяет
 * прежний subscribe-callback: init → echo → проверка auth → push):
 * - **AUTH_CHANGED guest** — сброс one-shot + `CANCEL_PUSH_CHAIN` (не дать pending
 *   push уйти под expired token). `skipNextEcho` не трогаем (re-login выставит заново).
 * - **AUTH_CHANGED loading** — no-op; `loginSyncDone` НЕ сбрасываем (защита от
 *   token-refresh flicker, чтобы pending local edit не перетёрся повторным pull).
 * - **AUTH_CHANGED authenticated** — если `loginSyncDone`, skip; иначе выставить флаг
 *   сразу (защита от effect re-runs) и выдать эффект `PULL`.
 * - **PULL_RESOLVED** — зовёт `decideSyncOnLogin`: cloud есть → `SET_LOCAL` + взвести
 *   `skipNextEcho`; cloud пуст → `PUSH` (first sync).
 * - **PULL_FAILED** — сброс `loginSyncDone` → следующий tick/mount повторит pull.
 */
export function coordinateSync({
  state,
  event,
}: {
  state: SyncCoordinatorState;
  event: SyncEvent;
}): { state: SyncCoordinatorState; effects: SyncEffect[] } {
  switch (event.type) {
    case 'AUTH_CHANGED': {
      const authStatus = event.status;
      if (authStatus === 'guest') {
        return {
          state: { ...state, authStatus, loginSyncDone: false },
          effects: [{ type: 'CANCEL_PUSH_CHAIN' }],
        };
      }
      if (authStatus === 'loading') {
        return { state: { ...state, authStatus }, effects: [] };
      }
      if (state.loginSyncDone) {
        return { state: { ...state, authStatus }, effects: [] };
      }
      return {
        state: { ...state, authStatus, loginSyncDone: true },
        effects: [{ type: 'PULL' }],
      };
    }

    case 'PULL_RESOLVED': {
      const decision = decideSyncOnLogin({
        cloudRow: event.cloudRow,
        localSettings: event.localSettings,
      });
      if (decision.action === 'pull') {
        return {
          state: { ...state, skipNextEcho: true },
          effects: [{ type: 'SET_LOCAL', settings: decision.settings }],
        };
      }
      return {
        state,
        effects: [{ type: 'PUSH', args: settingsToCloudArgs(decision.settings) }],
      };
    }

    case 'PULL_FAILED': {
      return { state: { ...state, loginSyncDone: false }, effects: [] };
    }

    case 'SETTINGS_EMITTED': {
      if (state.awaitingInitialEmit) {
        return { state: { ...state, awaitingInitialEmit: false }, effects: [] };
      }
      if (state.skipNextEcho) {
        return { state: { ...state, skipNextEcho: false }, effects: [] };
      }
      if (state.authStatus !== 'authenticated') {
        return { state, effects: [] };
      }
      return { state, effects: [{ type: 'PUSH', args: settingsToCloudArgs(event.value) }] };
    }
  }
}
