# Session Duration Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-selectable session duration (1/3/5/10/15 min) in the main menu, persist it in `UserSettings` with Convex cloud sync, and parameterize `sessionMachine` so the timer window and drill budget use the chosen duration.

**Architecture:** Extend `UserSettings` with `sessionDurationSeconds`, expose a horizontal segment selector in `MenuScreen`, pass the value through `appMachine` into `sessionMachine`, and replace the hard-coded `SESSION_DURATION_SECONDS` with a runtime value from `SessionContext`.

**Tech Stack:** Svelte 5, XState v5, TypeScript, Convex, Vitest.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/interfaces/user-settings.ts` | Add `sessionDurationSeconds: number` to `UserSettings`. |
| `src/user-settings/user-settings.ts` | Default value `300`. |
| `src/lib/session-config.ts` | Remove `SESSION_DURATION_SECONDS`; keep other constants. |
| `src/lib/settings.ts` | Normalize `sessionDurationSeconds` to one of the allowed values. |
| `src/lib/settings-sync.ts` | Round-trip `sessionDurationSeconds` through Convex cloud sync. |
| `convex/schema.ts` | Add `sessionDurationSeconds` to `userSettings` table. |
| `convex/userSettings.ts` | Add arg to mutation/handler signatures. |
| `src/components/train/SessionDurationSelector.svelte` | New reusable horizontal segment selector component. |
| `src/components/train/MenuScreen.svelte` | Integrate selector, forward `durationSeconds` in `onStart`. |
| `src/machines/app.machine.ts` | Store `sessionDurationSeconds` in context, pass to session input. |
| `src/machines/session.machine.ts` | Accept `durationSeconds` in input/context, use for window/budget. |
| `src/routes/+layout.svelte` | Compute remaining timer seconds from actor context. |
| `dictionaries/en.json`, `dictionaries/ru.json` | Labels for selector. |
| `src/lib/settings.test.ts` | Normalization tests. |
| `src/lib/settings-sync.test.ts` | Cloud round-trip tests. |
| `src/machines/session.machine.test.ts` | Update INPUT, add parameterized duration tests. |
| `src/machines/app.machine.test.ts` | Update `START_TRAINING` events, assert context propagation. |
| `convex/userSettings.test.ts` | Update fixtures, assert persistence. |

---

## Task 1: Extend `UserSettings` type and default

**Files:**
- Modify: `src/interfaces/user-settings.ts`
- Modify: `src/user-settings/user-settings.ts`

- [ ] **Step 1: Add `sessionDurationSeconds` to `UserSettings`**

```ts
// src/interfaces/user-settings.ts
export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  fingerLayoutId: FingerLayoutId;
  cursorType: FlowLineCursorType;
  theme: ThemeSetting;
  displayName: string;
  rhythmChannelEnabled: boolean;
  /** Длительность таймерной сессии в секундах. */
  sessionDurationSeconds: number;
}
```

- [ ] **Step 2: Add default value**

```ts
// src/user-settings/user-settings.ts
export const DEFAULT_USER_SETTINGS: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  theme: 'auto',
  displayName: '',
  rhythmChannelEnabled: false,
  sessionDurationSeconds: 300,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/interfaces/user-settings.ts src/user-settings/user-settings.ts
git commit -m "feat(settings): add sessionDurationSeconds to UserSettings"
```

---

## Task 2: Normalize `sessionDurationSeconds` in settings store

**Files:**
- Modify: `src/lib/settings.ts`
- Modify: `src/lib/settings.test.ts`

- [ ] **Step 1: Write failing normalization tests**

```ts
// src/lib/settings.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeSettings } from './settings';

const DEFAULTS = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  theme: 'auto',
  displayName: '',
  rhythmChannelEnabled: false,
  sessionDurationSeconds: 300,
};

