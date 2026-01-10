/**
 * @file View Model Builder for Hands Scene
 * @description This module is responsible for generating the complete visual state
 * for the hands scene based on the current application state.
 *
 * @method generateHandsSceneViewModel
 *
 * The core of this module is the `generateHandsSceneViewModel` function, which
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
 * 1.  **`getIdleViewModel`**: Creates the initial 'IDLE' state.
 *
 * 2.  **`determineTypingContext`**: A pure helper that analyzes the
 *     current typing symbol and last attempt to determine `activeFingers`,
 *     `errorFingers`, and `activeHands`. It does not modify the ViewModel.
 *
 * 3.  **`applyTargetFingerStates`**: Sets the `ACTIVE` and `INACTIVE` states
 *     on fingers to show what the user *should* do.
 *
 * 4.  **`buildVisibleClusters`**: For each `ACTIVE` finger, it makes the
 *     entire cluster of keys associated with that finger `VISIBLE`.
 *
 * 5.  **`applyNavigationPaths`**: Calculates the optimal path and sets
 *     navigation roles and arrows, completing the "target" view.
 *
 * 6.  **`applyAttemptFeedback`**: A consolidated stage that applies all
 *     visual feedback based on the user's last attempt. It sets `INCORRECT`
 *     finger states and all `pressResult` states on keys.
 *
 * This sequential process ensures that the final `HandsSceneViewModel` is
 * built up logically, step-by-step, providing a clear and predictable
 * transformation of state.
 */

import {
  FingerId,
  FingerLayout,
  FingerState,
  HAND_SIDES,
  HandSide,
  HandsSceneViewModel,
  KeyboardLayout,
  KeyCapId,
  KeySceneState,
  LEFT_HAND_BASE,
  LEFT_HAND_FINGERS,
  RIGHT_HAND_BASE,
  RIGHT_HAND_FINGERS,
  StreamSymbol,
} from "@/interfaces/types";

import {
  getFingerKeys,
  getHomeKeyForFinger,
  isLeftHandFinger,
} from "./hand-utils";
import { KeyCoordinateMap } from "./layout-utils";
import { AdjacencyList, findOptimalPath } from "./pathfinding";
import { areKeyCapIdArraysEqual, getFingerByKeyCap } from "./symbol-utils";

/**
 * Returns a completely idle view model where all fingers are IDLE.
 * This is the default state when no training is active.
 * @returns A HandsSceneViewModel with all fingers in 'IDLE' state.
 */
