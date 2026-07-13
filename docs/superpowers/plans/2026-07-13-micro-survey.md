# Micro-survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Один тихий вопрос «Помогает печатать не глядя?» (Да/Немного/Нет) после 3-й тренировки, один раз, для замера гипотезы MVP.

**Architecture:** Ответы — в новой Convex-таблице `surveyResponses` (мутация `record`, query `hasResponded`). «Показан» выводится из наличия строки (закрытие пишет `dismissed`), отдельного флага нет. Показ решает чистая функция `shouldShowMicroSurvey({ sessionCount, hasResponded })` в ветке `sessionComplete` `MainContent.svelte`. UI — dumb-компонент `SurveyPrompt` по trio-конвенции.

**Tech Stack:** Convex (schema/mutation/query, convex-test), Svelte 5 runes, XState (точка показа), тема-контракты, i18n-словари.

**Спек:** `docs/superpowers/specs/2026-07-13-micro-survey-design.md`. **Приоритет:** P1.

---

## Файловая карта

| Файл | Ответственность | Создать/Изменить |
|---|---|---|
| `convex/schema.ts` | таблица `surveyResponses` | Изменить |
| `convex/rateLimiter.ts` | ключ лимита `surveyRecord` | Изменить |
| `convex/surveys.ts` | `record` (+handler) + `hasResponded` | Создать |
| `convex/surveys.test.ts` | тесты backend | Создать |
| `convex/account.ts` | каскад удаления `surveyResponses` | Изменить |
| `convex/account.test.ts` | 0 сирот после удаления | Изменить |
| `src/interfaces/survey.ts` | тип `SurveyAnswer` | Создать |
| `src/lib/micro-survey.ts` | `shouldShowMicroSurvey` | Создать |
| `src/lib/micro-survey.test.ts` | тест логики показа | Создать |
| `src/lib/survey/survey-store.svelte.ts` | reactive `hasResponded` | Создать |
| `dictionaries/{en,ru}.json` | секция `survey` | Изменить |
| `src/components/train/SurveyPrompt.svelte` | dumb UI | Создать |
| `src/components/train/SurveyPrompt.contract.ts` | токены темы | Создать |
| `src/components/train/SurveyPrompt.stories.svelte` | Storybook | Создать |
| `src/themes/contract.ts` | влить контракт | Изменить |
| `src/themes/{light,dark,sepia,nord,_template}.css` | значения токенов | Изменить |
| `src/routes/+layout.svelte` | создать surveyStore + context | Изменить |
| `src/components/app/App.svelte` | пробросить в MainContent | Изменить |
| `src/components/app/MainContent.svelte` | показ + `record` | Изменить |

---

## Task 1: Convex backend — таблица, мутация, query

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/rateLimiter.ts`
- Create: `convex/surveys.ts`
- Test: `convex/surveys.test.ts`

- [ ] **Step 1: Добавить таблицу в схему**

В `convex/schema.ts`, внутри `defineSchema({ ... })` рядом с `clientErrors`, добавить:

```ts
  // micro-survey (P1): один вопрос «Помогает печатать не глядя?» после 3-й
  // тренировки. 'dismissed' = закрыл не ответив (тоже строка) — «показан?»
  // выводим из наличия строки по by_user, отдельного флага нет.
  surveyResponses: defineTable({
    userId: v.id('users'),
    answer: v.union(
      v.literal('yes'), v.literal('somewhat'), v.literal('no'), v.literal('dismissed'),
    ),
    capturedAt: v.number(), // server-stamped
  }).index('by_user', ['userId']),
```

- [ ] **Step 2: Добавить ключ rate-limit**

В `convex/rateLimiter.ts`, в объект-конфиг `new RateLimiter(...)` добавить (после `clientErrorReport`):

```ts
  // surveys.record — редчайший писатель (один раз на юзера). Лимит только против
  // автоматического флуда; легитимный юзер бьёт максимум раз за всё время.
  surveyRecord: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 5 },
```

- [ ] **Step 3: Написать падающий тест backend**

Создать `convex/surveys.test.ts`:

```ts
// convex/surveys.test.ts
import { describe, expect, test } from 'vitest';
import { recordSurveyHandler, hasRespondedHandler } from './surveys';
import { makeConvexTest, seedUser } from './test.helpers';

