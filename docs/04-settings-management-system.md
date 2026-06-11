# Глава 4: Система управления настройками

Этот документ описывает архитектуру и реализацию системы управления пользовательскими настройками — единый Svelte writable store с `localStorage`-персистентностью и разделение настроек по двум UI-точкам (приложение vs тренажёр).

## 4.1. Архитектурные принципы

1. **Простота и привычность:** архитектура полностью полагается на стек проекта — **Svelte writable store** для состояния и **`localStorage`** для персистентности. Никаких кастомных `SettingsManager` / `SettingsStorage`.
2. **Единый хранилище, два UI-входа:** все настройки лежат в одном хранилище `settings`. Видимо они разделены на две роли — *настройки приложения* и *настройки тренажёра* — и редактируются на разных экранах:
   - **Приложение** (`/settings` — `SettingsPage.svelte`): `interfaceLanguage`, `theme`. Метаданные UI: «как со мной разговаривает приложение».
   - **Тренажёр** (`MenuScreen` на `/`): `textLanguage`, `symbolLayoutId`. «Что и на чём тренируем» — pre-flight controls перед стартом сессии.
3. **Никаких URL-настроек.** Раньше существовала синхронизация `?exerciseId=` с URL для обмена упражнениями. Эта функция удалена — она противоречит философии адаптивного тренажёра (см. `docs/05`), который сам подбирает drill'ы. Все настройки теперь живут только в `localStorage`.
4. **Минимализм.** В MVP реализованы только критически важные поля: язык интерфейса, язык текста, раскладка, тема. Параметры адаптивности (стратегия выбора, длительность сессии и т.п.) будут добавлены отдельным PR в `/settings` или новый раздел.

## 4.2. Реализация на базе Svelte Store

Центральный элемент — единый **Svelte Writable Store** в `src/lib/settings.ts`, единственный источник истины.

### Структура `UserSettings`

```typescript
// src/interfaces/user-settings.ts
export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;  // язык UI
  textLanguage: TextLanguage;            // язык упражнений
  symbolLayoutId: SymbolLayoutId;        // раскладка ('qwerty' | 'йцукен')
  theme: ThemeSetting;                   // ThemeId | 'auto'
}
```

Дефолты — отдельный файл `src/user-settings/user-settings.ts`:
```typescript
export const DEFAULT_USER_SETTINGS: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  theme: 'auto',
};
```

### Хранилище `settings`

```typescript
// src/lib/settings.ts (упрощённо)

const STORAGE_KEY = 'flow-typing-user-settings';

export const settings = createSettingsStore();

export function updateSettings(partial: Partial<UserSettings>) {
  settings.update((current) => ({ ...current, ...partial }));
}
```

**Ключевые особенности:**

1. **Инициализация из `localStorage`:** `load()` читает `STORAGE_KEY`, парсит JSON и прогоняет через `normalizeSettings`.
2. **Нормализация (`normalizeSettings`):** валидирует каждое поле, восстанавливает невалидные значения по каскаду `interfaceLanguage → textLanguage → symbolLayoutId` (например, при несовместимой паре «текст ru + раскладка qwerty» — раскладка сбрасывается на дефолтную для ru). Неизвестные поля игнорируются. Это безопасный путь миграции: старые пользователи с полями `shared.exerciseId` или другими legacy-ключами в `localStorage` не падают — поля просто отбрасываются.
3. **Атомарные обновления:** `updateSettings({ partial })` через `settings.update((c) => ({ ...c, ...partial }))`, далее `normalizeSettings` под капотом.
4. **Автоматическое сохранение:** `store.subscribe` пишет каждое изменение обратно в `localStorage`.
5. **FOUC-free bootstrap:** значение `theme` зеркалится в отдельный ключ `'flow-typing-theme'`. Inline-script в `src/app.html` читает его до paint и выставляет `data-theme` атрибут на `<html>`. См. `docs/06` §6.5.

## 4.3. UI-точки настроек

### `/settings` — настройки приложения

`SettingsPage.svelte` рендерится на роуте `/settings`. Содержит:
- **Interface Language** — `interfaceLanguage` (en | ru).
- **Theme** — `theme` (light / dark / sepia / nord / auto).

Сюда же в будущем переедут параметры адаптивности, профиль пользователя и т.п.

### Меню (`MenuScreen` на `/`) — настройки тренажёра

`MenuScreen.svelte` рендерится `MainContent`'ом, когда FSM в состоянии `menu`. Содержит:
- **Язык упражнений** — `textLanguage` (en | ru).
- **Раскладка** — `symbolLayoutId` (qwerty | йцукен), производное от `textLanguage`.
- **Start** — запускает тренировку (`appActor.send({ type: 'START_TRAINING', symbolLayoutId })`).

Такое разделение делает «настройки сессии» доступными прямо перед стартом без лишнего хождения по меню.

## 4.4. История

- **MVP-1** (выпилено): структура `UserPreferences` с полем `language` (один язык на UI и упражнения), `?exerciseId=` URL-синхронизация для обмена упражнениями, `deepMerge` поверх дефолтов.
- **MVP-2** (текущее): отдельные `interfaceLanguage`/`textLanguage` (т.к. UI и материал могут быть на разных языках), `normalizeSettings` вместо `deepMerge` (явная валидация по полям с каскадом), удалена URL-синхронизация, переименование `preferences` → `settings` codebase-wide.
