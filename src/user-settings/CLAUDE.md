# src/user-settings — метаданные настроек

Здесь `DEFAULT_USER_SETTINGS` (дефолты). Тип — `src/interfaces/user-settings.ts`; store и `normalizeSettings` — `src/lib/settings.ts` (см. `src/lib/CLAUDE.md`). Полное описание — `docs/04-settings-management-system.md` (⚠️ §4.2 по полям устарел — истину брать из `src/interfaces/user-settings.ts`).

Актуальные поля (из кода): `interfaceLanguage`, `textLanguage`, `symbolLayoutId`, `fingerLayoutId`, `cursorType`, `theme`, `displayName`, `rhythmChannelEnabled`, `sessionDurationSeconds`.

- **Добавить настройку:** (1) поле в `UserSettings` (`src/interfaces/user-settings.ts`) **с JSDoc** → (2) дефолт здесь в `DEFAULT_USER_SETTINGS` → (3) при необходимости per-field правило в `normalizeSettings` (`src/lib/settings.ts`; неизвестные ключи игнорируются = безопасная миграция) → (4) точка ввода в UI по разделению ниже.
- **Все настройки на `/settings` (ADR 0025 — экрана-меню нет):** настройки приложения (`interfaceLanguage`, `theme`, `displayName`) и тренировочные (`textLanguage`, `symbolLayoutId`, `fingerLayoutId`, `cursorType`, `rhythmChannelEnabled`, `sessionDurationSeconds`, 6 полей) — на `/settings`; тренировочные вынесены в секцию «Тренировка» (`TrainingSettingsSection`).