describe('recordSurveyHandler', () => {
  test('вставляет строку с ответом и server-stamped capturedAt', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'a@example.com' });
      const id = await recordSurveyHandler({ ctx, userId, answer: 'yes' });
      const row = await ctx.db.get(id);
      expect(row?.answer).toBe('yes');
      expect(row?.capturedAt).toBeGreaterThan(0);
    });
  });

  test('dismissed — валидное значение (закрыл не ответив)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'd@example.com' });
      const id = await recordSurveyHandler({ ctx, userId, answer: 'dismissed' });
      expect((await ctx.db.get(id))?.answer).toBe('dismissed');
    });
  });
});

describe('hasRespondedHandler', () => {
  test('false когда строк нет, true после первой', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'h@example.com' });
      expect(await hasRespondedHandler({ ctx, userId })).toBe(false);
      await recordSurveyHandler({ ctx, userId, answer: 'no' });
      expect(await hasRespondedHandler({ ctx, userId })).toBe(true);
    });
  });
});
```

- [ ] **Step 4: Запустить тест — убедиться, что падает**

Run: `npx vitest run convex/surveys.test.ts`
Expected: FAIL — `Cannot find module './surveys'` (файл ещё не создан).

- [ ] **Step 5: Реализовать `convex/surveys.ts`**

```ts
/**
 * @file micro-survey (P1): приём одного ответа «Помогает печатать не глядя?»
 * (Да/Немного/Нет) или закрытия ('dismissed'). «Показан?» выводится из наличия
 * строки (hasResponded), отдельного флага нет. Неавторизованный вызов → throw
 * (record) / false (hasResponded). Handler вынесен для теста без auth-обёртки
 * (паттерн recordSessionSummaryHandler).
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { rateLimiter } from './rateLimiter';

export type SurveyAnswer = 'yes' | 'somewhat' | 'no' | 'dismissed';

export async function recordSurveyHandler({
  ctx,
  userId,
  answer,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  answer: SurveyAnswer;
}): Promise<Id<'surveyResponses'>> {
  return await ctx.db.insert('surveyResponses', { userId, answer, capturedAt: Date.now() });
}

export const record = mutation({
  args: {
    answer: v.union(
      v.literal('yes'), v.literal('somewhat'), v.literal('no'), v.literal('dismissed'),
    ),
  },
  handler: async (ctx, { answer }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error('Not authenticated');
    await rateLimiter.limit(ctx, 'surveyRecord', { key: userId, throws: true });
    return await recordSurveyHandler({ ctx, userId, answer });
  },
});

export async function hasRespondedHandler({
  ctx,
  userId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'>;
}): Promise<boolean> {
  const row = await ctx.db
    .query('surveyResponses')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
  return row !== null;
}

export const hasResponded = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    return await hasRespondedHandler({ ctx, userId });
  },
});
```

- [ ] **Step 6: Запустить тест — убедиться, что проходит**

Run: `npx vitest run convex/surveys.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 7: Коммит**

```bash
git add convex/schema.ts convex/rateLimiter.ts convex/surveys.ts convex/surveys.test.ts
git commit -m "feat(convex): таблица surveyResponses + record/hasResponded (micro-survey)"
```

---

## Task 2: Каскад удаления аккаунта

**Files:**
- Modify: `convex/account.ts:64-68` (блок после `clientErrors`)
- Test: `convex/account.test.ts`

- [ ] **Step 1: Дописать тест на 0 сирот**

В `convex/account.test.ts` найти тест удаления (сидит юзера, пишет данные, удаляет, проверяет 0 строк по таблицам). Добавить `surveyResponses` в сид и в проверку. Если структура теста иная — добавить отдельный блок:

```ts
test('deleteMyAccount стирает surveyResponses юзера', async () => {
  const t = makeConvexTest();
  await t.run(async (ctx) => {
    const userId = await seedUser({ ctx, email: 'del@example.com' });
    await ctx.db.insert('surveyResponses', { userId, answer: 'yes', capturedAt: 1 });
    await deleteMyAccountHandler({ ctx, userId });
    const left = await ctx.db
      .query('surveyResponses')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    expect(left).toHaveLength(0);
  });
});
```

(Импорты `deleteMyAccountHandler`, `makeConvexTest`, `seedUser` — уже есть в файле; проверить и дополнить.)

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run convex/account.test.ts`
Expected: FAIL — строка `surveyResponses` осталась (каскад её не трогает).

- [ ] **Step 3: Добавить каскад**

В `convex/account.ts`, в `deleteMyAccountHandler`, после блока `clientErrors` (строка ~68), перед секцией `// 2. Auth`:

```ts
  // surveyResponses (P1): ответы micro-survey. by_user — только строки этого юзера.
  const surveys = await ctx.db
    .query('surveyResponses')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const row of surveys) await ctx.db.delete(row._id);
```

Также дополнить header-комментарий (строка 11): `... sessionSummaries · clientErrors · surveyResponses`.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run convex/account.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add convex/account.ts convex/account.test.ts
git commit -m "feat(convex): каскад surveyResponses в deleteMyAccount (право на забвение)"
```

---

## Task 3: Чистая логика показа

**Files:**
- Create: `src/interfaces/survey.ts`
- Create: `src/lib/micro-survey.ts`
- Test: `src/lib/micro-survey.test.ts`

- [ ] **Step 1: Тип ответа**

Создать `src/interfaces/survey.ts`:

```ts
/** Ответ micro-survey. 'dismissed' — закрыл/пропустил не ответив. */
export type SurveyAnswer = 'yes' | 'somewhat' | 'no' | 'dismissed';
```

- [ ] **Step 2: Написать падающий тест**

Создать `src/lib/micro-survey.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { shouldShowMicroSurvey, MICRO_SURVEY_SESSION_THRESHOLD } from './micro-survey';

