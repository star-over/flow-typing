# Visual Contract: HandsSceneViewModel

Этот документ описывает структуру данных (`ViewModel`), которая является "контрактом" между логикой приложения (машинами состояний) и компонентами отображения (`HandsExt.tsx`). Его цель — предоставить UI-компонентам полную, явную и готовую к отрисовке информацию о визуальном состоянии сцены с руками и клавиатурами.

Компоненты, использующие эту модель, должны быть "тупыми" и не должны содержать логики по вычислению состояний. Их единственная задача — отрисовать данные из этой модели.

## 1. Структура данных

Основной моделью является `HandsSceneViewModel`, которая представляет собой словарь состояний для каждого из 12 элементов (10 пальцев + 2 основания ладоней).

```typescript
// Полное визуальное состояние одной клавиши
interface KeySceneState {
  visibility: Visibility;                 // VISIBLE, INVISIBLE
  navigationRole: KeyCapNavigationRole;   // NONE, PATH, TARGET
  navigationArrow: KeyCapNavigationArrow; // NONE, UP, DOWN, LEFT, RIGHT...
  pressResult: KeyCapPressResult;         // NEUTRAL, CORRECT, ERROR
}

// Описывает полное состояние одного пальца и его "среза" сцены
interface FingerSceneState {
  fingerState: FingerState;             // 'TARGET', 'INACTIVE', 'NONE', 'ERROR'
  // Словарь состояний для всех клавиш в кластере этого пальца.
  // Присутствует только если у пальца есть видимые клавиши.
  keyCapStates?: Record<KeyCapId, KeySceneState>; 
}

// Итоговая модель: словарь состояний для всех 12 элементов
type HandsSceneViewModel = Record<FingerId, FingerSceneState>;
```

## 2. Ключевые правила формирования состояния

### 2.1 Правило "Активной Руки" (Active Hand Rule)

В любой момент времени, когда пользователь должен нажать клавишу, активной считается только одна рука (та, к которой принадлежит палец, совершающий действие). Все пальцы на другой, "неактивной" руке, должны иметь `fingerState: "INACTIVE"`.

*   **Цель:** Уменьшение визуального шума и концентрация внимания пользователя на той руке, которая должна совершить действие.
*   **Реализация:** При создании ViewModel используйте заготовленные partial-объекты `leftInactive` или `rightInactive` для быстрого перевода всех пальцев одной руки в состояние `INACTIVE`, как это сделано в `hands-ext.stories.tsx`.

    ```typescript
    const myViewModel: HandsSceneViewModel = {
      ...idleViewModel,
      ...leftInactive, // Левая рука неактивна
      R3: { fingerState: "TARGET", ... } // Правый палец активен
    };
    ```

### 2.2 Правило "Полного Кластера" (Complete Cluster Rule)

Для **каждого** пальца, находящегося в состоянии `fingerState: "TARGET"`, в его свойстве `keyCapStates` должен быть определен **полный набор** клавиш, за которые этот палец отвечает согласно `finger-layout-asdf.ts`.

*   **Цель:** Это необходимо, чтобы компонент `HandsExt` мог корректно отображать весь "рабочий" контекст пальца, включая клавиши `PATH` (путь движения) и `NONE` (контекстные, но неактивные клавиши).
*   **Реализация:** Даже если большинство клавиш будут иметь `navigationRole: "NONE"`, их присутствие в `keyCapStates` обязательно для построения целостной визуальной картины.

---
1.  **Состояния пальцев (`fingerState`):**
    *   `TARGET`: Палец, непосредственно выполняющий действие (нажатие целевой или модифицирующей клавиши).
    *   `INACTIVE`: "Соседний" палец на той же руке, где есть `TARGET` или `ERROR` палец.
    *   `NONE`: Любой палец на полностью неактивной руке.
    *   `ERROR`: Палец, который совершил ошибочное нажатие *не своей* клавиши (перепутал пальцы).

2.  **Видимость клавиш (`keyCapStates`):**
    *   Словарь `keyCapStates` определяется **только для `TARGET` пальцев**. 
    *   Для `INACTIVE`, `NONE` и `ERROR` пальцев это свойство отсутствует. UI-компонент не должен рендерить для них клавиатурный кластер.
    *   `keyCapStates` для активного пальца содержит **все клавиши из его кластера** (согласно `finger-layout-asdf.ts`).
    *   У всех клавиш, перечисленных в `keyCapStates`, свойство `visibility` должно быть установлено в `"VISIBLE"`.

