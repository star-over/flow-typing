/**
 * Theme contract for TrainingScene.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * TrainingScene — оболочка тренировки. Её собственный визуальный декор —
 * только блок таймера обратного отсчёта сессии.
 */
export const TRAINING_SCENE_CONTRACT = [
  '--training-scene-state-code-background', // background <code> с таймером (remainingSeconds)
] as const satisfies readonly `--${string}`[];

export type TrainingSceneContractToken = (typeof TRAINING_SCENE_CONTRACT)[number];