describe('shouldShowMicroSurvey', () => {
  test('порог — 3 тренировки', () => {
    expect(MICRO_SURVEY_SESSION_THRESHOLD).toBe(3);
  });
  test('не показываем до порога', () => {
    expect(shouldShowMicroSurvey({ sessionCount: 0, hasResponded: false })).toBe(false);
    expect(shouldShowMicroSurvey({ sessionCount: 2, hasResponded: false })).toBe(false);
  });
  test('показываем на 3-й, если ещё не отвечал', () => {
    expect(shouldShowMicroSurvey({ sessionCount: 3, hasResponded: false })).toBe(true);
    expect(shouldShowMicroSurvey({ sessionCount: 9, hasResponded: false })).toBe(true);
  });
  test('не показываем, если уже отвечал/закрывал', () => {
    expect(shouldShowMicroSurvey({ sessionCount: 5, hasResponded: true })).toBe(false);
  });
});
```

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npx vitest run src/lib/micro-survey.test.ts`
Expected: FAIL — `Cannot find module './micro-survey'`.

- [ ] **Step 4: Реализовать `src/lib/micro-survey.ts`**

```ts
/**
 * Чистая логика показа micro-survey (ADR 0013 — dumb UI логики не содержит).
 * «Показан» выводится из hasResponded (наличие строки surveyResponses), не из
 * отдельного флага. Спек: docs/superpowers/specs/2026-07-13-micro-survey-design.md.
 */
export const MICRO_SURVEY_SESSION_THRESHOLD = 3;

export function shouldShowMicroSurvey({
  sessionCount,
  hasResponded,
}: {
  sessionCount: number;
  hasResponded: boolean;
}): boolean {
  return sessionCount >= MICRO_SURVEY_SESSION_THRESHOLD && !hasResponded;
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npx vitest run src/lib/micro-survey.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 6: Коммит**

```bash
git add src/interfaces/survey.ts src/lib/micro-survey.ts src/lib/micro-survey.test.ts
git commit -m "feat: shouldShowMicroSurvey — чистая логика показа опроса"
```

---

## Task 4: i18n — секция survey

**Files:**
- Modify: `dictionaries/en.json`
- Modify: `dictionaries/ru.json`

- [ ] **Step 1: Добавить секцию в en.json**

В `dictionaries/en.json` добавить секцию верхнего уровня `survey`:

```json
  "survey": {
    "question": "Helping you type without looking?",
    "answer_yes": "Yes",
    "answer_somewhat": "Somewhat",
    "answer_no": "No",
    "thanks": "Thanks!",
    "dismiss_label": "Dismiss"
  }
```

- [ ] **Step 2: Добавить секцию в ru.json**

В `dictionaries/ru.json` — та же секция с теми же ключами:

```json
  "survey": {
    "question": "Помогает печатать не глядя?",
    "answer_yes": "Да",
    "answer_somewhat": "Немного",
    "answer_no": "Нет",
    "thanks": "Спасибо!",
    "dismiss_label": "Закрыть"
  }
