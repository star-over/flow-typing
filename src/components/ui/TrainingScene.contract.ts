/**
 * Theme contract for TrainingScene.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * TrainingScene — оболочка тренировки. Её собственный визуальный декор —
 * только debug-блок с текущим состоянием trainingMachine.
 */
export const TRAINING_SCENE_CONTRACT = [
  '--training-scene-state-code-background', // background <code> с trainingState.value
] as const satisfies readonly `--${string}`[];

export type TrainingSceneContractToken = (typeof TRAINING_SCENE_CONTRACT)[number];