3.  **Навигационные подсказки (`navigationRole` и `navigationArrow`)**

    Эти два свойства работают в паре для визуализации пути движения пальца.

    *   `navigationRole`: Определяет семантическую роль клавиши в текущем движении.
        *   `TARGET`: Целевая клавиша, которую нужно нажать.
        *   `PATH`: Клавиша, лежащая на траектории движения пальца от его домашней позиции до `TARGET`.
        *   `NONE`: Клавиша не участвует в текущем навигационном движении.

    *   `navigationArrow`: Визуализирует направление движения к `TARGET` клавише.
        *   Это свойство имеет значение **только для клавиш с `navigationRole: "PATH"`**. Оно показывает, в какую сторону от данной клавиши находится следующая клавиша на пути к цели. Возможные значения: `UP`, `DOWN`, `LEFT`, `RIGHT` и их комбинации.
        *   Для клавиш с `navigationRole: "TARGET"` или `navigationRole: "NONE"`, свойство `navigationArrow` всегда должно быть установлено в `NONE`.

4.  **Обработка ошибок**
    * **Ошибка в пределах одного пальца:** (Цель `'k'`, нажата `'i'`).
        * Палец, который должен был действовать (`R3`), остается в состоянии `TARGET`, так как цель все еще актуальна.
        * Нажатая по ошибке клавиша (`KeyI`) в своем кластере получает `pressResult: 'ERROR'`.
        * Целевая клавиша (`KeyK`) сохраняет `navigationRole: 'TARGET'`.
    * **Ошибка другого пальца (та же рука):** (Цель `'k'`, нажата `'j'`).
        * Палец, который должен был действовать (`R3`), остается в состоянии `TARGET`, чтобы продолжать подсвечивать цель.
        * Палец, который нажал не свою клавишу (`R2`), переходит в состояние `ERROR`.
        * Кластер клавиш для ошибочного пальца (`R2`) **не отображается**. Подсвечивается только сам палец.
        * Отображается только кластер для `TARGET` пальца (`R3`).
    * **Ошибка другой рукой:** (Цель `'k'`, нажата `'f'`).
        * Палец, который должен был действовать (`R3`), остается в состоянии `TARGET`.
        * Палец, который нажал не свою клавишу (`L2`), переходит в `ERROR`.
        * Обе руки считаются "задействованными", поэтому все остальные пальцы на обеих руках переходят в состояние `INACTIVE`.
    * **Ошибка с ненужным модификатором:** (Цель `'k'`, нажато `Shift + K`).
        * Целевой палец (`R3`) нажал правильную клавишу, но сама попытка неверна. Он остается `TARGET`, чтобы показывать цель. В его кластере `KeyK` получает `pressResult: 'ERROR'`.
        * Палец, нажавший ненужный модификатор (`L5` или `R5`), переходит в `ERROR`.
        * Остальные пальцы на задействованных руках переходят в `INACTIVE`.
    * **Ошибка с пропущенным модификатором:** (Цель `K`, нажато `k`).
        * Оба пальца, которые должны были участвовать в аккорде (`L5` и `R3`), переходят в состояние `TARGET`, чтобы показать полную цель.
        * Нажатая клавиша (`KeyK`) получает `pressResult: 'CORRECT'`, так как само действие было верным.
        * Ненажатая клавиша-модификатор (`ShiftLeft`) получает `pressResult: 'ERROR'`, сигнализируя о пропуске.
    * **Ошибка в аккорде (верный модификатор, неверная клавиша):** (Цель `K`, нажато `J`).
        * Пальцы, составляющие цель (`L5` и `R3`), остаются `TARGET`.
        * Палец, нажавший верный модификатор (`L5`), получает `pressResult: 'CORRECT'`.
        * Палец, который должен был нажать основную клавишу (`R3`), не действовал, поэтому `pressResult` для `KeyK` — `NEUTRAL`.
        * Палец, совершивший ошибку (`R2`), переходит в `ERROR`.

## 5. Примеры состояний

### Пример 1: Простое нажатие (клавиша 'k')

*   **Задача:** Нажать 'k'.
*   **Анализ:** Задействован палец `R3` (средний правой руки). Он уже находится на своей домашней клавише. Правая рука активна, левая — нет.

```json
{
  "L1": { "fingerState": "NONE" }, 
  "L2": { "fingerState": "NONE" }, 
  "L3": { "fingerState": "NONE" }, 
  "L4": { "fingerState": "NONE" }, 
  "L5": { "fingerState": "NONE" }, 
  "LB": { "fingerState": "NONE" },
  
  "R1": { "fingerState": "INACTIVE" }, 
  "R2": { "fingerState": "INACTIVE" },
  "R3": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
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
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit2": { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyW":   { "visibility": "VISIBLE", "navigationRole": "PATH",   "navigationArrow": "UP", "pressResult": "NEUTRAL" },
      "KeyS":   { "visibility": "VISIBLE", "navigationRole": "PATH",   "navigationArrow": "UP", "pressResult": "NEUTRAL" },
      "KeyX":   { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "L5": { "fingerState": "INACTIVE" }, 
  "LB": { "fingerState": "INACTIVE" },
  "R1": { "fingerState": "NONE" }, 
  "R2": { "fingerState": "NONE" }, 
  "R3": { "fingerState": "NONE" }, 
  "R4": { "fingerState": "NONE" }, 
  "R5": { "fingerState": "NONE" }, 
  "RB": { "fingerState": "NONE" }
}
```

