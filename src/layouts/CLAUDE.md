# src/layouts — данные раскладок (JSON)

Здесь только **данные**: `physical-layout-ansi.json`, `symbol-layout-{qwerty,jcuken}.json`, `finger-layout-{asdf,sdfv}.json` + `layouts.test.ts`. Единый язык типов — `src/interfaces/CLAUDE.md`.

- **Только данные, доступ — через геттеры.** Код приложения **не импортирует JSON напрямую** — только через `src/lib/layouts.ts` (`getPhysicalLayout` / `getSymbolLayout` / `getFingerLayout` / `getSymbolLayoutDescriptor` и производные). JSON импортируют лишь тесты. Имя файла = id; поля `id` внутри записей нет.
- **Инварианты** (проверяются zod-схемами в `layouts.ts`, бросают при нарушении): физический/пальцевый — уникальность `keyCapId`; символьный — уникальность `symbol`; символьная запись = `{ symbol, keyCaps }` — клиентская схема **отбрасывает** `ladderStep` (серверная/инструментальная забота, ADR 0020).
- **Добавить раскладку:** (1) JSON сюда → (2) import + запись в нужный Map / `SYMBOL_LAYOUT_META` в `src/lib/layouts.ts` → (3) id в `SYMBOL_LAYOUT_IDS` / `FINGER_LAYOUT_IDS` в `src/interfaces/types.ts` → (4) для символьной — meta (`textLanguage`, `isDefaultForTextLanguages`). `layouts.test.ts` проверяет.