```

- [ ] **Step 3: Проверить типы словаря**

Run: `make check`
Expected: PASS — `Dictionary`-тип принимает новую секцию (структуры en/ru совпали).

- [ ] **Step 4: Коммит**

```bash
git add dictionaries/en.json dictionaries/ru.json
git commit -m "feat(i18n): секция survey для micro-survey (ADR 0022)"
```

---

## Task 5: UI-компонент SurveyPrompt (trio + темы)

**Files:**
- Create: `src/components/train/SurveyPrompt.contract.ts`
- Create: `src/components/train/SurveyPrompt.svelte`
- Create: `src/components/train/SurveyPrompt.stories.svelte`
- Modify: `src/themes/contract.ts`
- Modify: `src/themes/{light,dark,sepia,nord,_template}.css`

- [ ] **Step 1: Контракт токенов**

Создать `src/components/train/SurveyPrompt.contract.ts`:

```ts
/**
 * Theme contract for SurveyPrompt.svelte — micro-survey в sessionComplete.
 * Контракт-тест (src/themes/contract.test.ts) требует токены в каждой теме.
 */
export const SURVEY_PROMPT_CONTRACT = [
  '--survey-prompt-background',
  '--survey-prompt-border',
  '--survey-prompt-question-color',
  '--survey-prompt-button-background',
  '--survey-prompt-button-border',
  '--survey-prompt-button-color',
  '--survey-prompt-button-hover-background',
  '--survey-prompt-thanks-color',
  '--survey-prompt-dismiss-color',
] as const satisfies readonly `--${string}`[];

export type SurveyPromptContractToken = (typeof SURVEY_PROMPT_CONTRACT)[number];
```

- [ ] **Step 2: Влить контракт в THEME_CONTRACT**

В `src/themes/contract.ts`:
1. Добавить import рядом с `REPERTOIRE_PROGRESS_CONTRACT`:
   ```ts
   import { SURVEY_PROMPT_CONTRACT } from '@/components/train/SurveyPrompt.contract';
   ```
2. В массив `THEME_CONTRACT = [...]` добавить `...SURVEY_PROMPT_CONTRACT,` (рядом с `...REPERTOIRE_PROGRESS_CONTRACT,`).

- [ ] **Step 3: Запустить contract-test — убедиться, что падает**

Run: `npx vitest run src/themes/contract.test.ts`
Expected: FAIL — новые токены не объявлены ни в одной теме.

- [ ] **Step 4: Объявить токены в 5 темах**

В каждом из `src/themes/{light,dark,sepia,nord,_template}.css`, в секции после блока `/* RepertoireProgress */` (найти по комментарию), добавить блок `/* SurveyPrompt */` с 9 токенами. Значения — по палитре темы, по образцу соседнего RepertoireProgress. Пример для `light.css` (для остальных тем — те же токены со значениями из их палитры, повторно используя те же CSS-переменные-примитивы, что использует RepertoireProgress рядом):

```css
  /* SurveyPrompt */
  --survey-prompt-background: var(--color-surface-raised);
  --survey-prompt-border: var(--color-border);
  --survey-prompt-question-color: var(--color-text-primary);
  --survey-prompt-button-background: var(--color-surface);
  --survey-prompt-button-border: var(--color-border);
  --survey-prompt-button-color: var(--color-text-primary);
  --survey-prompt-button-hover-background: var(--color-surface-hover);
  --survey-prompt-thanks-color: var(--color-text-secondary);
  --survey-prompt-dismiss-color: var(--color-text-secondary);
```

> Если в конкретной теме нет ровно такого примитива — взять аналог, который использует RepertoireProgress/LessonStatsDisplay в том же файле (открыть файл, скопировать паттерн соседа). Контракт-тест проверяет только присутствие токенов, не значения.

- [ ] **Step 5: Запустить contract-test — убедиться, что проходит**

Run: `npx vitest run src/themes/contract.test.ts`
Expected: PASS.

- [ ] **Step 6: Реализовать компонент**

Создать `src/components/train/SurveyPrompt.svelte`:

```svelte
<script lang="ts">
  import type { Dictionary } from '@/interfaces/types';
  import type { SurveyAnswer } from '@/interfaces/survey';

  interface Props {
    dictionary: Dictionary;
    onAnswer: (answer: SurveyAnswer) => void;
  }
  const { dictionary, onAnswer }: Props = $props();

  let phase = $state<'question' | 'thanks'>('question');

  function choose(answer: SurveyAnswer) {
    onAnswer(answer);
    phase = 'thanks';
  }