### Пример 3: Двуручное нажатие (клавиша 'F')

*   **Задача:** Нажать 'F' (Shift + f).
*   **Анализ:** Задействован палец `L2` (левый указательный) для `KeyF` и `R5` (правый мизинец) для `ShiftRight`. Обе руки активны.

```json
{
  "L1": { "fingerState": "INACTIVE" },
  "L2": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "KeyF":     { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Digit4":   { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Digit5":   { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyR":     { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyT":     { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyG":     { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyV":     { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyB":     { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
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
    "fingerState": "TARGET",
    "keyCapStates": {
      "Semicolon":  { "visibility": "VISIBLE", "navigationRole": "PATH",   "navigationArrow": "RIGHT", "pressResult": "NEUTRAL" },
      "Quote":      { "visibility": "VISIBLE", "navigationRole": "PATH",   "navigationArrow": "RIGHT", "pressResult": "NEUTRAL" },
      "ShiftRight": { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Digit0":     { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Minus":      { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Equal":      { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Backspace":  { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyP":       { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "BracketLeft":{ "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "BracketRight":{ "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Backslash":  { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Enter":      { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Slash":      { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "ControlRight":{ "visibility": "VISIBLE", "navigationRole": "NONE",  "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "MetaRight":  { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "AltRight":   { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Fn":         { "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "ContextMenu":{ "visibility": "VISIBLE", "navigationRole": "NONE",   "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "RB": { "fingerState": "INACTIVE" }
}
```

### Пример 4: Ошибка в пределах одного пальца

*   **Задача:** Нажать `'k'`, но нажат `'i'`.
*   **Анализ:** Оба действия выполняет палец `R3`. Целевой палец остается `TARGET`, чтобы подсвечивать цель. Нажатая клавиша `'i'` получает статус ошибки.

```json
{
  "L1": { "fingerState": "NONE" },
  "L2": { "fingerState": "NONE" },
  "L3": { "fingerState": "NONE" },
  "L4": { "fingerState": "NONE" },
  "L5": { "fingerState": "NONE" },
  "LB": { "fingerState": "NONE" },

  "R1": { "fingerState": "INACTIVE" },
  "R2": { "fingerState": "INACTIVE" },
  "R3": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "NONE",      "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "NONE",      "navigationArrow": "NONE", "pressResult": "ERROR" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET",    "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "NONE",      "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "R4": { "fingerState": "INACTIVE" },
  "R5": { "fingerState": "INACTIVE" },
  "RB": { "fingerState": "INACTIVE" }
}
```

### Пример 5: Ошибка другого пальца (та же рука)

*   **Задача:** Нажать `'k'`, но нажат `'j'`.
*   **Анализ:** Целевой палец `R3` остается `TARGET`, чтобы показывать цель. Палец `R2`, совершивший ошибку, переходит в `ERROR`. Кластер клавиш для `R2` не отображается.

```json
{
  "L1": { "fingerState": "NONE" },
  "L2": { "fingerState": "NONE" },
  "L3": { "fingerState": "NONE" },
  "L4": { "fingerState": "NONE" },
  "L5": { "fingerState": "NONE" },
  "LB": { "fingerState": "NONE" },

  "R1": { "fingerState": "INACTIVE" },
  "R2": {
    "fingerState": "ERROR"
  },
  "R3": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "NONE",      "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "NONE",      "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET",    "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "NONE",      "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "R4": { "fingerState": "INACTIVE" },
  "R5": { "fingerState": "INACTIVE" },
  "RB": { "fingerState": "INACTIVE" }
}
```

### Пример 6: Ошибка другой рукой

*   **Задача:** Нажать `'k'`, но нажат `'f'`.
*   **Анализ:** Целевой палец `R3` (правая рука) остается `TARGET`. Палец `L2` (левая рука), совершивший ошибку, переходит в `ERROR`. Так как задействованы обе руки, все остальные пальцы на обеих руках переходят в состояние `INACTIVE`.

