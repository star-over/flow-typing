/**
 * @file Dev-only: установка числа открытых шагов (openedSteps) репертуара
 * текущего юзера из консоли браузера.
 *
 * Выставляет `window.__setOpenedSteps(n)` → `convex.mutation(api.drill.setMyOpenedSteps)`.
 * Берёт текущую раскладку из `settings.symbolLayoutId` на момент вызова, clamp'ит
 * значение на сервере к допустимому диапазону и сбрасывает `symbolCells` профиля.
 *
 * Вызывать ТОЛЬКО из браузера авторизованным: mutation использует `getAuthUserId`.
 * Загружается только в dev-сборке через динамический импорт в `src/machines/appActor.ts`.
 */
import { convex, api } from '@/lib/convex';
import { settings } from '@/lib/settings';
import type { SymbolLayoutId } from '@/interfaces/types';

interface SetOpenedStepsResult {
  openedSteps: number;
  clamped: boolean;
}
type SetOpenedStepsConsoleApi = (targetOpenedSteps: number) => Promise<SetOpenedStepsResult>;

let attached = false;

function currentSymbolLayoutId(): SymbolLayoutId {
  let symbolLayoutId: SymbolLayoutId | undefined;
  settings.subscribe((s) => {
    symbolLayoutId = s.symbolLayoutId;
  })();
  if (symbolLayoutId === undefined) {
    throw new Error('[opened-steps-set] не удалось прочитать текущую раскладку из settings');
  }
  return symbolLayoutId;
}

/** Привязывает `window.__setOpenedSteps`. Идемпотентно. */
export function attachOpenedStepsSet(): void {
  if (attached) return;
  attached = true;

  (window as unknown as { __setOpenedSteps: SetOpenedStepsConsoleApi }).__setOpenedSteps = (
    targetOpenedSteps
  ) => {
    const symbolLayoutId = currentSymbolLayoutId();

    return convex
      .mutation(api.drill.setMyOpenedSteps, {
        symbolLayoutId,
        targetOpenedSteps,
      })
      .then((result) => {
        console.info(
          `[opened-steps-set] установлено: openedSteps=${result.openedSteps}` +
            (result.clamped ? ` (запрошено ${targetOpenedSteps}, clamp до максимума)` : '')
        );
        return result;
      });
  };
}
