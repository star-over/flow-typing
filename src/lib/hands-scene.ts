/**
 * @file Сборка `HandsSceneViewModel` — финальной render-готовой модели рук.
 * @description This module is responsible for generating the complete visual state
 * for the hands scene based on the current application state.
 *
 * @method createHandsSceneViewModel
 *
 * The core of this module is the `createHandsSceneViewModel` function, which
 * operates as a pipeline. The process starts with an initial "idle" view model,
 * which is then passed sequentially through a series of transformation functions.
 * Each function in the pipeline is responsible for a specific aspect of the
 * view model, such as setting finger states or defining key visibility and roles.
 *
 * This pipeline architecture makes the logic more modular, easier to understand,
 * and simpler to test and extend. Each stage of the pipeline is a pure function
 * that takes the view model from the previous stage and returns a new,
 * modified version.
 *
 * The pipeline consists of the following key stages:
 *
 * 1.  **`createIdleViewModel`**: Creates the initial 'NONE' state.
 *
 * 2.  **`determineTypingContext`**: A pure helper that analyzes the
 *     current typing symbol and last attempt to determine `activeFingers`,
 *     `errorFingers`, and `activeHands`. It does not modify the ViewModel.
 *
 * 3.  **`applyTargetNavigationRoles`**: Sets the `TARGET` and `INACTIVE` states
 *     on fingers to show what the user *should* do.
 *
 * 4.  **`buildVisibleClusters`**: For each `TARGET` finger, it makes the
 *     entire cluster of keys associated with that finger `VISIBLE`.
 *
 * 5.  **`applyNavigationPaths`**: Calculates the optimal path and sets
 *     navigation roles and arrows, completing the "target" view.
 *
 * 6.  **`applyErrorNavigationRoles`**: Sets the `ERROR` state for any
 *     fingers that made an out-of-cluster error.
 *
 * 7.  **`applyKeyPressResults`**: Analyzes the user's last attempt and updates
 *     the `pressResult` (`CORRECT`, `ERROR`) for each affected key.
 *
 * This sequential process ensures that the final `HandsSceneViewModel` is
 * built up logically, step-by-step, providing a clear and predictable
 * transformation of state.
 */

import {
  FINGER_IDS,
  type FingerId,
  type FingerLayout,
  type FingerNavigationRole,
  HAND_SIDES,
  type HandSide,
  type HandsSceneViewModel,
  type KeyCapId,
  type KeySceneState,
  LEFT_HAND_BASE,
  LEFT_HAND_FINGERS,
  RIGHT_HAND_BASE,
  RIGHT_HAND_FINGERS,
  type StreamSymbol,
} from "@/interfaces/types";

import {
  getFingerKeys,
  getHomeKeyForFinger,
  isLeftHandFinger,
} from "./hand-utils";
import type { KeyCoordinateMap } from "./layout-utils";
import { type AdjacencyList, findOptimalPath } from "./pathfinding";
import { areKeyCapIdArraysEqual, getFingerByKeyCap } from "./symbol-utils";

/**
 * Черновая (не запечатанная) модель сцены рук — рабочий тип конвейера сборки.
 * Здесь `navigationRole` и `keyCapStates` ещё НЕ сцеплены: стадии мутируют черновик
 * свободно (сперва выставляют роли пальцев, затем достраивают кластеры). Инвариант
 * «Полного Кластера» проверяет и сужает черновик до запечатанного {@link HandsSceneViewModel}
 * единственная точка — `sealHandsSceneViewModel`.
 */
interface FingerSceneDraft {
  navigationRole: FingerNavigationRole;
  keyCapStates?: Partial<Record<KeyCapId, KeySceneState>>;
}
export type HandsSceneViewModelDraft = Record<FingerId, FingerSceneDraft>;

const ALL_FINGER_IDS: FingerId[] = [
  ...LEFT_HAND_FINGERS,
  LEFT_HAND_BASE,
  ...RIGHT_HAND_FINGERS,
  RIGHT_HAND_BASE,
];

/** Черновик «все пальцы в NONE» — стартовая точка конвейера. */
function createIdleDraft(): HandsSceneViewModelDraft {
  const draft: Partial<HandsSceneViewModelDraft> = {};
  ALL_FINGER_IDS.forEach((id) => {
    draft[id] = { navigationRole: "NONE" };
  });
  return draft as HandsSceneViewModelDraft;
}

