# Система командных сочетаний клавиш — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Централизованная система командных сочетаний клавиш: единый реестр команд (источник истины) → диспетчер keydown + визуальный компонент `KeyHint` на кнопках/меню. Флагман: `Cmd/Ctrl + ,` → `/settings`.

**Architecture:** Один декларативный реестр (`src/lib/commands/registry.ts`) кормит обе подсистемы — рассинхрон «слушаем одно, показываем другое» невозможен структурно. Матчер — собственный, zero-dep, по `KeyboardEvent.code` (физическая позиция клавиши), **не** по `key`: проект мультиязычный (qwerty/йцукен), и `Cmd+,` на русской раскладке даёт `event.key === 'ю'`, тогда как `code === 'Comma'` стабилен. `mod` в аккорде = Cmd на macOS / Ctrl на остальных, матчится по `metaKey || ctrlKey`. Врезка — в существующий `handleKeyDown` в `src/routes/+layout.svelte` **до** `appActor.send`, что заодно закрывает баг «Cmd+K засчитан как опечатка». Палитра Cmd+K в этот объём **не входит** (YAGNI); реестр к ней готов структурно (`binding?` опционален), но поля палитры (`group`/`keywords`/`titleKey`) добавятся вместе с ней, а не заранее.

**Tech Stack:** Svelte 5 (runes), SvelteKit (`goto`/`resolve` из `$app/*`), XState (`appActor`, `inState`), Vitest (node environment, project `src`), Storybook (svelte-csf). Новых зависимостей нет.

**Ветка:** работа ведётся в `feat/command-shortcuts` (стартовая — `master`), создаётся в Task 1 Step 1.

**Источники решений:** handoff-исследование (единый реестр, zero-dep матчер, KeyHint в `ui/`, input-focus guard, мина со шрифтом ⌘, браузер-резервы) + корректировки: матчинг по `code`, не по `key`; обе v1-команды `when: 'always'`; aria через стандартный `aria-keyshortcuts` на триггере + `aria-hidden` на хинте (без новых секций словаря); аудит трёх агентов (2026-07-20): убран `?? ''` после `navigator.*` (падение `--max-warnings 0`), фильтр `event.repeat`, AltGr-политика (`ctrl+alt` — не команда), `$derived` в KeyHint, скрытие хинта на touch-only, ADR по `_template.md`. Второй аудит трёх агентов: `mod` матчится кроссплатформенно (`metaKey || ctrlKey` на любой ОС — осознанный «Mod»-приём; хинт показывает платформенный глиф, теневой алиас задокументирован в ADR), тип `KeyBinding` сужен до обязательного командного модификатора, критерий контраста KeyHint — измеренные ≥4.5:1, `aria-keyshortcuts` с заглавной буквой (`Meta+Shift+K`), Storybook-титул `UI/KeyHint` (мажоритарная конвенция витрины), `macppc` в словарь не нужен (покрыт software-terms).

**Семантика `mod` (зафиксирована двумя аудитами):** аккорд `mod` матчится по `metaKey || ctrlKey` **на любой платформе** — на Mac срабатывает и `Ctrl+,` (теневой алиас, которого нет в хинте). Принимаем как trade-off Mod-конвенции (CodeMirror/Tiptap делают так же); альтернатива — прокидывать `Platform` в матчер — отклонена как усложнение без выигрыша.

**Известные риски (проверить вживую в Task 3):**
- `Cmd+,` в некоторых сборках Chrome может открывать настройки браузера — при конфликте аккорд меняется в одном месте (реестр).
- Глифы `⌘⌥⇧` не входят в `unicode-range` Geist Mono → KeyHint рендерит `--font-sans` (system-ui fallback на Mac корректен).

---

### Task 1: Реестр команд (`src/lib/commands/registry.ts`) — TDD

**Files:**
- Create: `src/lib/commands/registry.ts`
- Test: `src/lib/commands/registry.test.ts`

Чистые данные + типы, без импортов `$app/*` и DOM — файл тестируем в node-окружении. Навигация приходит через `CommandContext.navigate` (обёртку над `goto` поставит `+layout`). Полей будущей палитры (`group`/`keywords`/`titleKey`) намеренно нет: сейчас их никто не читает, добавятся вместе с палитрой (YAGNI, зафиксировано аудитом).

- [ ] **Step 1: Создать ветку**

```bash
git checkout -b feat/command-shortcuts
```

- [ ] **Step 2: Написать падающий тест**

```ts
import { describe, expect, it } from 'vitest';
import { COMMANDS, getCommand, type CommandId } from './registry';

describe('COMMANDS', () => {
  it('содержит OPEN_SETTINGS с аккордом mod+Comma', () => {
    const command = COMMANDS.find((candidate) => candidate.id === 'OPEN_SETTINGS');
    expect(command?.binding).toEqual({ mod: true, code: 'Comma' });
  });
});

describe('getCommand', () => {
  it('возвращает команду по id', () => {
    expect(getCommand('OPEN_SETTINGS').id).toBe('OPEN_SETTINGS');
  });

  it('бросает на неизвестном id — реестр статичен, это программная ошибка', () => {
    // Обоснование `as`: упражняем throw-ветку, недостижимую через типизированные id.
    expect(() => getCommand('UNKNOWN' as CommandId)).toThrow('Unknown command: UNKNOWN');
  });
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npx vitest run src/lib/commands/registry.test.ts`
Expected: FAIL — `./registry` не существует.

- [ ] **Step 4: Создать реестр**

