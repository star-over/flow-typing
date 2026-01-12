# Архитектура системы настроек (MVP)

## 1. Основные принципы (MVP)

-   **Простота**: Избегаем избыточной сложности и преждевременной оптимизации, предложенной в первоначальном варианте.
-   **Идиоматичность**: Используем существующий стек: **Zustand** для управления состоянием, `localStorage` для хранения и **Next.js** для работы с URL.
-   **Минимализм**: Включаем в MVP только абсолютно необходимые настройки (язык, раскладка) и механизм для передачи состояния через URL.

## 2. Архитектурное решение на базе Zustand

Вместо сложной классовой системы (`SettingsManager`, `SettingsStorage`) мы используем единый **Zustand Store** как единственный источник истины для настроек. Это полностью соответствует текущей архитектуре проекта и упрощает разработку.

### 2.1. Структура файлов

```
src/
├── interfaces/
│   └── settings.ts         # Типы настроек (создан)
├── data/
│   └── default-settings.ts   # Настройки по умолчанию (создан)
└── store/
    └── settings.store.ts     # Zustand store для управления настройками (создан)
```

### 2.2. Типы и значения по умолчанию

**`src/interfaces/settings.ts`**
Определяет только то, что нужно для MVP.

```typescript
export interface Settings {
  language: 'en' | 'ru';
  keyboardLayout: 'qwerty' | 'йцукен';
  shared: {
    exerciseId?: string;
  };
}
```

**`src/data/default-settings.ts`**
Содержит базовые значения.

```typescript
import { Settings } from '@/interfaces/settings';

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  keyboardLayout: 'qwerty',
  shared: {},
};
```

### 2.3. Zustand Store (`settings.store.ts`)

Этот стор выполняет все необходимые функции:
1.  Инициализирует состояние из `localStorage` при помощи `persist` middleware.
2.  Интегрирует сохраненные настройки с дефолтными, чтобы новые версии приложения с новыми настройками работали корректно.
3.  Предоставляет `action` (`updateSettings`) для атомарного обновления настроек.
4.  Автоматически сохраняет все изменения обратно в `localStorage`.

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// ... imports

interface SettingsState extends Settings {
  updateSettings: (newSettings: Partial<Settings>) => void;
  isInitialized: boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      isInitialized: false,
      updateSettings: (newSettings) => {
        set((state) => deepMerge(state, newSettings));
      },
    }),
    {
      name: 'flow-typing-settings',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const merged = deepMerge(currentState, persistedState as Partial<Settings>);
        return { ...merged, isInitialized: true };
      },
    }
  )
);
```

### 2.4. Синхронизация с URL

Для настроек, которые должны отражаться в URL (`shared` в нашем случае), будет использоваться комбинация хуков `useRouter` и `useEffect`.

#### Чтение из URL (при инициализации)
В корневом клиенте приложения (`src/app/app-client.tsx`) необходимо добавить логику для чтения параметров при первой загрузке.

```tsx
// в app-client.tsx
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings.store';
import { useSearchParams } from 'next/navigation';

// ...
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

#### Запись в URL (при изменении)
Для обновления URL при изменении `shared` настроек можно использовать похожий `useEffect`.

```tsx
// в app-client.tsx или специальном хуке
import { useRouter, usePathname } from 'next/navigation';

// ...
const exerciseId = useSettingsStore((state) => state.shared.exerciseId);
const router = useRouter();
const pathname = usePathname();

useEffect(() => {
  // Этот хук будет реагировать на изменения exerciseId в сторе
  const urlParams = new URLSearchParams(window.location.search);
  if (exerciseId) {
    urlParams.set('exerciseId', exerciseId);
  } else {
    urlParams.delete('exerciseId');
  }
  // Обновляем URL без перезагрузки страницы
  router.replace(`${pathname}?${urlParams.toString()}`, { scroll: false });
}, [exerciseId, pathname, router]);

```

## 3. Разграничение доступа

Для MVP эта функциональность **избыточна**, так как приложение полностью клиентское и не имеет ролей. Этот вопрос следует пересмотреть при добавлении серверной части и аутентификации.

## 4. План реализации (упрощенный)

1.  **Создать/обновить файлы типов и дефолтов**: `src/interfaces/settings.ts` и `src/data/default-settings.ts`. (✅ **Выполнено**)
2.  **Добавить утилиту `deepMerge`**: В `src/lib/utils.ts` (✅ **Выполнено**)
3.  **Реализовать `settings.store.ts`**: Создать Zustand store с `persist` middleware. (✅ **Выполнено**)
4.  **Переписать `settings-architecture.md`**: Обновить документацию. (✅ **Выполнено**)
5.  **Интегрировать стор в приложение**:
    -   Использовать `useSettingsStore` в компонентах, где нужен доступ к настройкам.
    -   Реализовать логику чтения/записи URL-параметров в `app-client.tsx` или соответствующем компоненте.
    -   Обновить `AppContext` в `src/interfaces/types.ts`. (➡️ **Следующий шаг**)
6.  **Рефакторинг**: Заменить существующее управление языком/раскладкой (если оно реализовано иначе) на использование нового стора.

Этот подход значительно проще, соответствует текущей архитектуре проекта и решает все поставленные задачи для MVP.