</script>

<section class="survey">
  {#if phase === 'question'}
    <div class="row">
      <p class="question">{dictionary.survey.question}</p>
      <button class="dismiss" aria-label={dictionary.survey.dismiss_label} onclick={() => choose('dismissed')}>✕</button>
    </div>
    <div class="answers">
      <button class="answer" onclick={() => choose('yes')}>{dictionary.survey.answer_yes}</button>
      <button class="answer" onclick={() => choose('somewhat')}>{dictionary.survey.answer_somewhat}</button>
      <button class="answer" onclick={() => choose('no')}>{dictionary.survey.answer_no}</button>
    </div>
  {:else}
    <p class="thanks">{dictionary.survey.thanks}</p>
  {/if}
</section>

<style>
  .survey {
    max-width: 28rem;
    padding: var(--spacing-3);
    background: var(--survey-prompt-background);
    border: 1px solid var(--survey-prompt-border);
    border-radius: var(--radius-2);
  }
  .row { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
  .question { color: var(--survey-prompt-question-color); }
  .answers { display: flex; gap: var(--spacing-2); margin-top: var(--spacing-2); }
  .answer {
    padding: var(--spacing-1) var(--spacing-3);
    background: var(--survey-prompt-button-background);
    border: 1px solid var(--survey-prompt-button-border);
    border-radius: var(--radius-1);
    color: var(--survey-prompt-button-color);
    cursor: pointer;
  }
  .answer:hover { background: var(--survey-prompt-button-hover-background); }
  .dismiss { color: var(--survey-prompt-dismiss-color); background: none; border: none; cursor: pointer; }
  .thanks { color: var(--survey-prompt-thanks-color); }
</style>
```

> Примитивы `--spacing-*`, `--radius-*` — из `src/app.css` (проверить точные имена; взять те же, что использует RepertoireProgress.svelte).

- [ ] **Step 7: Storybook-история**

Создать `src/components/train/SurveyPrompt.stories.svelte` по образцу `RepertoireProgress.stories.svelte` (открыть его для точного формата svelte-csf): дефолтная история с заглушкой `dictionary` (взять из существующей заглушки историй) и `onAnswer: () => {}`.

- [ ] **Step 8: Проверка сборки/типов**

Run: `make check`
Expected: PASS.

- [ ] **Step 9: Коммит**

```bash
git add src/components/train/SurveyPrompt.svelte src/components/train/SurveyPrompt.contract.ts src/components/train/SurveyPrompt.stories.svelte src/themes/contract.ts src/themes/light.css src/themes/dark.css src/themes/sepia.css src/themes/nord.css src/themes/_template.css
git commit -m "feat(ui): компонент SurveyPrompt + токены темы (micro-survey)"
```

---

## Task 6: Проводка — стор + показ в MainContent

**Files:**
- Create: `src/lib/survey/survey-store.svelte.ts`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/components/app/App.svelte`
- Modify: `src/components/app/MainContent.svelte`

- [ ] **Step 1: Reactive стор hasResponded**

Создать `src/lib/survey/survey-store.svelte.ts` (паттерн `sessions-store.svelte.ts`):

```ts
import { api, convex } from '@/lib/convex';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import { createAuthGatedQuery } from '@/lib/auth-gated-query.svelte';

/**
 * Reactive флаг «юзер уже видел micro-survey» (наличие строки surveyResponses).
 * Гость → false. Создаётся в +layout после auth (паттерн sessions-store).
 */
export function createSurveyStore({ authStore }: { authStore: AuthStore }) {
  const query = createAuthGatedQuery<boolean>({
    authStore,
    unauthValue: false,
    subscribe: (onResult) => convex.onUpdate(api.surveys.hasResponded, {}, onResult),
  });
  return {
    get hasResponded() {
      return query.value;
    },
  };
}

export type SurveyStore = ReturnType<typeof createSurveyStore>;
```

- [ ] **Step 2: Создать стор в layout + context**

В `src/routes/+layout.svelte`:
1. Import рядом с `createSessionsStore`:
   ```ts
   import { createSurveyStore } from '@/lib/survey/survey-store.svelte';
   ```
2. После `setContext('sessions', sessionsStore);` (строка ~56):
   ```ts
   const surveyStore = createSurveyStore({ authStore });
   setContext('survey', surveyStore);
   ```

- [ ] **Step 3: Показать SurveyPrompt в MainContent**

В `src/components/app/MainContent.svelte`:
1. Импорты (в `<script>`):
   ```ts
   import SurveyPrompt from '@/components/train/SurveyPrompt.svelte';
   import type { SessionsStore } from '@/lib/sessions/sessions-store.svelte';
   import type { SurveyStore } from '@/lib/survey/survey-store.svelte';
   import { shouldShowMicroSurvey } from '@/lib/micro-survey';
   import { api, convex } from '@/lib/convex';
   import type { SurveyAnswer } from '@/interfaces/survey';
   ```
2. Рядом с `const repertoire = getContext<RepertoireStore>('repertoire');`:
   ```ts
   const sessions = getContext<SessionsStore>('sessions');
   const survey = getContext<SurveyStore>('survey');
   const showSurvey = $derived(
     shouldShowMicroSurvey({ sessionCount: sessions.list.length, hasResponded: survey.hasResponded }),
   );
   function recordSurvey(answer: SurveyAnswer) {
     // fire-and-forget, at-most-once (ADR 0015) — как sessionSummary.
     void convex.mutation(api.surveys.record, { answer });
   }
   ```
3. В ветке `sessionComplete` с `lessonStats` (строки 55-62), после `<RepertoireProgress ... />`, добавить:
   ```svelte
   {#if showSurvey}
     <SurveyPrompt {dictionary} onAnswer={recordSurvey} />
   {/if}
   ```
   И такой же блок в вырожденной ветке `session_empty` (строки 64-68) — после `<p class="screen-note">`, чтобы опрос показался и там (3 сессии могли включать пустую). *(Если владелец предпочтёт не показывать на пустой — убрать; по умолчанию показываем: порог считает все завершённые сессии.)*

- [ ] **Step 4: Проверить сборку/типы**

Run: `make check`
Expected: PASS.

- [ ] **Step 5: Прогнать все тесты**

Run: `make test`
Expected: PASS (включая новые convex/surveys, account, micro-survey).

- [ ] **Step 6: Коммит**

```bash
git add src/lib/survey/survey-store.svelte.ts src/routes/+layout.svelte src/components/app/MainContent.svelte
git commit -m "feat: показ SurveyPrompt после 3-й тренировки (micro-survey проводка)"
```

---

## Финальная проверка

- [ ] **Step 1: Полный прогон**

Run: `make check-all`
Expected: PASS (lint + check + test + spell + build + convex dev --once). NB: если dev-квота Convex превышена — `convex dev --once` может упасть на записи; тогда проверять после сброса 1-го числа или на prod.

- [ ] **Step 2: Живая проверка (после запуска приложения)**

`make dev` → войти → пройти 3 тренировки → на экране результатов 3-й появляется вопрос → нажать «Да» → «Спасибо!» → 4-я тренировка вопрос НЕ показывает. Проверить в Convex dashboard таблицу `surveyResponses` (строка с `answer: 'yes'`).

---

## Замечания по scope

- **App.svelte** (`src/components/app/App.svelte`) в файловой карте помечен «пробросить в MainContent», но по факту MainContent берёт сторы через `getContext` (как `repertoire`/`auth`) — проброс props НЕ нужен, App.svelte менять не пришлось. Оставлено в карте как проверенная точка (context-ключи `'sessions'`/`'survey'` регистрируются в `+layout`, MainContent — потомок, `getContext` работает).
- **Тип `SurveyAnswer` намеренно продублирован** в `convex/surveys.ts` и `src/interfaces/survey.ts` — НЕ объединять в один импорт: `src` не импортирует из `convex` (граница слоёв, CLAUDE.md). Оба — одно и то же union по значению; расхождение поймает `v.union` args мутации при вызове с чужим значением.
- **`sessionCount` считается по ТЕКУЩЕЙ раскладке** (`sessions-store` подписан на `listMine` с `symbolLayoutId`). На MVP приемлемо: гипотеза не зависит от раскладки, а подавляющее большинство когорты сидит на одной раскладке (`en`/`qwerty`). Если юзер метался между раскладками — порог 3 сработает по той, где накопил 3. Кросс-раскладочный счётчик — P2, драйвера нет.
- Свободного текстового ввода нет (решение спецификации). Сводку смотрим в Convex dashboard; query-панель — P1 по драйверу.