describe('normalizeSettings sessionDurationSeconds', () => {
  it('valid 60 seconds preserved', () => {
    expect(normalizeSettings({ sessionDurationSeconds: 60 }).sessionDurationSeconds).toBe(60);
  });

  it('valid 900 seconds preserved', () => {
    expect(normalizeSettings({ sessionDurationSeconds: 900 }).sessionDurationSeconds).toBe(900);
  });

  it('missing → default 300', () => {
    expect(normalizeSettings({}).sessionDurationSeconds).toBe(300);
  });

  it('non-number → default 300', () => {
    expect(normalizeSettings({ sessionDurationSeconds: '5' }).sessionDurationSeconds).toBe(300);
  });

  it('out-of-range → default 300', () => {
    expect(normalizeSettings({ sessionDurationSeconds: 30 }).sessionDurationSeconds).toBe(300);
  });

  it('in-range but not in options → default 300', () => {
    expect(normalizeSettings({ sessionDurationSeconds: 120 }).sessionDurationSeconds).toBe(300);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/settings.test.ts
```

Expected: failures because `normalizeSettings` ignores the field.

- [ ] **Step 3: Implement normalization**

```ts
// src/lib/settings.ts
const SESSION_DURATION_OPTIONS = [60, 180, 300, 600, 900] as const;

function isSessionDurationSeconds(v: unknown): v is number {
  return typeof v === 'number'
    && v >= 60
    && v <= 900
    && (SESSION_DURATION_OPTIONS as readonly number[]).includes(v);
}

// Inside normalizeSettings, after rhythmChannelEnabled:
const sessionDurationSeconds = isSessionDurationSeconds(stored.sessionDurationSeconds)
  ? stored.sessionDurationSeconds
  : DEFAULT_USER_SETTINGS.sessionDurationSeconds;

return {
  // ... existing fields
  rhythmChannelEnabled,
  sessionDurationSeconds,
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/settings.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.ts src/lib/settings.test.ts
git commit -m "feat(settings): normalize sessionDurationSeconds"
```

---

## Task 3: Cloud sync round-trip

**Files:**
- Modify: `src/lib/settings-sync.ts`
- Modify: `src/lib/settings-sync.test.ts`

- [ ] **Step 1: Write failing round-trip tests**

```ts
// src/lib/settings-sync.test.ts
import { describe, expect, test } from 'vitest';
import { cloudRowToSettings, settingsToCloudArgs } from './settings-sync';
import type { CloudSettings, UserSettings } from './settings-sync';

const validLocal: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  theme: 'auto',
  displayName: '',
  rhythmChannelEnabled: false,
  sessionDurationSeconds: 300,
};

const validCloud: CloudSettings = {
  interfaceLanguage: 'ru',
  textLanguage: 'ru',
  symbolLayoutId: 'йцукен',
  fingerLayoutId: 'sdfv',
  cursorType: 'VERTICAL',
  theme: 'dark',
  displayName: '',
  rhythmChannelEnabled: true,
  sessionDurationSeconds: 600,
  updatedAt: 1000,
};

describe('sessionDurationSeconds cloud round-trip', () => {
  test('settingsToCloudArgs includes sessionDurationSeconds', () => {
    const args = settingsToCloudArgs(validLocal);
    expect(args.sessionDurationSeconds).toBe(300);
    expect(Object.keys(args).sort()).toEqual([
      'cursorType',
      'displayName',
      'fingerLayoutId',
      'interfaceLanguage',
      'rhythmChannelEnabled',
      'sessionDurationSeconds',
      'symbolLayoutId',
      'textLanguage',
      'theme',
    ]);
  });

  test('cloudRowToSettings maps sessionDurationSeconds', () => {
    const result = cloudRowToSettings(validCloud);
    expect(result.sessionDurationSeconds).toBe(600);
  });

  test('cloudRowToSettings preserves missing sessionDurationSeconds (legacy row)', () => {
    const { sessionDurationSeconds, ...legacyCloud } = validCloud;
    const result = cloudRowToSettings(legacyCloud as CloudSettings);
    expect(result.sessionDurationSeconds).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/settings-sync.test.ts
```

Expected: failures.

- [ ] **Step 3: Implement cloud sync fields**

```ts
// src/lib/settings-sync.ts

export interface CloudSettings {
  interfaceLanguage: string;
  textLanguage: string;
  symbolLayoutId: string;
  fingerLayoutId?: string;
  cursorType?: string;
  theme: string;
  displayName?: string;
  rhythmChannelEnabled?: boolean;
  sessionDurationSeconds?: number;
  updatedAt: number;
}

export function cloudRowToSettings(cloud: CloudSettings): UserSettings {
  return {
    interfaceLanguage: cloud.interfaceLanguage,
    textLanguage: cloud.textLanguage,
    symbolLayoutId: cloud.symbolLayoutId,
    fingerLayoutId: cloud.fingerLayoutId,
    cursorType: cloud.cursorType,
    theme: cloud.theme,
    displayName: cloud.displayName ?? '',
    rhythmChannelEnabled: cloud.rhythmChannelEnabled,
    sessionDurationSeconds: cloud.sessionDurationSeconds,
  } as UserSettings;
}

export function settingsToCloudArgs(settings: UserSettings) {
  return {
    interfaceLanguage: settings.interfaceLanguage,
    textLanguage: settings.textLanguage,
    symbolLayoutId: settings.symbolLayoutId,
    fingerLayoutId: settings.fingerLayoutId,
    cursorType: settings.cursorType,
    theme: settings.theme,
    displayName: settings.displayName,
    rhythmChannelEnabled: settings.rhythmChannelEnabled,
    sessionDurationSeconds: settings.sessionDurationSeconds,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/settings-sync.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings-sync.ts src/lib/settings-sync.test.ts
git commit -m "feat(settings-sync): round-trip sessionDurationSeconds through cloud"
```

---

## Task 4: Convex schema and mutation

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/userSettings.ts`
- Modify: `convex/userSettings.test.ts`

- [ ] **Step 1: Add field to Convex schema**

```ts
// convex/schema.ts
userSettings: defineTable({
  userId: v.id('users'),
  interfaceLanguage: v.string(),
  textLanguage: v.string(),
  symbolLayoutId: v.string(),
  fingerLayoutId: v.optional(v.string()),
  cursorType: v.optional(v.string()),
  theme: v.string(),
  displayName: v.optional(v.string()),
  rhythmChannelEnabled: v.optional(v.boolean()),
  sessionDurationSeconds: v.optional(v.number()),
  updatedAt: v.number(),
}).index('by_user', ['userId']),
```

- [ ] **Step 2: Update mutation args and handler**

```ts
// convex/userSettings.ts

export async function upsertMineHandler({
  ctx,
  userId,
  settings,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  settings: {
    interfaceLanguage: string;
    textLanguage: string;
    symbolLayoutId: string;
    fingerLayoutId: string;
    cursorType: string;
    theme: string;
    displayName: string;
    rhythmChannelEnabled: boolean;
    sessionDurationSeconds: number;
  };
}) {
  // existing insert/patch logic, now with sessionDurationSeconds in ...settings
}

export const upsertMine = mutation({
  args: {
    interfaceLanguage: v.string(),
    textLanguage: v.string(),
    symbolLayoutId: v.string(),
    fingerLayoutId: v.string(),
    cursorType: v.string(),
    theme: v.string(),
    displayName: v.string(),
    rhythmChannelEnabled: v.boolean(),
    sessionDurationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Not authenticated');
    }
    return await upsertMineHandler({ ctx, userId, settings: args });
  },
});
```

- [ ] **Step 3: Update test fixtures and add persistence test**

```ts
// convex/userSettings.test.ts
const validSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  theme: 'auto',
  displayName: '',
  rhythmChannelEnabled: false,
  sessionDurationSeconds: 300,
};

// Add inside describe('upsertMineHandler'):
test('persists sessionDurationSeconds through insert and patch', async () => {
  const t = makeConvexTest();
  await t.run(async (ctx) => {
    const userId = await seedUser({ ctx, email: 'a@example.com' });
    await upsertMineHandler({ ctx, userId, settings: { ...validSettings, sessionDurationSeconds: 60 } });
    const inserted = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
    expect(inserted?.sessionDurationSeconds).toBe(60);

    await upsertMineHandler({ ctx, userId, settings: { ...validSettings, sessionDurationSeconds: 900 } });
    const patched = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
    expect(patched?.sessionDurationSeconds).toBe(900);
  });
});
```

- [ ] **Step 4: Run Convex tests**

```bash
npx vitest run convex/userSettings.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/userSettings.ts convex/userSettings.test.ts
git commit -m "feat(convex): persist sessionDurationSeconds in userSettings"
```

---

## Task 5: Parameterize `sessionMachine` with `durationSeconds`

**Files:**
- Modify: `src/lib/session-config.ts`
- Modify: `src/machines/session.machine.ts`
- Modify: `src/machines/session.machine.test.ts`

- [ ] **Step 1: Remove hard-coded constant**

```ts
// src/lib/session-config.ts
/**
 * @file Числа сессии тренировки: длительность, тик, cpm, пороги буфера.
 * cpm провизорный — позже уедет в настройки пользователя.
 */

/** Период тика дисплея таймера, мс (целые секунды достаточно для тренажёра). */
export const TICK_INTERVAL_MS = 1000;

/** Провизорная целевая скорость для расчёта бюджета порции (знаков в минуту). */
export const DEFAULT_SESSION_CPM = 200;

// ... rest unchanged
```

- [ ] **Step 2: Update `sessionMachine` input/context and use runtime window**

```ts
// src/machines/session.machine.ts

export interface SessionInput {
  symbolLayoutId: SymbolLayoutId;
  cpm: number;
  durationSeconds: number;
  parentActor: ParentActor;
}

export interface SessionContext {
  symbolLayoutId: SymbolLayoutId;
  cpm: number;
  durationSeconds: number;
  parentActor: ParentActor;
  pendingStream: TypingStream;
  completed: StreamSymbol[];
  previousCheckpoint: number;
  totalAppended: number;
  elapsedMs: number;
  segmentStartedAt: number;
  displayElapsedMs: number;
}

function getSessionWindowMs(context: SessionContext): number {
  return context.durationSeconds * 1000;
}
```

Update context initialization:

```ts
context: ({ input }) => ({
  symbolLayoutId: input.symbolLayoutId,
  cpm: input.cpm,
  durationSeconds: input.durationSeconds,
  parentActor: input.parentActor,
  pendingStream: [],
  completed: [],
  previousCheckpoint: 0,
  totalAppended: 0,
  elapsedMs: 0,
  segmentStartedAt: 0,
  displayElapsedMs: 0,
}),
```

Replace all `SESSION_DURATION_SECONDS` / `SESSION_WINDOW_MS` usages:

```ts
// In loading state fetchDrills input:
budgetChars: computeBudgetChars({ secondsRemaining: context.durationSeconds, cpm: context.cpm }),

// In refilling state fetchDrills input:
budgetChars: computeBudgetChars({ secondsRemaining: context.durationSeconds, cpm: context.cpm }),

// In accumulateElapsed action:
const committed = commitSegment({
  elapsedMs: context.elapsedMs,
  segmentStartedAt: context.segmentStartedAt,
  now: Date.now(),
  windowMs: getSessionWindowMs(context),
});

// In refreshDisplay action:
displayElapsedMs: liveElapsed({
  elapsedMs: context.elapsedMs,
  segmentStartedAt: context.segmentStartedAt,
  now: Date.now(),
}),

// In isExpired guard:
windowExpired({
  elapsedMs: context.elapsedMs,
  segmentStartedAt: context.segmentStartedAt,
  now: Date.now(),
  windowMs: getSessionWindowMs(context),
}),
```

Remove the top-level `const SESSION_WINDOW_MS = SESSION_DURATION_SECONDS * 1000;`.

- [ ] **Step 3: Update session tests**

```ts
// src/machines/session.machine.test.ts

// Replace:
// import { SESSION_DURATION_SECONDS } from '@/lib/session-config';
// const SESSION_WINDOW_MS = SESSION_DURATION_SECONDS * 1000;

const DURATION_SECONDS = 60;
const SESSION_WINDOW_MS = DURATION_SECONDS * 1000;

const INPUT = {
  symbolLayoutId: 'qwerty' as const,
  cpm: 200,
  durationSeconds: DURATION_SECONDS,
  parentActor: noopParent,
};

// Add parameterized duration test:
describe('sessionMachine duration parameterization', () => {
  it.each([
    { durationSeconds: 60, expectedMs: 60_000 },
    { durationSeconds: 300, expectedMs: 300_000 },
  ])('uses durationSeconds=$durationSeconds for window', async ({ durationSeconds, expectedMs }) => {
    vi.useFakeTimers();
    try {
      const LONG: TypingStream = Array.from({ length: REFILL_THRESHOLD_SYMBOLS + 5 }, () => sym('a', 'KeyA'));
      const actor = createActor(
        provideSession({ fetchSequence: [LONG] }),
        { input: { ...INPUT, durationSeconds } },
      );
      actor.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(actor.getSnapshot().context.durationSeconds).toBe(durationSeconds);

      actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
      await vi.advanceTimersByTimeAsync(expectedMs + TICK_INTERVAL_MS);
      expect(actor.getSnapshot().matches('done')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 4: Run session machine tests**

```bash
npx vitest run src/machines/session.machine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session-config.ts src/machines/session.machine.ts src/machines/session.machine.test.ts
git commit -m "feat(session): parameterize sessionMachine with durationSeconds"
```

---

## Task 6: Pass duration through `appMachine`

**Files:**
- Modify: `src/machines/app.machine.ts`
- Modify: `src/machines/app.machine.test.ts`

- [ ] **Step 1: Update `AppContext`, `AppEvent`, and action**

```ts
// src/machines/app.machine.ts

export interface AppContext {
  lastTrainingStream: TypingStream | null;
  lastSessionSummary: SessionSummaryPayload | null;
  currentSymbolLayoutId: SymbolLayoutId;
  sessionDurationSeconds: number;
}

export type AppEvent =
  | { type: 'START_TRAINING'; symbolLayoutId: SymbolLayoutId; durationSeconds: number }
  // ...

// Replace setSymbolLayout action with setTrainingParams:
setTrainingParams: assign((_, params: { symbolLayoutId: SymbolLayoutId; durationSeconds: number }) => ({
  currentSymbolLayoutId: params.symbolLayoutId,
  sessionDurationSeconds: params.durationSeconds,
})),
```

Update initial context:

```ts
context: {
  lastTrainingStream: null,
  lastSessionSummary: null,
  currentSymbolLayoutId: 'qwerty',
  sessionDurationSeconds: DEFAULT_USER_SETTINGS.sessionDurationSeconds,
},
```

Update `START_TRAINING` in `menu` state:

```ts
START_TRAINING: {
  target: 'trainingStart',
  reenter: true,
  actions: {
    type: 'setTrainingParams',
    params: ({ event }) => ({
      symbolLayoutId: event.symbolLayoutId,
      durationSeconds: event.durationSeconds,
    }),
  },
},
```

Update `START_TRAINING` in `sessionComplete` state similarly.

Update session invoke input:

```ts
input: ({ context, self }) => ({
  symbolLayoutId: context.currentSymbolLayoutId,
  cpm: DEFAULT_SESSION_CPM,
  durationSeconds: context.sessionDurationSeconds,
  parentActor: self,
}),
```

- [ ] **Step 2: Update app machine tests**

```ts
// src/machines/app.machine.test.ts

// Update all START_TRAINING sends to include durationSeconds:
actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });

// Add test:
describe('START_TRAINING duration', () => {
  it('stores sessionDurationSeconds in context and passes it to sessionService input', () => {
    const actor = createActor(appMachineForTest);
    actor.start();
    actor.send({ type: 'START_TRAINING', symbolLayoutId: 'qwerty', durationSeconds: 600 });

    const snap = actor.getSnapshot();
    expect(snap.context.sessionDurationSeconds).toBe(600);
    expect(snap.children.sessionService).toBeDefined();
  });
});
```

- [ ] **Step 3: Run app machine tests**

```bash
npx vitest run src/machines/app.machine.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/machines/app.machine.ts src/machines/app.machine.test.ts
git commit -m "feat(app): pass durationSeconds through appMachine to session"
```

---

## Task 7: Update timer display in `+layout.svelte`

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Remove constant import, read duration from session actor**

```ts
// src/routes/+layout.svelte

// Remove:
// import { SESSION_DURATION_SECONDS } from '@/lib/session-config';

// Replace timerSeconds derivation with:
const durationSeconds = $derived(
  inState({ snapshot: appState, value: 'training' }) && sessionActor
    ? sessionActor.getSnapshot().context.durationSeconds
    : null,
);

const timerSeconds = $derived(
  durationSeconds !== null
    ? Math.max(0, durationSeconds - Math.floor(displayElapsedMs / 1000))
    : null,
);
```

- [ ] **Step 2: Run check**

```bash
make check
```

Expected: PASS (no type errors).

- [ ] **Step 3: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat(layout): compute timer remaining from session actor duration"
```

---

## Task 8: Create `SessionDurationSelector` component

**Files:**
- Create: `src/components/train/SessionDurationSelector.svelte`

- [ ] **Step 1: Implement component**

```svelte
<!-- src/components/train/SessionDurationSelector.svelte -->
<script lang="ts">
  interface Props {
    value: number;
    options: { seconds: number; label: string }[];
    onChange: (seconds: number) => void;
  }

  const { value, options, onChange }: Props = $props();
</script>

<div class="duration-selector">
  <span class="label">Session duration</span>
  <div class="segments" role="radiogroup" aria-label="Session duration">
    {#each options as option}
      <button
        type="button"
        role="radio"
        aria-checked={value === option.seconds}
        class="segment"
        class:selected={value === option.seconds}
        onclick={() => onChange(option.seconds)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .duration-selector {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .label {
    font-size: 0.8125rem;
    color: var(--settings-page-label-color);
  }

  .segments {
    display: flex;
    gap: var(--spacing-1);
  }

  .segment {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    font-size: 0.75rem;
    font-family: var(--font-sans);
    color: var(--select-color);
    background: var(--select-background);
    border: var(--select-border);
    border-radius: var(--radius-3);
    cursor: pointer;
  }

  .segment.selected {
    background: var(--landing-cta-background);
    color: var(--landing-cta-color);
    border-color: var(--landing-cta-background);
  }

  .segment:hover:not(.selected) {
    opacity: 0.8;
  }

  .segment:focus-visible {
    outline: var(--select-focus-outline);
    outline-offset: 2px;
  }
</style>
```

- [ ] **Step 2: Run check**

```bash
make check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/train/SessionDurationSelector.svelte
git commit -m "feat(ui): add SessionDurationSelector component"
```

---

## Task 9: Integrate selector into `MenuScreen`

**Files:**
- Modify: `src/components/train/MenuScreen.svelte`
- Modify: `dictionaries/en.json`
- Modify: `dictionaries/ru.json`

- [ ] **Step 1: Add i18n labels**

```json
// dictionaries/en.json
{
  "settings": {
    "session_duration_label": "Session duration"
  },
  "options": {
    "sessionDurations": {
      "60": "1 min",
      "180": "3 min",
      "300": "5 min",
      "600": "10 min",
      "900": "15 min"
    }
  }
}
```

```json
// dictionaries/ru.json
{
  "settings": {
    "session_duration_label": "Длительность сессии"
  },
  "options": {
    "sessionDurations": {
      "60": "1 мин",
      "180": "3 мин",
      "300": "5 мин",
      "600": "10 мин",
      "900": "15 мин"
    }
  }
}
```

- [ ] **Step 2: Update `MenuScreen` Props and integrate selector**

```ts
// src/components/train/MenuScreen.svelte

interface Props {
  dictionary: Dictionary;
  onStart: (params: { symbolLayoutId: SymbolLayoutId; durationSeconds: number }) => void;
}

const sessionDurationOptions = $derived([
  { seconds: 60, label: dictionary.options.sessionDurations['60'] },
  { seconds: 180, label: dictionary.options.sessionDurations['180'] },
  { seconds: 300, label: dictionary.options.sessionDurations['300'] },
  { seconds: 600, label: dictionary.options.sessionDurations['600'] },
  { seconds: 900, label: dictionary.options.sessionDurations['900'] },
]);
```

Add selector before start button:

```svelte
<SessionDurationSelector
  value={$settings.sessionDurationSeconds}
  options={sessionDurationOptions}
  onChange={(v) => updateSettings({ sessionDurationSeconds: v })}
/>

<button
  type="button"
  class="start-btn"
  onclick={() => onStart({ symbolLayoutId: $settings.symbolLayoutId, durationSeconds: $settings.sessionDurationSeconds })}
>
  {dictionary.app.start_training}
</button>
```

Use localized label in component — since `SessionDurationSelector` currently hardcodes "Session duration", either pass label as prop or inline the selector markup. Prefer prop:

```svelte
<SessionDurationSelector
  label={dictionary.settings.session_duration_label}
  value={$settings.sessionDurationSeconds}
  options={sessionDurationOptions}
  onChange={(v) => updateSettings({ sessionDurationSeconds: v })}
/>
```

Update `SessionDurationSelector` to accept `label: string` prop and use it.

- [ ] **Step 3: Run check and tests**

```bash
make check
npx vitest run src/lib/settings.test.ts src/lib/settings-sync.test.ts src/machines/session.machine.test.ts src/machines/app.machine.test.ts convex/userSettings.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/train/MenuScreen.svelte src/components/train/SessionDurationSelector.svelte dictionaries/en.json dictionaries/ru.json
git commit -m "feat(menu): integrate session duration selector"
```

---

## Task 10: Full verification

- [ ] **Step 1: Run full test suite**

```bash
make test
```

Expected: all tests pass.

- [ ] **Step 2: Run full quality checks**

```bash
make check-all
```

Expected: lint, typecheck, tests, spell pass.

- [ ] **Step 3: Manual smoke test (optional but recommended)**

```bash
make dev
```

Open [http://localhost:5173/train](http://localhost:5173/train), verify:
- Selector shows "1 min", "3 min", "5 min", "10 min", "15 min".
- Selecting a duration updates the UI.
- Starting training uses the selected duration (timer counts down from it).
- Changing selection and starting again uses the new duration.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: final adjustments from check-all"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** every section of `docs/superpowers/specs/2026-07-03-session-duration-selection-design.md` maps to a task above.
- [ ] **Placeholder scan:** no "TBD", "TODO", or vague steps remain.
- [ ] **Type consistency:** `sessionDurationSeconds` is `number` everywhere; `durationSeconds` is `number` in machine inputs/events.
- [ ] **No component test file:** project has no Svelte component tests, so no `SessionDurationSelector.svelte.test.ts` task was added.
