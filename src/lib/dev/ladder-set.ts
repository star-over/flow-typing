/**
 * @file Dev-only: установка ступени KeyLadder текущего юзера из консоли браузера.
 *
 * Выставляет `window.__setLadderStep(step)` → `convex.mutation(api.drill.setMyLadderStep)`.
 * Берёт текущую раскладку из `$settings.symbolLayoutId` на момент вызова, clamp'ит
 * ступень на сервере к допустимому диапазону и сбрасывает `symbolCells` профиля.
 *
 * Вызывать ТОЛЬКО из браузера авторизованным: mutation использует `getAuthUserId`.
 * В прод-сборку не входит (динамический импорт под `import.meta.env.DEV`).
 */
import { convex, api } from '@/lib/convex';
import { settings } from '@/lib/settings';
import type { SymbolLayoutId } from '@/interfaces/types';

type SetLadderStepResult = { openedSteps: number; clamped: boolean };
type SetLadderStepConsoleApi = (step: number) => Promise<SetLadderStepResult>;

let attached = false;

/** Привязывает `window.__setLadderStep`. Идемпотентно. */
export function attachLadderStepSet(): void {
  if (attached) return;
  attached = true;

  (window as unknown as { __setLadderStep: SetLadderStepConsoleApi }).__setLadderStep = (step) => {
    let symbolLayoutId!: SymbolLayoutId;
    settings.subscribe((s) => {
      symbolLayoutId = s.symbolLayoutId;
    })();

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
