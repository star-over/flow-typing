/**
 * @file Dev-only: установка ступени KeyLadder текущего юзера из консоли браузера.
 *
 * Выставляет `window.__setLadderStep(step)` → `convex.mutation(api.drill.setMyLadderStep)`.
 * Берёт текущую раскладку из `$settings.symbolLayoutId` на момент вызова, clamp'ит
 * ступень на сервере к допустимому диапазону и сбрасывает `symbolCells` профиля.
 *
 * Вызывать ТОЛЬКО из браузера авторизованным: mutation использует `getAuthUserId`.
 * Загружается только в dev-сборке через динамический импорт в `src/machines/appActor.ts`.
 */
import { convex, api } from '@/lib/convex';
import { settings } from '@/lib/settings';
import type { SymbolLayoutId } from '@/interfaces/types';

interface SetLadderStepResult {
  openedSteps: number;
  clamped: boolean;
}
type SetLadderStepConsoleApi = (step: number) => Promise<SetLadderStepResult>;

let attached = false;

function currentSymbolLayoutId(): SymbolLayoutId {
  let symbolLayoutId: SymbolLayoutId | undefined;
  settings.subscribe((s) => {
    symbolLayoutId = s.symbolLayoutId;
  })();
  if (symbolLayoutId === undefined) {
    throw new Error('[ladder-set] не удалось прочитать текущую раскладку из settings');
  }
  return symbolLayoutId;
}

/** Привязывает `window.__setLadderStep`. Идемпотентно. */
export function attachLadderStepSet(): void {
  if (attached) return;
  attached = true;

  (window as unknown as { __setLadderStep: SetLadderStepConsoleApi }).__setLadderStep = (step) => {
    const symbolLayoutId = currentSymbolLayoutId();

    return convex
      .mutation(api.drill.setMyLadderStep, {
        symbolLayoutId,
        targetStep: step,
      })
      .then((result) => {
        console.info(
          `[ladder-set] ступень установлена: openedSteps=${result.openedSteps}` +
            (result.clamped ? ` (запрошено ${step}, clamp до максимума)` : '')
        );
        return result;
      });
  };

  console.info('[ladder-set] активен. window.__setLadderStep(step) — установить ступень лестницы.');
}
