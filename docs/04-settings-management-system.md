# Глава 4: Система управления настройками

Этот документ описывает архитектуру и реализацию системы управления пользовательскими настройками в рамках **MVP** (Minimum Viable Product).

## 4.1. Архитектурные принципы

Система настроек для MVP спроектирована с упором на следующие принципы:

1.  **Простота и идиоматичность:** Вместо внедрения сложных кастомных решений (`SettingsManager`, `SettingsStorage`), архитектура полностью полагается на существующий и хорошо знакомый стек технологий проекта:
    *   **Svelte writable store** для управления состоянием.
    *   **`localStorage`** для персистентности (хранения) на клиенте.
    *   **SvelteKit navigation (`$app/navigation`)** для синхронизации части настроек с URL.
2.  **Минимализм:** В MVP реализованы только критически важные настройки (язык, раскладка) и механизм для обмена упражнениями через URL.

## 4.2. Реализация на базе Svelte Store

Центральным элементом архитектуры является единый **Svelte Writable Store**, который служит единственным источником истины для всех настроек приложения.

### Структура `UserPreferences`
Состояние стора включает в себя сами настройки и метаданные для их отображения.

```typescript
// Определено в src/interfaces/user-preferences.ts
export interface UserPreferences {
  language: 'en' | 'ru';
  keyboardLayout: 'qwerty' | 'йцукен';
  // Настройки, предназначенные для обмена через URL
  shared: {
    exerciseId?: string;
  };
}
```

### Svelte Store (`preferences.ts`)

Стор `preferences` использует стандартный `writable` из `svelte/store` с кастомной обёрткой для автоматизации сохранения и загрузки данных.

**Ключевые особенности реализации:**

1.  **Инициализация из `localStorage`:** При создании стора кастомная функция `load()` автоматически загружает сохраненное состояние из `localStorage` (ключ `flow-typing-user-preferences`) с глубоким слиянием поверх `DEFAULT_USER_PREFERENCES`.
2.  **Слияние с дефолтами:** Функция `deepMerge` гарантирует, что новые поля настроек, добавленные в свежих версиях приложения, будут корректно инициализированы у пользователей со старой версией сохраненных данных.
3.  **Атомарные обновления:** Функция `updatePreferences` позволяет безопасно и атомарно обновлять любую часть дерева настроек через `deepMerge`.
4.  **Автоматическое сохранение:** `store.subscribe` автоматически сохраняет любое изменение состояния обратно в `localStorage`.

```typescript
// src/lib/preferences.ts

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { UserPreferences } from '$interfaces/user-preferences';
import { DEFAULT_USER_PREFERENCES } from '$user-preferences/user-preferences';
import { deepMerge } from '$lib/utils';

function createPreferencesStore() {
  const load = (): UserPreferences => {
    if (!browser) return DEFAULT_USER_PREFERENCES;
    try {
      const stored = localStorage.getItem('flow-typing-user-preferences');
      if (stored) return deepMerge(DEFAULT_USER_PREFERENCES, JSON.parse(stored)) as UserPreferences;
    } catch { /* ignore parse errors */ }
    return DEFAULT_USER_PREFERENCES;
  };

  const store = writable<UserPreferences>(load());

  store.subscribe((value) => {
    if (browser) {
      localStorage.setItem('flow-typing-user-preferences', JSON.stringify(value));
    }
  });

  return { subscribe: store.subscribe, update: store.update, set: store.set };
}

export const preferences = createPreferencesStore();
export const keyboardLayout = derived(preferences, ($p) => $p.keyboardLayout);

export function updatePreferences(partial: Partial<UserPreferences>) {
  preferences.update((current) => deepMerge(current, partial));
}
```

### Метаданные настроек

Тип, дефолты и опции для UI-отображения настроек вынесены в `src/user-preferences/user-preferences.ts`:

```typescript
// src/user-preferences/user-preferences.ts

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'en',
  keyboardLayout: 'qwerty',
  shared: {},
};
```

## 4.3. Синхронизация с URL

Часть настроек (поле `shared.exerciseId`) синхронизируется с URL для обмена упражнениями. Этот процесс состоит из двух частей, реализованных в `src/components/app/App.svelte` с использованием Svelte runes (`$effect`) и SvelteKit navigation.

### Планировщик синхронизации

Чистая функция `planExerciseIdSync` (в `src/lib/exercise-id-sync.ts`) определяет направление синхронизации без побочных эффектов:

```typescript
// src/lib/exercise-id-sync.ts

export function planExerciseIdSync(params: {
  urlId: string | null;
  storeId: string | null;
  currentSearch: string;
  hasSyncedFromUrl: boolean;
}): ExerciseIdSyncAction {
  const { urlId, storeId, currentSearch, hasSyncedFromUrl } = params;

  if (urlId === storeId) return { type: 'NOOP' };

  if (!hasSyncedFromUrl) {
    return { type: 'URL_TO_STORE', exerciseId: urlId ?? undefined };
  }

  const newParams = new URLSearchParams(currentSearch);
  if (storeId) {
    newParams.set('exerciseId', storeId);
  } else {
    newParams.delete('exerciseId');
  }

  const newQuery = newParams.toString();
  const currentQuery = currentSearch.replace(/^\?/, '');

  if (newQuery === currentQuery) return { type: 'NOOP' };
  return { type: 'STORE_TO_URL', newSearch: newQuery };
}
```

### Чтение из URL при загрузке

При первой загрузке приложения `$effect` в `App.svelte` проверяет наличие `exerciseId` в URL. Если параметр найден и ещё не было начальной синхронизации, URL побеждает — значение записывается в стор.

```typescript
// в App.svelte

let hasSyncedFromUrl = false;
$effect(() => {
  const action = planExerciseIdSync({
    urlId: page.url.searchParams.get('exerciseId'),
    storeId: $preferences.shared.exerciseId ?? null,
    currentSearch: page.url.search,
    hasSyncedFromUrl,
  });

  switch (action.type) {
    case 'URL_TO_STORE':
      hasSyncedFromUrl = true;
      preferences.update((p) => ({
        ...p,
        shared: { ...p.shared, exerciseId: action.exerciseId },
      }));
      break;
    // ...
  }
});
```

### Запись в URL при изменении

Тот же `$effect` отслеживает изменения поля `exerciseId` в сторе. После начальной синхронизации стор побеждает — при его изменении URL обновляется через `goto(..., { replaceState: true })` без перезагрузки страницы.

```typescript
// в App.svelte (внутри того же $effect)

case 'STORE_TO_URL':
  goto(`?${action.newSearch}`, { replaceState: true, noScroll: true });
  break;
```

Этот подход обеспечивает простую, но надежную систему управления настройками, которая идеально вписывается в существующую архитектуру проекта.
