# Visual Contract: HandsSceneViewModel

Этот документ описывает структуру данных (`ViewModel`), которая является "контрактом" между логикой приложения (машинами состояний) и компонентами отображения (`HandsExt.tsx`). Его цель — предоставить UI-компонентам полную, явную и готовую к отрисовке информацию о визуальном состоянии сцены с руками и клавиатурами.

Компоненты, использующие эту модель, должны быть "тупыми" и не должны содержать логики по вычислению состояний. Их единственная задача — отрисовать данные из этой модели.

## 1. Структура данных

Основной моделью является `HandsSceneViewModel`, которая представляет собой словарь состояний для каждого из 12 элементов (10 пальцев + 2 основания ладоней).

```typescript
// Полное визуальное состояние одной клавиши
interface KeySceneState {
  visibility: Visibility;               // VISIBLE, INVISIBLE
  navigationRole: KeyCapNavigationRole; // IDLE, HOME, PATH, TARGET
  pressResult: KeyCapPressResult;       // NEUTRAL, CORRECT, INCORRECT
}

// Описывает полное состояние одного пальца и его "среза" сцены
interface FingerSceneState {
  fingerState: FingerState;             // 'ACTIVE', 'INACTIVE', 'IDLE', 'INCORRECT'
  // Словарь состояний для всех клавиш в кластере этого пальца.
  // Присутствует только если у пальца есть видимые клавиши.
  keyCapStates?: Record<KeyCapId, KeySceneState>; 
}

// Итоговая модель: словарь состояний для всех 12 элементов
type HandsSceneViewModel = Record<FingerId, FingerSceneState>;
```

## 2. Ключевые правила формирования состояния

1.  **Состояния пальцев (`fingerState`):**
    *   `ACTIVE`: Палец, непосредственно выполняющий действие (нажатие целевой или модифицирующей клавиши).
    *   `INACTIVE`: "Соседний" палец на той же руке, где есть `ACTIVE` или `INCORRECT` палец.
    *   `IDLE`: Любой палец на полностью неактивной руке.
    *   `INCORRECT`: Палец, который совершил ошибочное нажатие.

2.  **Видимость клавиш (`keyCapStates`):**
    *   Словарь `keyCapStates` определяется **только для `ACTIVE` пальцев**. 
    *   Для `INACTIVE` и `IDLE` пальцев это свойство отсутствует. UI-компонент не должен рендерить для них клавиатурный кластер. Так как по-умолчанию свойство `visibility` для клавиши установлено в `INVISIBLE` то отсутствие свойств означает отсутствие видимости клавишь для пальца.
    *   `keyCapStates` для активного пальца содержит **все клавиши из его кластера** (согласно `finger-layout-asdf.ts`).
    *   У всех клавиш, перечисленных в `keyCapStates`, свойство `visibility` должно быть установлено в `"VISIBLE"`.

## 3. Примеры состояний

### Пример 1: Простое нажатие (клавиша 'k')

*   **Задача:** Нажать 'k'.
*   **Анализ:** Задействован палец `R3` (средний правой руки). Он уже находится на своей домашней клавише. Правая рука активна, левая — нет.

```json
{
  "L1": { "fingerState": "IDLE" }, 
  "L2": { "fingerState": "IDLE" }, 
  "L3": { "fingerState": "IDLE" }, 
  "L4": { "fingerState": "IDLE" }, 
  "L5": { "fingerState": "IDLE" }, 
  "LB": { "fingerState": "IDLE" },
  
  "R1": { "fingerState": "INACTIVE" }, 
  "R2": { "fingerState": "INACTIVE" },
  "R3": {
    "fingerState": "ACTIVE",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET", "pressResult": "NEUTRAL" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" }
    }
  },
  "R4": { "fingerState": "INACTIVE" }, 
  "R5": { "fingerState": "INACTIVE" }, 
  "RB": { "fingerState": "INACTIVE" }
}
```

### Пример 2: Нажатие с движением (клавиша '2')

*   **Задача:** Нажать '2'.
*   **Анализ:** Задействован палец `L4` (безымянный левой руки). Его домашняя клавиша — `KeyS`. Требуется движение. Левая рука активна, правая — нет.

```json
{
  "L1": { "fingerState": "INACTIVE" }, 
  "L2": { "fingerState": "INACTIVE" }, 
  "L3": { "fingerState": "INACTIVE" },
  "L4": {
    "fingerState": "ACTIVE",
    "keyCapStates": {
      "Digit2": { "visibility": "VISIBLE", "navigationRole": "TARGET", "pressResult": "NEUTRAL" },
      "KeyW":   { "visibility": "VISIBLE", "navigationRole": "PATH",   "pressResult": "NEUTRAL" },
      "KeyS":   { "visibility": "VISIBLE", "navigationRole": "HOME",   "pressResult": "NEUTRAL" },
      "KeyX":   { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" }
    }
  },
  "L5": { "fingerState": "INACTIVE" }, 
  "LB": { "fingerState": "INACTIVE" },
  "R1": { "fingerState": "IDLE" }, 
  "R2": { "fingerState": "IDLE" }, 
  "R3": { "fingerState": "IDLE" }, 
  "R4": { "fingerState": "IDLE" }, 
  "R5": { "fingerState": "IDLE" }, 
  "RB": { "fingerState": "IDLE" }
}
```

### Пример 3: Двуручное нажатие (клавиша 'F')

*   **Задача:** Нажать 'F' (Shift + f).
*   **Анализ:** Задействован палец `L2` (левый указательный) для `KeyF` и `R5` (правый мизинец) для `ShiftRight`. Обе руки активны.

```json
{
  "L1": { "fingerState": "INACTIVE" },
  "L2": {
    "fingerState": "ACTIVE",
    "keyCapStates": {
      "KeyF":     { "visibility": "VISIBLE", "navigationRole": "TARGET", "pressResult": "NEUTRAL" },
      "Digit4":   { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "Digit5":   { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "KeyR":     { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "KeyT":     { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "KeyG":     { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "KeyV":     { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "KeyB":     { "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" }
    }
  },
  "L3": { "fingerState": "INACTIVE" }, 
  "L4": { "fingerState": "INACTIVE" }, 
  "L5": { "fingerState": "INACTIVE" }, 
  "LB": { "fingerState": "INACTIVE" },
  
  "R1": { "fingerState": "INACTIVE" }, 
  "R2": { "fingerState": "INACTIVE" }, 
  "R3": { "fingerState": "INACTIVE" }, 
  "R4": { "fingerState": "INACTIVE" },
  "R5": {
    "fingerState": "ACTIVE",
    "keyCapStates": {
      "Semicolon":  { "visibility": "VISIBLE", "navigationRole": "HOME",   "pressResult": "NEUTRAL" },
      "Quote":      { "visibility": "VISIBLE", "navigationRole": "PATH",   "pressResult": "NEUTRAL" },
      "ShiftRight": { "visibility": "VISIBLE", "navigationRole": "TARGET", "pressResult": "NEUTRAL" },
      "Digit0":     { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "Minus":      { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "Equal":      { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "Backspace":  { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "KeyP":       { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "BracketLeft":{ "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "BracketRight":{ "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "Backslash":  { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "Enter":      { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "Slash":      { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "ControlRight":{ "visibility": "VISIBLE", "navigationRole": "IDLE", "pressResult": "NEUTRAL" },
      "MetaRight":  { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "AltRight":   { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "Fn":         { "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" },
      "ContextMenu":{ "visibility": "VISIBLE", "navigationRole": "IDLE",   "pressResult": "NEUTRAL" }
    }
  },
  "RB": { "fingerState": "INACTIVE" }
}
```