/**
 * Точка запечатывания конвейера. Проверяет правило «Полного Кластера»
 * (`navigationRole === 'TARGET'` ⟺ `keyCapStates` определены) для каждого пальца и
 * сужает черновик до {@link HandsSceneViewModel}. Нарушение инварианта (например, баг
 * порядка стадий) — громкий `throw` прямо на сборке кадра, а не молчаливо сломанная
 * модель в UI.
 */
export function sealHandsSceneViewModel(
  draft: HandsSceneViewModelDraft,
): HandsSceneViewModel {
  for (const fingerId of FINGER_IDS) {
    const finger = draft[fingerId];
    const isTarget = finger.navigationRole === "TARGET";
    const hasKeyCapStates = finger.keyCapStates !== undefined;
    if (isTarget !== hasKeyCapStates) {
      throw new Error(
        `HandsSceneViewModel: нарушено правило «Полного Кластера» для пальца ${fingerId}: ` +
          `navigationRole=${finger.navigationRole}, keyCapStates ` +
          `${hasKeyCapStates ? "присутствует" : "отсутствует"} ` +
          `(keyCapStates должны быть ⟺ navigationRole === 'TARGET').`,
      );
    }
  }
  return draft as HandsSceneViewModel;
}

/**
 * Returns a completely idle view model where all fingers are NONE.
 * This is the default state when no training is active.
 * @returns A HandsSceneViewModel with all fingers in 'NONE' state.
 */
export function createIdleViewModel(): HandsSceneViewModel {
  return sealHandsSceneViewModel(createIdleDraft());
}

interface TypingContext {
    activeFingers: Set<FingerId>;
    errorFingers: Set<FingerId>;
    activeHands: Set<HandSide>;
    lastAttempt: StreamSymbol["attempts"][number] | undefined;
    targetKeyCaps: KeyCapId[];
    wasAttemptIncorrect: boolean;
}

// STAGE 1: Determine Typing Context (Pure helper function)
function determineTypingContext({
  currentStreamSymbol,
  fingerLayout,
}: {
  currentStreamSymbol: StreamSymbol;
  fingerLayout: FingerLayout;
}): TypingContext {
    const targetKeyCaps = currentStreamSymbol.targetKeyCaps;
    const activeFingers = new Set<FingerId>();
    targetKeyCaps.forEach((keyId: KeyCapId) => {
        const finger = getFingerByKeyCap({ keyCapId: keyId, fingerLayout });
        if (finger) {
            activeFingers.add(finger);
        }
    });

    const errorFingers = new Set<FingerId>();
    const lastAttempt =
        currentStreamSymbol.attempts[currentStreamSymbol.attempts.length - 1];
    const wasAttemptIncorrect = !!lastAttempt && !areKeyCapIdArraysEqual({ a: lastAttempt.pressedKeyCaps, b: targetKeyCaps });

    if (wasAttemptIncorrect) {
        const incorrectPressFingers = new Set<FingerId>();
        lastAttempt.pressedKeyCaps.forEach((keyId) => {
            // Special Space logic first
            if (keyId === 'Space') {
                const [firstTargetFinger] = Array.from(activeFingers);
                const isTargetLeftHand = firstTargetFinger ? isLeftHandFinger(firstTargetFinger) : false;
                if (isTargetLeftHand) {
                    incorrectPressFingers.add("R1");
                } else {
                    incorrectPressFingers.add("L1");
                }
                return;
            }

            const finger = getFingerByKeyCap({ keyCapId: keyId, fingerLayout });
            if (finger) {
                incorrectPressFingers.add(finger);
            }
        });

        incorrectPressFingers.forEach((finger) => {
            if (!activeFingers.has(finger)) {
                errorFingers.add(finger);
            }
        });
    }

    const activeHands = new Set<HandSide>();
    if (Array.from(activeFingers).some(isLeftHandFinger))
        activeHands.add(HAND_SIDES[0]);
    if (Array.from(activeFingers).some((finger) => !isLeftHandFinger(finger)))
        activeHands.add(HAND_SIDES[1]);

    errorFingers.forEach((fingerId) => {
        if (isLeftHandFinger(fingerId)) activeHands.add(HAND_SIDES[0]);
        else activeHands.add(HAND_SIDES[1]);
    });

    return { activeFingers, errorFingers, activeHands, lastAttempt, targetKeyCaps, wasAttemptIncorrect };
}

