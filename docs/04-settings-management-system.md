# Глава 4: Система управления настройками

Этот документ описывает архитектуру и реализацию системы управления пользовательскими настройками в рамках **MVP** (Minimum Viable Product).

## 4.1. Архитектурные принципы

Система настроек для MVP спроектирована с упором на следующие принципы:

1.  **Простота и идиоматичность:** Вместо внедрения сложных кастомных решений (`SettingsManager`, `SettingsStorage`), архитектура полностью полагается на существующий и хорошо знакомый стек технологий проекта:
    *   **Zustand** для управления состоянием.
    *   **`localStorage`** для персистентности (хранения) на клиенте.
    *   **Next.js Router** для синхронизации части настроек с URL.
2.  **Минимализм:** В MVP реализованы только критически важные настройки (язык, раскладка) и механизм для обмена упражнениями через URL.

## 4.2. Реализация на базе Zustand

Центральным элементом архитектуры является единый **Zustand Store**, который служит единственным источником истины для всех настроек приложения.

### Структура `SettingsState`
Состояние стора включает в себя сами настройки, флаг инициализации и `action` для обновления.

```typescript
// Определено в src/interfaces/user-preferences.ts
export interface Settings {
  language: 'en' | 'ru';
  keyboardLayout: 'qwerty' | 'йцукен';
  // Настройки, предназначенные для обмена через URL
  shared: {
    exerciseId?: string;
  };
}

// Определено в src/store/user-preferences.store.ts
interface SettingsState extends Settings {
  updateSettings: (newSettings: Partial<Settings>) => void;
  isInitialized: boolean; // Флаг, показывающий, что состояние было загружено из localStorage
}
```

### Zustand Store (`user-preferences.store.ts`)

Стор `useSettingsStore` использует `persist` middleware от Zustand для автоматизации сохранения и загрузки данных.

**Ключевые особенности реализации:**

1.  **Инициализация из `localStorage`:** `persist` автоматически загружает сохраненное состояние из `localStorage` при первом рендере приложения.
2.  **Слияние с дефолтами:** При загрузке используется кастомная функция `merge`, которая глубоко объединяет сохраненное состояние с состоянием по умолчанию (`DEFAULT_SETTINGS`). Это гарантирует, что новые поля настроек, добавленные в свежих версиях приложения, будут корректно инициализированы у пользователей со старой версией сохраненных данных.
3.  **Атомарные обновления:** Метод `updateSettings` позволяет безопасно и атомарно обновлять любую часть дерева настроек.
4.  **Автоматическое сохранение:** Любое изменение состояния, вызванное через `updateSettings`, автоматически сохраняется обратно в `localStorage`.

```typescript
// src/store/user-preferences.store.ts

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS, // Начальное состояние по умолчанию
      isInitialized: false,
      updateSettings: (newSettings) => {
        set((state) => deepMerge(state, newSettings)); // Глубокое слияние для обновления
      },
    }),
    {
      name: 'flow-typing-settings', // Ключ в localStorage
      storage: createJSONStorage(() => localStorage),
      // Кастомная логика слияния при гидратации
      merge: (persistedState, currentState) => {
        const merged = deepMerge(currentState, persistedState as Partial<Settings>);
        return { ...merged, isInitialized: true };
      },
    }
  )
);
```

## 4.3. Синхронизация с URL

Часть настроек (поле `shared`) может быть синхронизирована с URL для обмена упражнениями. Этот процесс состоит из двух частей, реализованных в `src/app/app-client.tsx` с использованием хуков React и Next.js.

### Чтение из URL при загрузке
При первой загрузке приложения `useEffect` проверяет наличие `exerciseId` в URL. Если параметр найден и стор уже инициализирован из `localStorage`, он обновляет состояние.

```typescript
// в app-client.tsx
const isInitialized = useSettingsStore((state) => state.isInitialized);
const searchParams = useSearchParams();

useEffect(() => {
  if (isInitialized) {
    const exerciseId = searchParams.get('exerciseId');
    if (exerciseId) {
      useSettingsStore.getState().updateSettings({ shared: { exerciseId } });
    }
  }
}, [isInitialized, searchParams]);
```

### Запись в URL при изменении
Другой `useEffect` отслеживает изменения поля `exerciseId` в сторе Zustand. При его изменении он обновляет URL страницы без перезагрузки, используя `router.replace`.

```typescript
// в app-client.tsx
const exerciseId = useSettingsStore((state) => state.shared.exerciseId);
const router = useRouter();
const pathname = usePathname();

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (exerciseId) {
    urlParams.set('exerciseId', exerciseId);
  } else {
    urlParams.delete('exerciseId');
  }
  router.replace(`${pathname}?${urlParams.toString()}`, { scroll: false });
}, [exerciseId, pathname, router]);
```

Этот подход обеспечивает простую, но надежную систему управления настройками, которая идеально вписывается в существующую архитектуру проекта.
