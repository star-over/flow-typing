# Dev-команда `window.__setLadderStep(step)`

## Цель

Дать разработчику в dev-сборке браузерную консольную команду, которая устанавливает текущего пользователя на конкретную ступень KeyLadder для текущей раскладки, сбрасывая накопленный по символам прогресс. Это аналог существующей `window.__resetProfile()`, но не с cold-start, а с произвольной ступени.

## Мотивация

- Тестирование алгоритма роста требует стартовать не только с чистого листа, но и с середины лестницы.
- Ручной проход до нужной ступени занимает время и искажает статистику.
- Существующий паттерн `window.__resetProfile()` даёт готовую точку входа для dev-команд.

## Требования

### Функциональные

1. В dev-сборке в консоли доступна команда `window.__setLadderStep(step: number)`.
2. Команда работает только для авторизованного пользователя (`getAuthUserId`).
3. Команда применяется к профилю `userId × текущая раскладка`.
4. «Текущая раскладка» определяется как `$settings.symbolLayoutId` на момент вызова.
5. Устанавливается поле `openedSteps` в `skillProfiles`:
   - `openedSteps = step`.
   - Если `step` выходит за пределы допустимого диапазона, сервер clamp'ит его к `1..maxStep+1`.
6. Поле `symbolCells` профиля сбрасывается в пустой массив.
7. Если профиль не существует, он создаётся.
8. Команда не перезагружает страницу и не сбрасывает UI-состояние.
9. В консоль выводится результат: фактическое значение `openedSteps` и факт clamp'ирования.

### Нефункциональные

- Код не попадает в прод-сборку (динамический импорт под `import.meta.env.DEV`).
- Реализация повторяет паттерн `src/lib/dev/profile-reset.ts` и `convex/drill.ts:resetMyProfile`.
- Серверная логика вынесена в отдельный handler для тестируемости.

## Архитектура

### Серверная часть (`convex/drill.ts`)

Добавляется mutation `setMyLadderStep` и чистый handler `setMyLadderStepHandler`.

```ts
export async function setMyLadderStepHandler({
  ctx,
  userId,
  symbolLayoutId,
  targetStep,
}: {
  ctx: MutationCtx;
  userId: Id<'users'> | null;
  symbolLayoutId: string;
  targetStep: number;
}): Promise<{ openedSteps: number; clamped: boolean }> {
  if (userId === null) throw new Error('Not authenticated');

  const layoutData = getLayoutData(symbolLayoutId);
  if (!layoutData) throw new Error(`Unknown symbolLayoutId: ${symbolLayoutId}`);

  const maxStep = maxLadderStep(layoutData.keyLadder);
  const maxOpenedSteps = maxStep + 1;
  const clampedStep = Math.max(1, Math.min(targetStep, maxOpenedSteps));

  const existing = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) =>
      q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId)
    )
    .unique();

  const now = Date.now();
  if (existing === null) {
    await ctx.db.insert('skillProfiles', {
      userId,
      symbolLayoutId,
      openedSteps: clampedStep,
      symbolCells: [],
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, {
      openedSteps: clampedStep,
      symbolCells: [],
      updatedAt: now,
    });
  }

  return { openedSteps: clampedStep, clamped: clampedStep !== targetStep };
}
```

Mutation-обёртка:

```ts
export const setMyLadderStep = mutation({
  args: {
    symbolLayoutId: v.string(),
    targetStep: v.number(),
  },
  returns: v.object({
    openedSteps: v.number(),
    clamped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await setMyLadderStepHandler({
      ctx,
      userId,
      symbolLayoutId: args.symbolLayoutId,
      targetStep: args.targetStep,
    });
  },
});
```

### Клиентская часть (`src/lib/dev/ladder-set.ts`)

```ts
import { convex, api } from '@/lib/convex';
import { settings } from '@/lib/settings';
import type { SymbolLayoutId } from '@/interfaces/types';

type SetLadderStepConsoleApi = (step: number) => Promise<{ openedSteps: number; clamped: boolean }>;

let attached = false;

export function attachLadderStepSet(): void {
  if (attached) return;
  attached = true;

  (window as unknown as { __setLadderStep: SetLadderStepConsoleApi }).__setLadderStep = (step) => {
    let symbolLayoutId!: SymbolLayoutId;
    settings.subscribe((s) => { symbolLayoutId = s.symbolLayoutId; })();

    return convex.mutation(api.drill.setMyLadderStep, {
      symbolLayoutId,
      targetStep: step,
    }).then((result) => {
      console.info(
        `[ladder-set] ступень установлена: openedSteps=${result.openedSteps}` +
          (result.clamped ? ` (запрошено ${step}, clamp до максимума)` : '')
      );
      return result;
    });
  };

  console.info('[ladder-set] активен. window.__setLadderStep(step) — установить ступень лестницы.');
}
```

### Подключение (`src/machines/appActor.ts`)

В dev-блок рядом с `attachProfileReset`:

```ts
void import('@/lib/dev/ladder-set').then(({ attachLadderStepSet }) => {
  attachLadderStepSet();
});
```

## Поведение и edge cases

| Сценарий | Результат |
|----------|-----------|
| Авторизованный пользователь, `step` в диапазоне | Upsert профиля, `openedSteps = step`, `symbolCells = []` |
| `step > maxStep + 1` | `openedSteps = maxStep + 1`, в консоли `clamped` |
| `step < 1` | `openedSteps = 1` |
| Профиль отсутствует | Создаётся новый |
| Пользователь не авторизован | Mutation бросает `Not authenticated` |
| Неизвестная `symbolLayoutId` | Mutation бросает ошибку |
| Вызов в прод-сборке | Команда не доступна (chunk не загружен) |

## Тестирование

- Unit-тест `convex/drill.test.ts` для `setMyLadderStepHandler`:
  - установка ступени в существующий профиль;
  - создание профиля, если его нет;
  - clamp вверх и вниз;
  - обнуление `symbolCells`.
- Клиентский dev-модуль не тестируется (как и `profile-reset.ts`).

## Безопасность

- Команда доступна только в dev.
- Mutation видит только `getAuthUserId` → собственный профиль.
- Возможность модифицировать чужие данные отсутствует.

## Связанные файлы

- `src/lib/dev/profile-reset.ts` — шаблон dev-команды.
- `src/machines/appActor.ts` — точка подключения dev-модулей.
- `convex/drill.ts` — серверная логика профиля.
- `src/lib/settings.ts` — источник текущей раскладки.
- `shared/key-ladder/key-step-map.ts` — `maxLadderStep`.