// STAGE 2: Apply Target Finger States to ViewModel
function applyTargetNavigationRoles({
  viewModel,
  typingContext,
}: {
  viewModel: HandsSceneViewModelDraft;
  typingContext: TypingContext;
}): HandsSceneViewModelDraft {
    const newViewModel = { ...viewModel };
    const { activeFingers, activeHands } = typingContext;

    const allLeftFingers: FingerId[] = [...LEFT_HAND_FINGERS, LEFT_HAND_BASE];
    const allRightFingers: FingerId[] = [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];

    if (activeHands.has('LEFT')) {
        allLeftFingers.forEach((fingerId) => {
            newViewModel[fingerId].navigationRole = 'INACTIVE';
        });
    }

    if (activeHands.has('RIGHT')) {
        allRightFingers.forEach((fingerId) => {
            newViewModel[fingerId].navigationRole = 'INACTIVE';
        });
    }

    activeFingers.forEach((fingerId) => {
        newViewModel[fingerId].navigationRole = "TARGET";
    });

    return newViewModel;
}


// STAGE 3: Build initial visible clusters for active fingers
function buildVisibleClusters({
  viewModel,
  fingerLayout,
}: {
  viewModel: HandsSceneViewModelDraft;
  fingerLayout: FingerLayout;
}): HandsSceneViewModelDraft {
  const newViewModel = { ...viewModel };

  for (const fingerId of FINGER_IDS) {
    const fingerData = newViewModel[fingerId];
    if (fingerData.navigationRole !== "TARGET") continue;

    const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = {};
    const keyCluster = getFingerKeys({ fingerId, fingerLayout });

    keyCluster.forEach((keyId) => {
      keyCapStates[keyId] = {
        visibility: "VISIBLE",
        navigationRole: "NONE",
        pressResult: "NONE",
        navigationArrow: "NONE",
      };
    });

    fingerData.keyCapStates = keyCapStates;
  }

  return newViewModel;
}

// --- Internal helpers for applyNavigationPaths ---
function _applyNavigationRoles({
  fingerData,
  path,
  targetKey,
}: {
  fingerData: FingerSceneDraft;
  path: KeyCapId[];
  targetKey: KeyCapId;
}) {
  const { keyCapStates } = fingerData;
  if (!keyCapStates) return;
  const targetState = keyCapStates[targetKey];
  if (!targetState) return;
  targetState.navigationRole = "TARGET";
  path.forEach((keyId) => {
    const keyState = keyCapStates[keyId];
    if (keyState && keyId !== targetKey) {
      keyState.navigationRole = "PATH";
    }
  });
}

function _applyNavigationArrows({
  fingerData,
  path,
  keyCoordinateMap,
}: {
  fingerData: FingerSceneDraft;
  path: KeyCapId[];
  keyCoordinateMap: KeyCoordinateMap;
}) {
  const { keyCapStates } = fingerData;
  if (!keyCapStates) return;
  path.forEach((keyId, index) => {
    const nextKeyInPath = path[index + 1];
    if (nextKeyInPath) {
      const keyState = keyCapStates[keyId];
      const currentCoords = keyCoordinateMap.get(keyId);
      const nextCoords = keyCoordinateMap.get(nextKeyInPath);
      if (keyState && currentCoords && nextCoords) {
        if (nextCoords.r < currentCoords.r) keyState.navigationArrow = "UP";
        else if (nextCoords.r > currentCoords.r) keyState.navigationArrow = "DOWN";
        else if (nextCoords.c < currentCoords.c) keyState.navigationArrow = "LEFT";
        else if (nextCoords.c > currentCoords.c) keyState.navigationArrow = "RIGHT";
      }
    }
  });
}

// STAGE 4: Apply navigation paths and roles to visible clusters
function applyNavigationPaths({
  viewModel,
  typingContext,
  fingerLayout,
  keyboardGraph,
  keyCoordinateMap,
}: {
  viewModel: HandsSceneViewModelDraft;
  typingContext: TypingContext;
  fingerLayout: FingerLayout;
  keyboardGraph: AdjacencyList;
  keyCoordinateMap: KeyCoordinateMap;
}): HandsSceneViewModelDraft {
  const newViewModel = { ...viewModel };
  const { targetKeyCaps } = typingContext;

  for (const fingerId of FINGER_IDS) {
    const fingerData = newViewModel[fingerId];
    if (fingerData.navigationRole !== "TARGET" || !fingerData.keyCapStates) continue;

    const homeKey = getHomeKeyForFinger({ fingerId, fingerLayout });
    const targetKey = targetKeyCaps.find(
      (k: KeyCapId) => getFingerByKeyCap({ keyCapId: k, fingerLayout }) === fingerId
    );

    if (!targetKey) continue;

    let path: KeyCapId[] = [];
    if (homeKey) {
      path = findOptimalPath({ startKey: homeKey, endKey: targetKey, graph: keyboardGraph });
    }

    _applyNavigationRoles({ fingerData, path, targetKey });
    _applyNavigationArrows({ fingerData, path, keyCoordinateMap });
  }
  return newViewModel;
}