```json
{
  "L1": { "fingerState": "INACTIVE" },
  "L2": { "fingerState": "ERROR" },
  "L3": { "fingerState": "INACTIVE" },
  "L4": { "fingerState": "INACTIVE" },
  "L5": { "fingerState": "INACTIVE" },
  "LB": { "fingerState": "INACTIVE" },

  "R1": { "fingerState": "INACTIVE" },
  "R2": { "fingerState": "INACTIVE" },
  "R3": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "R4": { "fingerState": "INACTIVE" },
  "R5": { "fingerState": "INACTIVE" },
  "RB": { "fingerState": "INACTIVE" }
}
```

### Пример 7: Ошибка с ненужным модификатором

*   **Задача:** Нажать `'k'`, но нажат `Shift + K`.
*   **Анализ:** Нажата верная основная клавиша (`KeyK`), но с лишним модификатором. Целевой палец `R3` остается `TARGET`, но сама клавиша `KeyK` получает `pressResult: 'ERROR'`. Палец `L5`, нажавший `ShiftLeft`, отмечается как `ERROR`. Все остальные пальцы на обеих руках становятся `INACTIVE`.

```json
{
  "L1": { "fingerState": "INACTIVE" },
  "L2": { "fingerState": "INACTIVE" },
  "L3": { "fingerState": "INACTIVE" },
  "L4": { "fingerState": "INACTIVE" },
  "L5": { "fingerState": "ERROR" },
  "LB": { "fingerState": "INACTIVE" },

  "R1": { "fingerState": "INACTIVE" },
  "R2": { "fingerState": "INACTIVE" },
  "R3": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "ERROR" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "R4": { "fingerState": "INACTIVE" },
  "R5": { "fingerState": "INACTIVE" },
  "RB": { "fingerState": "INACTIVE" }
}
```
### Пример 8: Ошибка с пропущенным модификатором

*   **Задача:** Нажать `'K'`, но нажат `k`.
*   **Анализ:** Нажата правильная основная клавиша (`KeyK`), но пропущен `Shift`. Оба пальца (`L5` и `R3`) должны быть `TARGET`, чтобы показать полный целевой аккорд. Нажатая `KeyK` получает `pressResult: 'CORRECT'`, так как действие само по себе было верным. Пропущенная `ShiftLeft` получает `pressResult: 'ERROR'`.

```json
{
  "L1": { "fingerState": "INACTIVE" },
  "L2": { "fingerState": "INACTIVE" },
  "L3": { "fingerState": "INACTIVE" },
  "L4": { "fingerState": "INACTIVE" },
  "L5": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "ShiftLeft": { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "ERROR" },
      "Tab": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "CapsLock": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyA": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyZ": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Backquote": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Digit1": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "LB": { "fingerState": "INACTIVE" },

  "R1": { "fingerState": "INACTIVE" },
  "R2": { "fingerState": "INACTIVE" },
  "R3": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "CORRECT" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "R4": { "fingerState": "INACTIVE" },
  "R5": { "fingerState": "INACTIVE" },
  "RB": { "fingerState": "INACTIVE" }
}
```

### Пример 9: Ошибка в аккорде (верный модификатор, неверная клавиша)

*   **Задача:** Нажать `'K'` (Shift + k), но нажат `J` (Shift + j).
*   **Анализ:** Пользователь верно нажал модификатор `ShiftLeft` (`L5`), но ошибся с основной клавишей. Пальцы, составляющие цель (`L5` и `R3`), остаются `TARGET`. Палец, нажавший верный модификатор (`L5`), получает `pressResult: 'CORRECT'`. Ненажатая целевая клавиша (`KeyK`) остается с `pressResult: 'NONE'`. Ошибочный палец `R2` переходит в `ERROR`.

```json
{
  "L1": { "fingerState": "INACTIVE" },
  "L2": { "fingerState": "INACTIVE" },
  "L3": { "fingerState": "INACTIVE" },
  "L4": { "fingerState": "INACTIVE" },
  "L5": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "ShiftLeft": { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "CORRECT" },
      "Tab": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "CapsLock": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyA": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyZ": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Backquote": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Digit1": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "LB": { "fingerState": "INACTIVE" },

  "R1": { "fingerState": "INACTIVE" },
  "R2": { "fingerState": "ERROR" },
  "R3": {
    "fingerState": "TARGET",
    "keyCapStates": {
      "Digit8": { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyI":   { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "KeyK":   { "visibility": "VISIBLE", "navigationRole": "TARGET", "navigationArrow": "NONE", "pressResult": "NEUTRAL" },
      "Comma":  { "visibility": "VISIBLE", "navigationRole": "NONE", "navigationArrow": "NONE", "pressResult": "NEUTRAL" }
    }
  },
  "R4": { "fingerState": "INACTIVE" },
  "R5": { "fingerState": "INACTIVE" },
  "RB": { "fingerState": "INACTIVE" }
}
```