```ts
/**
 * @file Единый реестр команд приложения (ADR 0032): источник истины для
 * диспетчера сочетаний клавиш и визуальных хинтов (KeyHint). Новая команда =
 * одна запись в COMMANDS. Поля будущей палитры (group/keywords/titleKey)
 * осознанно НЕ заводятся до её появления (YAGNI) — добавятся вместе с ней.
 *
 * Матчинг — по `KeyboardEvent.code` (физическая позиция), НЕ по `key`:
 * сочетания обязаны работать независимо от активной символьной раскладки
 * (qwerty/йцукен): Cmd+, на русской раскладке даёт key='ю', но code='Comma'.
 * `mod` = Cmd на macOS / Ctrl на остальных; матчится по metaKey || ctrlKey.
 */
import type { KeyCapId } from '@/interfaces/key-cap-id';

/**
 * Аккорд: физическая клавиша + обязательный командный модификатор (mod или
 * alt), опционально shift. Тип сужен под поведение матчера: binding из одного
 * shift не сматчится никогда (shift — канал печати заглавных), поэтому
 * запрещён типом — иначе KeyHint показывал бы сочетание, которое не слушаем.
 */
export type KeyBinding = {
  readonly code: KeyCapId;
  readonly shift?: boolean;
} & (
  | { readonly mod: true; readonly alt?: boolean }
  | { readonly alt: true; readonly mod?: boolean }
);

export type CommandId = 'OPEN_SETTINGS' | 'OPEN_STATS';

/** Роуты, в которые умеют уводить команды (значения resolve() из $app/paths). */
export type CommandRoute = '/settings' | '/stats';

export interface CommandContext {
  /** appActor в состоянии training — для гейта when: 'not-typing'. */
  readonly isTraining: boolean;
  /** Навигация на роут (в +layout — обёртка над goto(resolve(route))). */
  readonly navigate: (route: CommandRoute) => void;
}

export interface Command {
  readonly id: CommandId;
  /** Нет binding → команда без сочетания и хинта (заготовка под палитру). */
  readonly binding?: KeyBinding;
  /** 'not-typing' глушит команду, пока appActor в training. */
  readonly when: 'always' | 'not-typing';
  readonly run: (context: CommandContext) => void;
}

export const COMMANDS: readonly Command[] = [
  {
    id: 'OPEN_SETTINGS',
    binding: { mod: true, code: 'Comma' },
    when: 'always',
    run: ({ navigate }) => navigate('/settings'),
  },
];

/** Достаёт команду по id; отсутствие — программная ошибка (реестр статичен). */
export function getCommand(id: CommandId): Command {
  const command = COMMANDS.find((candidate) => candidate.id === id);
  if (!command) throw new Error(`Unknown command: ${id}`);
  return command;
}
```

- [ ] **Step 5: Убедиться, что тест зелёный**

Run: `npx vitest run src/lib/commands/registry.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/commands/registry.ts src/lib/commands/registry.test.ts
git commit -m "feat(commands): add command registry as single source of truth"
```

---

### Task 2: Матчер и диспетчер (`src/lib/commands/dispatch.ts`) — TDD

**Files:**
- Create: `src/lib/commands/dispatch.ts`
- Test: `src/lib/commands/dispatch.test.ts`

Матчер принимает структурный срез `CommandKeyEvent` вместо `KeyboardEvent`: тесты проекта `src` идут в **node-окружении**, где `KeyboardEvent`/`HTMLElement` не существуют (паттерн stubGlobal — как в `src/lib/device.test.ts`). По той же причине `isEditableTarget` — duck-typing, не `instanceof`.

- [ ] **Step 1: Написать падающий тест**

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  dispatchCommand,
  isCommandChord,
  isEditableTarget,
  matchCommand,
  type CommandKeyEvent,
} from './dispatch';
import { COMMANDS, type Command } from './registry';

function keyEvent(overrides: Partial<CommandKeyEvent> = {}): CommandKeyEvent {
  return {
    code: 'Comma',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    target: null,
    ...overrides,
  };
}

// Обоснование `as unknown as EventTarget`: duck-typing-стабы вместо DOM-узлов —
// тесты идут в node-окружении без DOM-классов (паттерн device.test.ts).
const inputTarget = { tagName: 'INPUT' } as unknown as EventTarget;