export function getIdleViewModel(): HandsSceneViewModel {
  const idleState: FingerState = "IDLE";
  const viewModel: Partial<HandsSceneViewModel> = {};
  const allFingerIds: FingerId[] = [
    ...LEFT_HAND_FINGERS,
    LEFT_HAND_BASE,
    ...RIGHT_HAND_FINGERS,
    RIGHT_HAND_BASE,
  ];
  allFingerIds.forEach((id) => {
    viewModel[id] = { fingerState: idleState };
  });
  return viewModel as HandsSceneViewModel;
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
function determineTypingContext(
    currentStreamSymbol: StreamSymbol,
    fingerLayout: FingerLayout
): TypingContext {
    const targetKeyCaps = currentStreamSymbol.targetKeyCaps || [];
    const activeFingers = new Set<FingerId>();
    targetKeyCaps.forEach((keyId: KeyCapId) => {
        const finger = getFingerByKeyCap(keyId, fingerLayout);
        if (finger) {
            activeFingers.add(finger);
        }
    });

    const errorFingers = new Set<FingerId>();
    const lastAttempt =
        currentStreamSymbol?.attempts[currentStreamSymbol.attempts.length - 1];
    const wasAttemptIncorrect = lastAttempt && !areKeyCapIdArraysEqual(lastAttempt.pressedKeyCups, targetKeyCaps);

    if (wasAttemptIncorrect) {
        const incorrectPressFingers = new Set<FingerId>();
        lastAttempt.pressedKeyCups.forEach((keyId) => {
            // Special Space logic first
            if (keyId === 'Space') {
                const targetFingers = Array.from(activeFingers);
                const isTargetLeftHand = targetFingers.length > 0 ? isLeftHandFinger(targetFingers[0]) : false;
                if (isTargetLeftHand) {
                    incorrectPressFingers.add("R1");
                } else {
                    incorrectPressFingers.add("L1");
                }
                return;
            }

            const finger = getFingerByKeyCap(keyId, fingerLayout);
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
function applyTargetFingerStates(
    viewModel: HandsSceneViewModel,
    typingContext: TypingContext
): HandsSceneViewModel {
    const newViewModel = { ...viewModel };
    const { activeFingers, activeHands } = typingContext;

    const allLeftFingers: FingerId[] = [...LEFT_HAND_FINGERS, LEFT_HAND_BASE];
    const allRightFingers: FingerId[] = [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];

    if (activeHands.has('LEFT')) {
        allLeftFingers.forEach((fingerId) => {
            newViewModel[fingerId].fingerState = 'INACTIVE';
        });
    }

    if (activeHands.has('RIGHT')) {
        allRightFingers.forEach((fingerId) => {
            newViewModel[fingerId].fingerState = 'INACTIVE';
        });
    }

    activeFingers.forEach((fingerId) => {
        newViewModel[fingerId].fingerState = "ACTIVE";
    });

    return newViewModel;
}


// STAGE 3: Build initial visible clusters for active fingers
function buildVisibleClusters(
  viewModel: HandsSceneViewModel,
  fingerLayout: FingerLayout
): HandsSceneViewModel {
  const newViewModel = { ...viewModel };

  for (const fingerId in newViewModel) {
    const fingerData = newViewModel[fingerId as FingerId];
    if (fingerData.fingerState !== "ACTIVE") continue;

    const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = {};
    const keyCluster = getFingerKeys(fingerId as FingerId, fingerLayout);
    
    keyCluster.forEach((keyId) => {
      keyCapStates[keyId] = {
        visibility: "VISIBLE",
        navigationRole: "NONE",
        pressResult: "NEUTRAL",
        navigationArrow: "NONE",
      };
    });
    
    fingerData.keyCapStates = keyCapStates;
  }

  return newViewModel;
}

// STAGE 4: Apply navigation paths and roles to visible clusters
function applyNavigationPaths(
  viewModel: HandsSceneViewModel,
  typingContext: TypingContext,
  fingerLayout: FingerLayout,
  keyboardGraph: AdjacencyList,
  keyCoordinateMap: KeyCoordinateMap
): HandsSceneViewModel {
  const newViewModel = { ...viewModel };
  const { targetKeyCaps } = typingContext;

  for (const fingerId in newViewModel) {
    const fingerData = newViewModel[fingerId as FingerId];
    if (fingerData.fingerState !== "ACTIVE" || !fingerData.keyCapStates) continue;

    const homeKey = getHomeKeyForFinger(fingerId as FingerId, fingerLayout);
    const targetKey = targetKeyCaps.find(
      (k: KeyCapId) => getFingerByKeyCap(k, fingerLayout) === fingerId
    );

    if (!targetKey) continue;

    let path: KeyCapId[] = [];
    if (homeKey) {
      path = findOptimalPath(homeKey, targetKey, keyboardGraph);
    }
    
    fingerData.keyCapStates[targetKey]!.navigationRole = "TARGET";
    
    path.forEach((keyId, index) => {
      const keyState = fingerData.keyCapStates![keyId];
      if (!keyState || keyId === targetKey) return;
      
      keyState.navigationRole = "PATH";
      const nextKeyInPath = path[index + 1];
      if (nextKeyInPath) {
        const currentCoords = keyCoordinateMap.get(keyId);
        const nextCoords = keyCoordinateMap.get(nextKeyInPath);
        if (currentCoords && nextCoords) {
          if (nextCoords.r < currentCoords.r) keyState.navigationArrow = "UP";
          else if (nextCoords.r > currentCoords.r) keyState.navigationArrow = "DOWN";
          else if (nextCoords.c < currentCoords.c) keyState.navigationArrow = "LEFT";
          else if (nextCoords.c > currentCoords.c) keyState.navigationArrow = "RIGHT";
        }
      }
    });
  }
  return newViewModel;
}

// STAGE 5: Apply all feedback from the user's attempt
function applyAttemptFeedback(
  viewModel: HandsSceneViewModel,
  typingContext: TypingContext
): HandsSceneViewModel {
  const newViewModel = { ...viewModel };
  const { lastAttempt, targetKeyCaps, wasAttemptIncorrect, errorFingers } = typingContext;
  
  // Apply INCORRECT state to error fingers (out-of-cluster errors)
  errorFingers.forEach((fingerId) => {
    newViewModel[fingerId].fingerState = "INCORRECT";
  });

  // If the attempt was correct, there's no more feedback to apply
  if (!wasAttemptIncorrect) return newViewModel;

  // Apply press results to keys
  const pressedSet = new Set(lastAttempt!.pressedKeyCups);
  const targetSet = new Set(targetKeyCaps);
  const extraKeysPressed = lastAttempt!.pressedKeyCups.filter((k) => !targetSet.has(k));

  for (const fingerId in newViewModel) {
    const fingerData = newViewModel[fingerId as FingerId];
    if (!fingerData.keyCapStates) continue;

    for (const keyId in fingerData.keyCapStates) {
      const keyState = fingerData.keyCapStates[keyId as KeyCapId]!;
      const wasKeyPressed = pressedSet.has(keyId as KeyCapId);
      const wasKeyRequired = targetSet.has(keyId as KeyCapId);

      if (wasKeyRequired && wasKeyPressed) {
        keyState.pressResult = 'CORRECT';
      } else if (wasKeyRequired && !wasKeyPressed) {
        if (extraKeysPressed.length > 0) {
          keyState.pressResult = 'NEUTRAL'; 
        } else {
          keyState.pressResult = 'INCORRECT';
        }
      } else if (!wasKeyRequired && wasKeyPressed) {
        keyState.pressResult = 'INCORRECT';
      }
    }
  }
  return newViewModel;
}


/**
 * Generates the complete HandsSceneViewModel from the current state of the app machine.
 * This is the core "factory" for the visual representation of the trainer.
 *
 * @param currentStreamSymbol The current symbol being typed.
 * @param fingerLayout The layout defining which finger presses which key.
 * @param keyboardLayout The physical layout of the keyboard.
 * @param keyboardGraph The graph representation of the keyboard for pathfinding.
 * @param keyCoordinateMap A map of key coordinates.
 * @returns A HandsSceneViewModel object ready for rendering by UI components.
 */
export function generateHandsSceneViewModel(
  currentStreamSymbol: StreamSymbol | undefined,
  fingerLayout: FingerLayout,
  keyboardLayout: KeyboardLayout, // Not directly used here, but for completeness
  keyboardGraph: AdjacencyList,
  keyCoordinateMap: KeyCoordinateMap
): HandsSceneViewModel {
  // If training is not active or there's no symbol, return a completely idle view.
  if (!currentStreamSymbol) {
    return getIdleViewModel();
  }

  // --- Pipeline Start ---
  let viewModel = getIdleViewModel();
  
  // Data Analysis Stage: Determine the context for the current typing step
  const typingContext = determineTypingContext(currentStreamSymbol, fingerLayout);

  // Stage 1: Apply TARGET finger states (ACTIVE, INACTIVE)
  viewModel = applyTargetFingerStates(
    viewModel,
    typingContext
  );

  // Stage 2: Build initial visible clusters for active fingers
  viewModel = buildVisibleClusters(
    viewModel,
    fingerLayout
  );

  // Stage 3: Apply navigation paths and roles to visible clusters
  viewModel = applyNavigationPaths(
    viewModel,
    typingContext,
    fingerLayout,
    keyboardGraph,
    keyCoordinateMap
  );

  // Stage 4: Apply all feedback from the user's attempt (INCORRECT fingers and key press results)
  viewModel = applyAttemptFeedback(
    viewModel,
    typingContext
  );

  return viewModel;
}