# Known issues

Отложенные проблемы — описаны, но не решаются сейчас. По мере появления контекста (БД, новых требований) — закрываются комплексно.

---

## 1. `defaultDrillTexts` не учитывает выбранную раскладку — ✅ закрыто

**Дата фиксации:** 2026-06-05
**Закрыто:** 2026-06-29 — ровно по предсказанию «при подключении БД»: drill'ы приходят с сервера (рабочая петля auto-flow), совместимость drill ↔ раскладка проверяет конвейер корпуса (ADR 0001), а клиентский fallback вместе со всем клиентским корпусом удалён (ADR 0011). `defaultDrillTexts` в коде больше не существует. Разделы ниже — исторический контекст.

### Симптом

При прогоне `make test` в stderr летит ~26 сообщений вида:

```
stderr | src/machines/app.machine.test.ts > appMachine > START_TRAINING > stores currentSymbolLayoutId = qwerty when started with qwerty
Character "П" not found in symbol layout.
Character "р" not found in symbol layout.
…
```

Источник — `console.warn` в `src/lib/typing-stream.ts`:

```ts
if (!targetKeyCaps) {
  console.warn(`Character "${targetSymbol}" not found in symbol layout.`);
  return null; // Skip characters not in the layout
}
```

### Корень

В `src/lib/typing-stream.ts`:

```ts
export const defaultDrillTexts = [
  // "The Quick Brown Fox Jumps Over The Lazy Dog.",
  // ...
  "Привет, как дела?",
];
```

Единственный fallback-текст — на русском. В `src/machines/app.machine.ts:43-49` он выбирается `Math.random()` независимо от `symbolLayoutId`:

```ts
startNewTrainingStream: assign((_, params: { symbolLayoutId: SymbolLayoutId }) => {
  const symbolLayout = getSymbolLayout(params.symbolLayoutId);
  const randomIndex = Math.floor(Math.random() * defaultDrillTexts.length);
  const drillText = defaultDrillTexts[randomIndex]!;
  return {
    lastTrainingStream: createTypingStream(drillText, symbolLayout),
    …
  };
}),
```

### Последствия

Это **не только тестовая проблема**. В продакшене:

- Если пользователь выбирает `qwerty` → создаётся пустой `TypingStream` (все кириллические символы отфильтрованы).
- В консоли браузера — 13 `console.warn`.
- Тренировка завершается на 0-м шаге (UX-баг).

В тестах это вылезает на:
- `src/lib/typing-stream.test.ts > skips characters not present in the symbol layout` — 1 warn на `€` (by design, проверяется именно скип неизвестного символа).
- `src/machines/app.machine.test.ts > stores currentSymbolLayoutId = qwerty when started with qwerty` — 13 warn'ов.
- `src/machines/app.machine.test.ts > START_TRAINING restarts with a new layout, updates currentSymbolLayoutId` — 13 warn'ов.

### Возможные подходы (черновик, не финал)

- **A.** Заглушить `console.warn` в `createTypingStream`. Скрывает реальный баг — не годится.
- **B.** Сделать `defaultDrillTexts` словарём по `symbolLayoutId`: `{ qwerty: [...en], йцукен: [...ru] }`. В `app.machine` выбирать из правильной ветки.
- **C.** Хранить пары `{ text, symbolLayoutId }` и фильтровать. Симметрично будущей структуре БД — у `DrillSchema` уже есть `unique_chars` / `unique_symbols`, по которым можно определить совместимость с раскладкой.

### Почему откладываем

`defaultDrillTexts` существует только как fallback до подключения БД (см. `docs/audit-2026-06-05.md:54`). Когда drills придут из БД — у каждого будет собственный `symbolLayoutId` (или вычислимый через `unique_chars`), и fallback вообще исчезнет. Чинить fallback сейчас — двойная работа.