describe('isCommandChord', () => {
  it('true для meta + текстовая клавиша', () => {
    expect(isCommandChord(keyEvent({ metaKey: true }))).toBe(true);
  });

  it('true для ctrl и alt по отдельности', () => {
    expect(isCommandChord(keyEvent({ ctrlKey: true }))).toBe(true);
    expect(isCommandChord(keyEvent({ altKey: true }))).toBe(true);
  });

  it('false без модификаторов', () => {
    expect(isCommandChord(keyEvent())).toBe(false);
  });

  it('false для shift-only — это канал печати (заглавные)', () => {
    expect(isCommandChord(keyEvent({ shiftKey: true }))).toBe(false);
  });

  it('false для ctrl+alt вместе — это AltGr на Windows, канал печати', () => {
    expect(isCommandChord(keyEvent({ ctrlKey: true, altKey: true }))).toBe(false);
  });

  it('false при auto-repeat зажатого аккорда', () => {
    expect(isCommandChord(keyEvent({ metaKey: true, repeat: true }))).toBe(false);
  });

  it('false, когда сама нажатая клавиша — модификатор (keydown MetaLeft)', () => {
    expect(isCommandChord(keyEvent({ code: 'MetaLeft', metaKey: true }))).toBe(false);
    expect(isCommandChord(keyEvent({ code: 'ControlLeft', ctrlKey: true }))).toBe(false);
    expect(isCommandChord(keyEvent({ code: 'AltLeft', altKey: true }))).toBe(false);
  });

  it('false для неизвестного code (F13, media-клавиши)', () => {
    expect(isCommandChord(keyEvent({ code: 'F13', metaKey: true }))).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('false для null', () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it('true для input, textarea и select', () => {
    expect(isEditableTarget(inputTarget)).toBe(true);
    expect(isEditableTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true);
  });

  it('true для contenteditable', () => {
    expect(isEditableTarget({ isContentEditable: true } as unknown as EventTarget)).toBe(true);
  });

  it('false для обычного элемента', () => {
    expect(isEditableTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(false);
  });
});

describe('matchCommand', () => {
  it('Cmd+, (meta) находит OPEN_SETTINGS', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command?.id).toBe('OPEN_SETTINGS');
  });

  it('Ctrl+, находит OPEN_SETTINGS — mod матчится по metaKey || ctrlKey', () => {
    const command = matchCommand({
      event: keyEvent({ ctrlKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command?.id).toBe('OPEN_SETTINGS');
  });

  it('Cmd+Ctrl+, тоже матчится — mod снисходителен к лишнему meta/ctrl', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true, ctrlKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command?.id).toBe('OPEN_SETTINGS');
  });

  it('другой code не матчится', () => {
    const command = matchCommand({
      event: keyEvent({ code: 'Period', metaKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });

  it('лишний модификатор (shift) ломает аккорд', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true, shiftKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });

  it('фокус в поле ввода глушит сочетание', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true, target: inputTarget }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });

  it("when: 'not-typing' глушит команду в training", () => {
    const gated: Command = {
      id: 'OPEN_SETTINGS',
      binding: { mod: true, code: 'KeyP' },
      when: 'not-typing',
      run: () => undefined,
    };
    const event = keyEvent({ code: 'KeyP', metaKey: true });
    expect(matchCommand({ event, commands: [gated], isTraining: true })).toBeUndefined();
    expect(matchCommand({ event, commands: [gated], isTraining: false })?.id).toBe('OPEN_SETTINGS');
  });

  it('команда без binding никогда не матчится (заготовка под палитру)', () => {
    const paletteOnly: Command = {
      id: 'OPEN_SETTINGS',
      when: 'always',
      run: () => undefined,
    };
    const command = matchCommand({
      event: keyEvent({ metaKey: true }),
      commands: [paletteOnly],
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });
});

describe('dispatchCommand', () => {
  it('выполняет команду и возвращает true при совпадении', () => {
    const navigate = vi.fn();
    const handled = dispatchCommand({
      event: keyEvent({ metaKey: true }),
      context: { isTraining: false, navigate },
    });
    expect(handled).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/settings');
  });

  it('возвращает false и ничего не выполняет при промахе', () => {
    const navigate = vi.fn();
    const handled = dispatchCommand({
      event: keyEvent({ code: 'KeyZ', metaKey: true }),
      context: { isTraining: false, navigate },
    });
    expect(handled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/lib/commands/dispatch.test.ts`
Expected: FAIL — `./dispatch` не существует.

- [ ] **Step 3: Написать реализацию**

```ts
/**
 * @file Диспетчер сочетаний клавиш (ADR 0032). Чистые функции поверх
 * структурного среза KeyboardEvent — тестируемо в node-окружении без DOM.
 * Точка встраивания — handleKeyDown в src/routes/+layout.svelte.
 */
import { isKnownKeyCapId, type KeyCapId } from '@/interfaces/key-cap-id';
import { COMMANDS, type Command, type CommandContext, type KeyBinding } from './registry';

/** Структурный срез KeyboardEvent — ровно то, что читает диспетчер. */
export interface CommandKeyEvent {
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly repeat: boolean;
  readonly target: EventTarget | null;
}

const MODIFIER_KEY_CAP_IDS: readonly KeyCapId[] = [
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'ShiftLeft',
  'ShiftRight',
];

/**
 * Аккорд-кандидат в команду: зажат Cmd/Ctrl/Alt и нажата НЕ модификаторная
 * клавиша. Исключения: shift-only — канал печати заглавных; ctrl+alt вместе —
 * AltGr на Windows, тоже печать (ADR 0017); auto-repeat зажатого аккорда
 * гасится, чтобы команда не дёргалась в цикле. Keydown самого модификатора
 * (MetaLeft с metaKey=true) — не аккорд: модификаторы продолжают жить в
 * keyboardMachine, как раньше.
 */
export function isCommandChord(event: CommandKeyEvent): boolean {
  if (event.repeat) return false;
  if (event.ctrlKey && event.altKey) return false;
  if (!event.metaKey && !event.ctrlKey && !event.altKey) return false;
  if (!isKnownKeyCapId(event.code)) return false;
  return !MODIFIER_KEY_CAP_IDS.includes(event.code);
}

/**
 * Фокус в поле ввода — сочетания не перехватываем (displayName и Select в
 * /settings, форма /signin). Duck-typing вместо instanceof: unit-тесты идут
 * в node-окружении без DOM-классов (паттерн stubGlobal из device.test.ts).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object') return false;
  // Обоснование `as`: структурная проверка вместо instanceof HTMLElement —
  // DOM-классов нет в node-окружении тестов.
  const element = target as Partial<HTMLElement>;
  return (
    element.isContentEditable === true ||
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  );
}

function bindingsEqual({
  event,
  binding,
}: {
  event: CommandKeyEvent;
  binding: KeyBinding;
}): boolean {
  return (
    event.code === binding.code &&
    (event.metaKey || event.ctrlKey) === (binding.mod ?? false) &&
    event.altKey === (binding.alt ?? false) &&
    event.shiftKey === (binding.shift ?? false)
  );
}

export function matchCommand({
  event,
  commands,
  isTraining,
}: {
  event: CommandKeyEvent;
  commands: readonly Command[];
  isTraining: boolean;
}): Command | undefined {
  if (!isCommandChord(event)) return undefined;
  if (isEditableTarget(event.target)) return undefined;
  return commands.find((command) => {
    if (command.binding === undefined) return false;
    if (command.when === 'not-typing' && isTraining) return false;
    return bindingsEqual({ event, binding: command.binding });
  });
}

/**
 * Совпадение → выполняет команду и возвращает true (вызывающий гасит
 * браузерный дефолт через preventDefault). Промах → false.
 */
export function dispatchCommand({
  event,
  context,
}: {
  event: CommandKeyEvent;
  context: CommandContext;
}): boolean {
  const command = matchCommand({ event, commands: COMMANDS, isTraining: context.isTraining });
  if (!command) return false;
  command.run(context);
  return true;
}
```

- [ ] **Step 4: Убедиться, что тест зелёный**

Run: `npx vitest run src/lib/commands/dispatch.test.ts`
Expected: PASS, все describe-блоки.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/dispatch.ts src/lib/commands/dispatch.test.ts
git commit -m "feat(commands): add code-based shortcut matcher and dispatcher"
```

---

### Task 3: Врезка диспетчера в `+layout.svelte`

**Files:**
- Modify: `src/routes/+layout.svelte:130-136`

Этот же шаг закрывает существующий баг: раньше `Cmd+K` во время тренировки протекал в `keyboardMachine` и засчитывался как опечатка — фильтра модификаторов в проекте не было. Теперь аккорд с Cmd/Ctrl/Alt — отдельный канал: совпало → команда + `preventDefault`; не совпало → в машину печати всё равно не уходит.

- [ ] **Step 1: Добавить импорты**

В `<script lang="ts">` рядом с остальными импортами (после строки `import { isKnownKeyCapId } from '@/interfaces/key-cap-id';`):

```ts
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { dispatchCommand, isCommandChord } from '@/lib/commands/dispatch';
```

- [ ] **Step 2: Заменить `handleKeyDown`**

Было (строки 130-136):

```ts
  function handleKeyDown(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    if (inState({ snapshot: appState, value: 'training' }) && event.code === 'Space') {
      event.preventDefault();
    }
    appActor.send({ type: 'KEY_DOWN', keyCapId: event.code });
  }
```

Стало:

```ts
  function handleKeyDown(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    // Аккорд с Cmd/Ctrl/Alt — канал команд, а не печать (ADR 0032). При
    // совпадении команда выполняется, браузерный дефолт гасится; при промахе
    // клавиша всё равно НЕ уходит в appActor — иначе Cmd+K во время
    // тренировки засчитывался бы как опечатка.
    if (isCommandChord(event)) {
      const handled = dispatchCommand({
        event,
        context: {
          isTraining: inState({ snapshot: appState, value: 'training' }),
          navigate: (route) => void goto(resolve(route)),
        },
      });
      if (handled) event.preventDefault();
      return;
    }
    if (inState({ snapshot: appState, value: 'training' }) && event.code === 'Space') {
      event.preventDefault();
    }
    appActor.send({ type: 'KEY_DOWN', keyCapId: event.code });
  }
```

- [ ] **Step 3: Проверить типы и линт**

Run: `make check-dev`
Expected: зелёно.

- [ ] **Step 4: Ручная проверка вживую**

Run: `make dev`, открыть http://localhost:5173

Проверить:
1. `/train` → `Cmd+,` (mac) / `Ctrl+,` — открывается `/settings`. Повторить, переключив системную раскладку на русскую, — сочетание работает так же.
2. Зажать `Cmd+,` — страница `/settings` открывается один раз, без цикла навигаций (фильтр `event.repeat`).
3. `/settings` содержит поле displayName: фокус в нём → `Cmd+,` не срабатывает (input-focus guard), обычная печать в поле работает.
4. Во время тренировки: `Cmd+K` (или любой Cmd+буква) НЕ засчитывается опечаткой; обычная печать и заглавные (Shift) работают как раньше.
5. Если `Cmd+,` перехватывается Chrome (открывает настройки браузера) — риск из шапки плана: аккорд меняется одной строкой в `COMMANDS` (например `code: 'Comma'` → `{ mod: true, shift: true, code: 'Comma' }`), остановиться и согласовать.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat(commands): dispatch command chords in layout keydown before typing machine"
```

---

### Task 4: Платформа и форматтеры аккордов (`src/lib/platform.ts`) — TDD

**Files:**
- Create: `src/lib/platform.ts`
- Test: `src/lib/platform.test.ts`

Два канала отображения одного `KeyBinding`: визуальные глифы для `KeyHint` (`['⌘', ',']` / `['Ctrl', ',']`) и строка `aria-keyshortcuts` для триггера (`'Meta+,'` / `'Control+,'` — по WAI-ARIA клавиша задаётся значением `event.key`, пунктуация допустима как non-modifier).

Внимание: **не** писать `navigator.platform ?? ''` — в lib.dom поля non-nullable `string`, `@typescript-eslint/no-unnecessary-condition` даст warning, который уронит `make check-all` (`--max-warnings 0`).

- [ ] **Step 1: Написать падающий тест**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatAriaBinding, formatBinding, getPlatform } from './platform';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPlatform', () => {
  it("mac для 'MacIntel'", () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh)' });
    expect(getPlatform()).toBe('mac');
  });

  it("other для 'Win32'", () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });
    expect(getPlatform()).toBe('other');
  });

  it('other без navigator (глушим node-глобал)', () => {
    vi.stubGlobal('navigator', undefined);
    expect(getPlatform()).toBe('other');
  });
});

describe('formatBinding', () => {
  it('mac: mod → ⌘, глиф клавиши из code', () => {
    expect(formatBinding({ binding: { mod: true, code: 'Comma' }, platform: 'mac' })).toEqual([
      '⌘',
      ',',
    ]);
  });

  it('other: mod → Ctrl', () => {
    expect(formatBinding({ binding: { mod: true, code: 'Comma' }, platform: 'other' })).toEqual([
      'Ctrl',
      ',',
    ]);
  });

  it('mac: порядок модификаторов ⌥ ⇧ ⌘ (HIG), буква из KeyK', () => {
    expect(
      formatBinding({
        binding: { mod: true, shift: true, alt: true, code: 'KeyK' },
        platform: 'mac',
      }),
    ).toEqual(['⌥', '⇧', '⌘', 'K']);
  });

  it('other: порядок Ctrl Alt Shift', () => {
    expect(
      formatBinding({
        binding: { mod: true, alt: true, shift: true, code: 'Digit3' },
        platform: 'other',
      }),
    ).toEqual(['Ctrl', 'Alt', 'Shift', '3']);
  });
});

describe('formatAriaBinding', () => {
  it('undefined binding → undefined (атрибут не рендерится)', () => {
    expect(formatAriaBinding({ binding: undefined, platform: 'mac' })).toBeUndefined();
  });

  it('mac: mod → Meta, клавиша как event.key', () => {
    expect(formatAriaBinding({ binding: { mod: true, code: 'Comma' }, platform: 'mac' })).toBe(
      'Meta+,',
    );
  });

  it('other: mod → Control', () => {
    expect(formatAriaBinding({ binding: { mod: true, code: 'Comma' }, platform: 'other' })).toBe(
      'Control+,',
    );
  });

  it('буквы — заглавные (APG), модификаторы через +', () => {
    expect(
      formatAriaBinding({ binding: { mod: true, shift: true, code: 'KeyK' }, platform: 'mac' }),
    ).toBe('Meta+Shift+K');
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/lib/platform.test.ts`
Expected: FAIL — `./platform` не существует.

- [ ] **Step 3: Написать реализацию**

```ts
/**
 * @file Платформа пользователя + форматтеры KeyBinding для двух каналов
 * отображения: визуальные глифы (KeyHint) и `aria-keyshortcuts` (WAI-ARIA:
 * клавиша — значением event.key, модификаторы через '+').
 * Паттерн stubGlobal-тестов — как src/lib/device.ts / device.test.ts.
 */
import type { KeyCapId } from '@/interfaces/key-cap-id';
import type { KeyBinding } from './commands/registry';

export type Platform = 'mac' | 'other';

/**
 * `navigator.platform` deprecated, но универсален; userAgentData нет в
 * Firefox/Safari. Матчим оба источника — для нашей бинарной задачи
 * (глиф ⌘ против подписи Ctrl) точности достаточно.
 */
export function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const source = `${navigator.platform} ${navigator.userAgent}`;
  return /mac os|macintosh|macintel|macppc|iphone|ipad|ipod/i.test(source) ? 'mac' : 'other';
}

const KEY_CAP_GLYPHS: Partial<Record<KeyCapId, string>> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Space: '␣',
  Enter: '↵',
  Escape: 'Esc',
  Tab: '⇥',
  Backspace: '⌫',
};

function formatKeyCapGlyph(code: KeyCapId): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return KEY_CAP_GLYPHS[code] ?? code;
}

/** Визуальный аккорд: массив глифов, каждый рендерится своим <kbd>. */
export function formatBinding({
  binding,
  platform,
}: {
  binding: KeyBinding;
  platform: Platform;
}): string[] {
  const parts: string[] = [];
  if (platform === 'mac') {
    // Порядок по HIG: ⌥ ⇧ ⌘.
    if (binding.alt) parts.push('⌥');
    if (binding.shift) parts.push('⇧');
    if (binding.mod) parts.push('⌘');
  } else {
    if (binding.mod) parts.push('Ctrl');
    if (binding.alt) parts.push('Alt');
    if (binding.shift) parts.push('Shift');
  }
  parts.push(formatKeyCapGlyph(binding.code));
  return parts;
}

const ARIA_KEY_VALUES: Partial<Record<KeyCapId, string>> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Escape',
  Tab: 'Tab',
  Backspace: 'Backspace',
};

function formatAriaKey(code: KeyCapId): string {
  // Буква заглавная — APG/WAI-ARIA 1.2 записывает non-modifier в верхнем
  // регистре ('Meta+Shift+K'); пунктуация — как есть ('Meta+,').
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return ARIA_KEY_VALUES[code] ?? code;
}

/**
 * Значение `aria-keyshortcuts` на триггере (кнопка/пункт меню).
 * undefined binding → undefined → Svelte не рендерит атрибут.
 */
export function formatAriaBinding({
  binding,
  platform,
}: {
  binding: KeyBinding | undefined;
  platform: Platform;
}): string | undefined {
  if (!binding) return undefined;
  const parts: string[] = [];
  if (binding.mod) parts.push(platform === 'mac' ? 'Meta' : 'Control');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  parts.push(formatAriaKey(binding.code));
  return parts.join('+');
}
```

- [ ] **Step 4: Убедиться, что тест зелёный**

Run: `npx vitest run src/lib/platform.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/platform.ts src/lib/platform.test.ts
git commit -m "feat(commands): add platform detection and binding formatters"
```

---

### Task 5: Компонент `KeyHint` (`src/components/ui/`)

**Files:**
- Create: `src/components/ui/KeyHint.svelte`
- Create: `src/components/ui/KeyHint.stories.svelte`

Доменно-нейтральный лист в `ui/` (рядом с `Avatar`/`Select`). **Не** переиспользуем `KeyCap.svelte` — он привязан к сцене рук (`data-finger-id`, центр-якорь, press-result). Роли тем — только существующие (`--color-surface-accent`, `--color-border`, `--color-text-muted`): новых `--color-kbd-*` не заводим, пока контраст сидит (проверяется глазами в Storybook по темам; алгоритм добавления роли — `docs/06` §6.7, если понадобится).

- [ ] **Step 1: Создать компонент**

```svelte
<script lang="ts">
  import type { KeyBinding } from '@/lib/commands/registry';
  import { isTouchOnlyDevice } from '@/lib/device';
  import { formatBinding, getPlatform } from '@/lib/platform';

  interface Props {
    binding: KeyBinding;
  }

  const { binding }: Props = $props();

  // Глифы модификаторов (⌘⌥⇧) не входят в unicode-range Geist Mono —
  // рендерим --font-sans, а не --font-mono (system-ui на Mac их покрывает).
  // aria-hidden: хинт — визуальный дубль; сочетание для AT объявлено
  // aria-keyshortcuts на триггере (кнопка/пункт меню).
  const parts = $derived(formatBinding({ binding, platform: getPlatform() }));
  const touchOnly = isTouchOnlyDevice();
</script>

{#if !touchOnly}
  <span class="key-hint" aria-hidden="true">
    {#each parts as part, index (index)}
      <kbd class="key-hint__key">{part}</kbd>
    {/each}
  </span>
{/if}

<style>
  .key-hint {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  /* Тихий хром (DESIGN.md): плоский бейдж на существующих ролях. */
  .key-hint__key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    padding: 0.0625rem var(--spacing-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    background: var(--color-surface-accent);
    color: var(--color-text-muted);
    font-family: var(--font-sans);
    font-size: var(--font-size-xs);
    line-height: 1.3;
    user-select: none;
  }
</style>
```

- [ ] **Step 2: Создать stories**

```svelte
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import KeyHint from './KeyHint.svelte';

  const { Story } = defineMeta({
    title: 'UI/KeyHint',
    component: KeyHint,
  });
</script>

<Story name="Mod + comma" args={{ binding: { mod: true, code: 'Comma' } }} />
<Story name="Mod + period" args={{ binding: { mod: true, code: 'Period' } }} />
<Story name="Mod + shift + K" args={{ binding: { mod: true, shift: true, code: 'KeyK' } }} />
```

- [ ] **Step 3: Проверить типы и Storybook**

Run: `make check-dev && make storybook`
Expected: check-dev зелёно; в Storybook (http://localhost:6006, UI/KeyHint) три истории рендерятся, бейджи читаемы.

Критерий приёмки по контрасту (решение пользователя 2026-07-20): **3:1** (бейдж — декоративное дополнение: сочетание продублировано `aria-keyshortcuts` на триггере и видимым текстом пункта меню). Замер (программный, OKLCH→WCAG): light 3.44 / sepia 2.12 / dark 3.13 / nord 3.34 — sepia ниже даже 3:1, принято осознанно как цена «тихого» глифа; зафиксировано в ADR 0032 (Consequences). Если позже решим поднять контраст — запасной путь: `color: var(--color-text-primary)` (6.4–14.7:1 во всех темах, без новой роли) или роль `--color-kbd-*` по алгоритму `docs/06` §6.7.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/KeyHint.svelte src/components/ui/KeyHint.stories.svelte
git commit -m "feat(ui): add KeyHint component for shortcut badges"
```

---

### Task 6: Хинт в пункте меню «Настройки» (`UserMenu.svelte`)

**Files:**
- Modify: `src/components/auth/UserMenu.svelte`

Первый реальный потребитель: пункт читает `binding` из того же реестра, что и диспетчер, — визуал и поведение связаны одним источником. `aria-keyshortcuts` — на самом `<a>` (стандарт WAI-ARIA); `KeyHint` при этом `aria-hidden` и сам прячется на touch-only устройствах.

- [ ] **Step 1: Добавить импорты и данные команды в `<script>`**

После существующих импортов:

```ts
  import KeyHint from '@/components/ui/KeyHint.svelte';
  import { getCommand } from '@/lib/commands/registry';
  import { formatAriaBinding, getPlatform } from '@/lib/platform';
```

После `const auth = getContext<AuthStore>('auth');`:

```ts
  const settingsCommand = getCommand('OPEN_SETTINGS');
  const settingsAriaShortcut = formatAriaBinding({
    binding: settingsCommand.binding,
    platform: getPlatform(),
  });
```

- [ ] **Step 2: Обновить разметку пункта «Настройки»**

Было:

```svelte
      <a class="user-menu__item" href={resolve('/settings')} onclick={() => (open = false)}>
        {$dictionary.app.settings}
      </a>
```

Стало:

```svelte
      <a
        class="user-menu__item"
        href={resolve('/settings')}
        onclick={() => (open = false)}
        aria-keyshortcuts={settingsAriaShortcut}
      >
        <span>{$dictionary.app.settings}</span>
        {#if settingsCommand.binding}
          <KeyHint binding={settingsCommand.binding} />
        {/if}
      </a>
```

- [ ] **Step 3: Обновить стили пункта и ширину dropdown**

Заменить правило `.user-menu__item`:

```css
  .user-menu__item {
    color: var(--color-text-primary);
    background: transparent;
    border: none;
    border-radius: var(--radius-2);
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
    text-decoration: none;
    font: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
```

В `.user-menu__dropdown` поднять ширину под хинт: `min-width: 9rem;` → `min-width: 12rem;`.

- [ ] **Step 4: Проверить**

Run: `make check-dev && make dev`
Expected: зелёно; в dropdown меню пользователя у пункта «Настройки» справа бейдж `[⌘ ,]` (на macOS) / `[Ctrl ,]`, текст не переносится. Проверить в обоих языках интерфейса (переключение в /settings).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/UserMenu.svelte
git commit -m "feat(ui): show settings shortcut hint in user menu"
```

---

### Task 7: Вторая команда — `OPEN_STATS` (доказательство масштабирования) — TDD

**Files:**
- Modify: `src/lib/commands/dispatch.test.ts`
- Modify: `src/lib/commands/registry.ts`
- Modify: `src/components/auth/UserMenu.svelte`

Рост реестра = одна запись + хинт в меню. Аккорд `Cmd/Ctrl + .` (физически рядом с `,`). Если при ручной проверке окажется занят браузером/ОС — заменить `code` в записи, не трогая остальное.

- [ ] **Step 1: Добавить падающий тест матчера**

В `src/lib/commands/dispatch.test.ts`, в конец `describe('matchCommand', ...)`:

```ts
  it('Cmd+. находит OPEN_STATS', () => {
    const command = matchCommand({
      event: keyEvent({ code: 'Period', metaKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command?.id).toBe('OPEN_STATS');
  });
```

Run: `npx vitest run src/lib/commands/dispatch.test.ts`
Expected: FAIL — `command` is `undefined` (записи OPEN_STATS ещё нет).

- [ ] **Step 2: Добавить запись в `COMMANDS`**

В `src/lib/commands/registry.ts` после записи `OPEN_SETTINGS`:

```ts
  {
    id: 'OPEN_STATS',
    binding: { mod: true, code: 'Period' },
    when: 'always',
    run: ({ navigate }) => navigate('/stats'),
  },
```

Run: `npx vitest run src/lib/commands/dispatch.test.ts src/lib/commands/registry.test.ts`
Expected: PASS.

- [ ] **Step 3: Хинт в пункте «Статистика»**

В `<script>` `UserMenu.svelte` рядом с `settingsCommand`:

```ts
  const statsCommand = getCommand('OPEN_STATS');
  const statsAriaShortcut = formatAriaBinding({
    binding: statsCommand.binding,
    platform: getPlatform(),
  });
```

Разметка — было:

```svelte
      <a class="user-menu__item" href={resolve('/stats')} onclick={() => (open = false)}>
        {$dictionary.app.stats}
      </a>
```

Стало:

```svelte
      <a
        class="user-menu__item"
        href={resolve('/stats')}
        onclick={() => (open = false)}
        aria-keyshortcuts={statsAriaShortcut}
      >
        <span>{$dictionary.app.stats}</span>
        {#if statsCommand.binding}
          <KeyHint binding={statsCommand.binding} />
        {/if}
      </a>
```

- [ ] **Step 4: Проверить**

Run: `make check-dev && make dev`
Expected: зелёно; `Cmd+.` открывает `/stats` (в т.ч. на русской раскладке); в меню у «Статистика» бейдж `[⌘ .]`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commands/registry.ts src/lib/commands/dispatch.test.ts src/components/auth/UserMenu.svelte
git commit -m "feat(commands): add open-stats command"
```

---

### Task 8: ADR 0032, обновление CLAUDE.md, финальная проверка

**Files:**
- Create: `docs/adr/0032-command-registry-code-based-shortcuts.md`
- Modify: `docs/adr/README.md` (индекс)
- Modify: `src/routes/CLAUDE.md` (описание keyboard listener)
- Modify: `src/machines/CLAUDE.md` (строка о модификаторах)

Решение сквозное и меняет политику обработки клавиатуры — фиксируем в журнале. Формат — строго по `docs/adr/_template.md` и живому образцу `0031`: заголовок — утверждение **без номера-префикса**, статус — однострочный blockquote под заголовком (не секция), статус **`предложен`** (поднимается до `принят` при мёрже), секции `## Context / ## Decision / ## Considered options / ## Consequences`, числа-настройки не фиксировать (политика `docs/adr/README.md`). Ниже — готовый черновик.

- [ ] **Step 1: Написать ADR**

```markdown
# Командные сочетания клавиш: единый реестр команд, матчинг по event.code

> Статус: предложен · 2026-07-20 · Реализация: src/lib/commands/, src/lib/platform.ts, src/components/ui/KeyHint.svelte

## Context

Приложению нужны командные сочетания клавиш (не печать): `Cmd+,` → настройки и т.п.,
плюс визуальные хинты сочетаний на кнопках и в меню, чтобы пользователь видел
доступность клавиатуры. До этого глобальный keydown в `+layout.svelte` отправлял
ВСЕ клавиши в `keyboardMachine` без фильтра модификаторов — `Cmd+K` во время
тренировки засчитывался как опечатка.

Проект мультиязычный: пользователь постоянно переключает системные раскладки
(qwerty/йцукен). `KeyboardEvent.key` зависит от раскладки и модификаторов
(Cmd+, на русской раскладке даёт key='ю'; Shift/Alt мутируют значение key).

## Decision

Один **реестр команд** (`src/lib/commands/registry.ts`) — источник истины: из него
читают диспетчер keydown и компонент `KeyHint` (визуальный бейдж); будущая палитра
(Cmd+K) подключится к тому же реестру, её поля (group/keywords/titleKey) добавятся
вместе с ней, не заранее. Команда = `{ id, binding?, when, run(context) }`;
`CommandId` — SCREAMING_SNAKE по аналогии с событиями XState.

Матчер — собственный, без зависимостей, **по `event.code`** (физическая позиция),
не по `key`: сочетания инвариантны к активной раскладке, тип аккорда — `KeyCapId`.
`mod` матчится кроссплатформенно по `metaKey || ctrlKey` («Mod»-приём): на Mac
срабатывает и `Ctrl+,` — теневой алиас, которого нет в хинте; принимаем как цену
простоты. Тип `KeyBinding` требует хотя бы один командный модификатор (mod или
alt): binding из одного shift запрещён типом, чтобы хинт не показывал сочетание,
которое не слушаем.

Врезка — до машины печати: аккорд с Cmd/Ctrl/Alt обрабатывается в `handleKeyDown`
до `appActor.send` и не протекает в `keyboardMachine` (закрывает баг с опечатками).
Исключения фильтра: `event.repeat` (auto-repeat не дёргает команду), `ctrl+alt`
(AltGr на Windows — канал печати), keydown самого модификатора. Сочетания не
перехватываются из input/textarea/select/contenteditable (input-focus guard).

KeyHint (`src/components/ui/`) читает `binding` из реестра; `aria-keyshortcuts`
ставится на триггер, сам хинт `aria-hidden` и скрывается на touch-only устройствах.

## Considered options

- **Матчинг по `event.key`** (рекомендация статей по i18n-shortcuts): отклонён —
  key нестабилен на пунктуации и под Shift/Alt, а флагманские сочетания проекта
  пунктуационные; безопасное множество key (A-Z, 0-9) не покрывает Cmd+,.
  Для qwerty/йцукен (обе физически QWERTY) code позиционно стабилен.
- **tinykeys**: живой микро-пакет, умеет code-матчинг. Отклонён: реестр обязателен
  в любом случае, а матчер аккордов тривиален. Остаётся сменной деталью, если
  появятся vim-последовательности (g затем d).
- **mousetrap / hotkeys-js**: отклонены — построены на deprecated which/keyCode,
  некорректны вне US-раскладок.
- **Переиспользование `KeyCap.svelte` для хинта**: отклонено — сценический
  компонент (finger-раскраска, центр-якорь рук, press-result), мёртвый груз для
  инлайн-бейджа; заведён доменно-нейтральный `KeyHint`.
- **Платформо-зависимый матчинг mod** (Cmd строго на macOS, Ctrl строго на
  остальных): отклонён — требует прокидывания платформы в матчер ради отсечения
  теневого алиаса, вреда от которого нет.

## Consequences

- Новая команда = одна запись в реестре; визуал и поведение не расходятся
  структурно.
- Печать меняется в одной точке: аккорды Cmd/Ctrl/Alt больше не доходят до
  `keyboardMachine` (это и фикс бага-опечатки). Печать через AltGr (ctrl+alt)
  сохранена; **Alt-only считается командным каналом** — при появлении раскладок
  с Alt-only-символами (конфликт с моделью ADR 0017) политику пересмотреть новым ADR.
- На macOS у mod-команд есть недокументированный в хинте алиас через Ctrl —
  осознанная цена Mod-конвенции.
- Браузер-зарезервированные сочетания (Cmd+W/T/N/Q) недоступны приложению —
  выбирать аккорды вне этого множества; конфликт чинится в одном месте.
- Глифы ⌘⌥⇧ не входят в unicode-range Geist Mono — KeyHint рендерит --font-sans.
- Ярлыки клавиш (`Ctrl`, `Alt`, `Shift`, `Esc`, `,`, `K`) рендерятся как данные
  физической раскладки, минуя словарь, — осознанное исключение из ADR 0022
  (по прецеденту подписей клавиш в `KeyCap.svelte`); не UI-копия.
- Контраст глифа KeyHint (text-muted на surface-accent) ниже WCAG 4.5:1 во всех
  темах, в sepia ниже 3:1 — принято осознанно (решение 2026-07-20): бейдж —
  декоративное дополнение, сочетание продублировано `aria-keyshortcuts` и
  видимым текстом пункта меню. Запасной путь — `text-primary` без новой роли.
```

- [ ] **Step 2: Добавить строку в индекс `docs/adr/README.md`**

Строка в таблицу индекса после 0031 (формат статуса «предложен» — как у 0017/0019):

```markdown
| [0032](0032-command-registry-code-based-shortcuts.md) | Командные сочетания: единый реестр команд, матчер по `event.code`, KeyHint из того же реестра; Alt-only — командный канал | предложен 2026-07-20 |
```

- [ ] **Step 3: Обновить CLAUDE.md подсистем**

- `src/routes/CLAUDE.md`: в описании keyboard listener `+layout` добавить, что аккорды с Cmd/Ctrl/Alt перехватываются диспетчером команд (`src/lib/commands/dispatch.ts`) **до** `appActor.send` и в `keyboardMachine` не попадают (ADR 0032).
- `src/machines/CLAUDE.md`: одна строка о том, что модификаторные аккорды (кроме Shift и самих модификаторов) в машину больше не приходят — фильтр в `+layout`.

- [ ] **Step 4: Полная проверка**

Run: `make check-all`
Expected: зелёно (lint с `--max-warnings 0` + check + test + spell + build + convex once). Если `spell` красный — навык `/fix-spell`.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0032-command-registry-code-based-shortcuts.md docs/adr/README.md src/routes/CLAUDE.md src/machines/CLAUDE.md
git commit -m "docs(adr): record command registry and code-based shortcuts decision"
```

---

## Что НЕ входит в объём (осознанно)

- Палитра команд `Cmd+K` — реестр к ней готов (`binding?` опционален); поля палитры (`group`/`keywords`/`titleKey`) и сама палитра — отдельной задачей.
- Команды управления сессией (`toggle-pause` и т.п.) — есть гейт `when` и `state.can(...)`; добавляются записью в реестр при появлении требования. Учесть: `event.repeat` уже отфильтрован, осцилляции не будет.
- Хинты в `Header`/`FooterActions` — вставляются тем же паттерном, что Task 6, когда появятся соответствующие команды.
- Пользовательская перенастройка сочетаний — реестр статичен; динамические binding — отдельное решение.
- Регрессионный тест «KEY_UP не-зажатой клавиши = no-op» в `keyboardMachine` — поведение pre-existing (идемпотентный `Set.delete`), этим планом не меняется; закрепить тестом отдельной задачей.