// STAGE 5: Apply error states to fingers
function applyErrorNavigationRoles({
  viewModel,
  typingContext,
}: {
  viewModel: HandsSceneViewModelDraft;
  typingContext: TypingContext;
}): HandsSceneViewModelDraft {
  const newViewModel = { ...viewModel };
  const { errorFingers } = typingContext;

  // Apply ERROR state to error fingers (out-of-cluster errors)
  errorFingers.forEach((fingerId) => {
    newViewModel[fingerId].navigationRole = "ERROR";
  });

  return newViewModel;
}

// STAGE 6: Apply press results to keys
function applyKeyPressResults({
  viewModel,
  typingContext,
}: {
  viewModel: HandsSceneViewModelDraft;
  typingContext: TypingContext;
}): HandsSceneViewModelDraft {
  const newViewModel = { ...viewModel };
  const { lastAttempt, targetKeyCaps, wasAttemptIncorrect } = typingContext;

  if (!wasAttemptIncorrect || !lastAttempt) return newViewModel;

  // Apply press results to keys
  const pressedSet = new Set(lastAttempt.pressedKeyCaps);
  const targetSet = new Set(targetKeyCaps);
  const extraKeysPressed = lastAttempt.pressedKeyCaps.filter((k) => !targetSet.has(k));

  for (const fingerId of FINGER_IDS) {
    const fingerData = newViewModel[fingerId];
    const { keyCapStates } = fingerData;
    if (!keyCapStates) continue;

    for (const [keyIdRaw, keyState] of Object.entries(keyCapStates)) {
      const keyId = keyIdRaw as KeyCapId;
      const wasKeyPressed = pressedSet.has(keyId);
      const wasKeyRequired = targetSet.has(keyId);

      if (wasKeyRequired && wasKeyPressed) {
        keyState.pressResult = 'CORRECT';
      } else if (wasKeyRequired && !wasKeyPressed) {
        if (extraKeysPressed.length > 0) {
          keyState.pressResult = 'NONE';
        } else {
          keyState.pressResult = 'ERROR';
        }
      } else if (!wasKeyRequired && wasKeyPressed) {
        keyState.pressResult = 'ERROR';
      }
    }
  }
  return newViewModel;
}


/**
 * Builds the complete HandsSceneViewModel from the current state of the app machine.
 * This is the core "factory" for the visual representation of the trainer.
 */
export function createHandsSceneViewModel({
  currentStreamSymbol,
  fingerLayout,
  keyboardGraph,
  keyCoordinateMap,
}: {
  currentStreamSymbol: StreamSymbol | undefined;
  fingerLayout: FingerLayout;
  keyboardGraph: AdjacencyList;
  keyCoordinateMap: KeyCoordinateMap;
}): HandsSceneViewModel {
  // If training is not active or there's no symbol, return a completely idle view.
  if (!currentStreamSymbol) {
    return createIdleViewModel();
  }

  // --- Pipeline Start ---
  // Стадии работают на черновике (роли и keyCapStates ещё не сцеплены); запечатывание
  // в конце проверяет инвариант «Полного Кластера» и сужает до HandsSceneViewModel.
  let draft = createIdleDraft();

  // Data Analysis Stage: Determine the context for the current typing step
  const typingContext = determineTypingContext({ currentStreamSymbol, fingerLayout });

  // Stage 1: Apply TARGET finger states (TARGET, INACTIVE)
  draft = applyTargetNavigationRoles({ viewModel: draft, typingContext });

  // Stage 2: Build initial visible clusters for active fingers
  draft = buildVisibleClusters({ viewModel: draft, fingerLayout });

  // Stage 3: Apply navigation paths and roles to visible clusters
  draft = applyNavigationPaths({
    viewModel: draft,
    typingContext,
    fingerLayout,
    keyboardGraph,
    keyCoordinateMap,
  });

  // Stage 4: Apply feedback - incorrect fingers
  draft = applyErrorNavigationRoles({ viewModel: draft, typingContext });

  // Stage 5: Apply feedback - key press results
  draft = applyKeyPressResults({ viewModel: draft, typingContext });

  return sealHandsSceneViewModel(draft);
}
