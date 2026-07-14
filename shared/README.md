# shared/ — модель времени выполнения Auto-Flow

Чистый код модели (без I/O, без `node:fs`, без Vite-зависимостей), который **делят сервер и инструменты**:

- **сервер** (`convex/`) импортирует его в серверные функции (рост репертуара, расчёт `stepLevel` для таблицы отбора);
- **мастерская** (`auto-flow/`) импортирует его при сборке данных.

Поэтому он живёт здесь, а не в `auto-flow/` (офлайн-tooling) и не в `src/` (приложение): чтобы сервер не зависел от инструментов сборки.

```
shared/
├── drill-selection/   чистый равномерный случайный отбор (seeded PRNG +
│                      distinct-offset), storage-слой ADR 0009; делит сервер convex/drill.ts
├── repertoire/        рост репертуара (ADR 0008): config (числа-пороги) ·
│                      readiness (символ «достаточно хорош») · growth (монотонный +1
│                      openedSteps) · progress (снимок для UI) (+ тесты)
├── selection-index/   computeStepLevel: drill → макс. ladderStep его символов
│                      (шаг открытия на символе, ADR 0020) (+ тесты)
└── symbol-layout.ts   чистые помощники раскладки: тип записи, символ→клавиши,
                       ladderStep символа (+ тесты)
```

Термины — [`CONTEXT.md`](../CONTEXT.md): **Лестница** (шагов открытия, `ladderStep`), **Repertoire** (`openedSteps`), **`stepLevel`**. Данные раскладок (источник) — `src/layouts/*.json`.
