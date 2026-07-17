# src/user-settings — метаданные настроек

Здесь `DEFAULT_USER_SETTINGS` (дефолты). Тип — `src/interfaces/user-settings.ts`; store и `normalizeSettings` — `src/lib/settings.ts` (см. `src/lib/CLAUDE.md`). Полное описание — `docs/04-settings-management-system.md` (⚠️ §4.2 по полям устарел — истину брать из `src/interfaces/user-settings.ts`).

Актуальный набор полей — в типе `UserSettings` (`src/interfaces/user-settings.ts`, с JSDoc).

- **Добавить настройку:** (1) поле в `UserSettings` (`src/interfaces/user-settings.ts`) **с JSDoc** → (2) дефолт здесь в `DEFAULT_USER_SETTINGS` → (3) при необходимости per-field правило в `normalizeSettings` (`src/lib/settings.ts`; неизвестные ключи игнорируются = безопасная миграция) → (4) точка ввода в UI по разделению ниже.
- **Все настройки на `/settings` (ADR 0025 — экрана-меню нет):** делятся на настройки приложения (язык интерфейса, тема, отображаемое имя) и тренировочные (раскладки, тип курсора, ритм-канал, длительность сессии); тренировочные вынесены в секцию «Тренировка» (`TrainingSettingsSection`). Точное разбиение — по потребителям в UI, поля — в типе `UserSettings`.
