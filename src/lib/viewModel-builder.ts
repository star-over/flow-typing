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
 * 2.  **`determineAndSetFingerStates`**: Determines which fingers are `ACTIVE`,
 *     `INCORRECT`, or `INACTIVE` based on the target and the user's last
 *     attempt.
 *
 * 3.  **`buildVisibleClusters`**: For each `ACTIVE` finger, it makes the
 *     entire cluster of keys associated with that finger `VISIBLE`.
 *
 * 4.  **`applyNavigationPaths`**: Calculates the optimal path from a finger's
 *     home key to the `TARGET` key, and sets the `navigationRole` and
 *     `navigationArrow` for keys along the path.
 *
 * 5.  **`applyPressResults`**: Analyzes the user's last attempt and updates
 *     the `pressResult` (`CORRECT`, `INCORRECT`) for each affected key.
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

// STAGE 1: Determine Finger and Hand States
function determineAndSetFingerStates(
  viewModel: HandsSceneViewModel,
  currentStreamSymbol: StreamSymbol,
  fingerLayout: FingerLayout
): HandsSceneViewModel {
  const newViewModel = { ...viewModel };

  // --- Determine Target and Error Fingers ---
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
  if (
    lastAttempt &&
    !areKeyCapIdArraysEqual(
      lastAttempt.pressedKeyCups,
      currentStreamSymbol.targetKeyCaps
    )
  ) {
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
          return; // continue to next keyId
      }

      const finger = getFingerByKeyCap(keyId, fingerLayout);
      if (finger) {
        incorrectPressFingers.add(finger);
      }
    });

    // An error finger is one that made a press AND is not one of the active fingers for the target
    incorrectPressFingers.forEach((finger) => {
      if (!activeFingers.has(finger)) {
        errorFingers.add(finger);
      }
    });
  }

  // --- Determine Active Hands ---
  const activeHands = new Set<HandSide>();
  if (Array.from(activeFingers).some(isLeftHandFinger))
    activeHands.add(HAND_SIDES[0]); // 'LEFT'
  if (Array.from(activeFingers).some((finger) => !isLeftHandFinger(finger)))
    activeHands.add(HAND_SIDES[1]); // 'RIGHT'

  // Ensure the hand that made the error is also considered active
  errorFingers.forEach((fingerId) => {
    if (isLeftHandFinger(fingerId)) activeHands.add(HAND_SIDES[0]);
    else activeHands.add(HAND_SIDES[1]);
  });

  // --- Apply States to ViewModel ---
  const allLeftFingers: FingerId[] = [...LEFT_HAND_FINGERS, LEFT_HAND_BASE];
  const allRightFingers: FingerId[] = [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];

  // If a hand is active, set its non-participating fingers to INACTIVE.
  // The other hand's fingers remain IDLE from the initial state.
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

  // Set ACTIVE state for the required fingers (overrides INACTIVE)
  activeFingers.forEach((fingerId) => {
    newViewModel[fingerId].fingerState = "ACTIVE";
  });

  // Set INCORRECT state for error fingers (overrides INACTIVE and ACTIVE)
  errorFingers.forEach((fingerId) => {
    newViewModel[fingerId].fingerState = "INCORRECT";
  });

  return newViewModel;
}

// STAGE 2: Build initial visible clusters for active fingers
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

// STAGE 3: Apply navigation paths and roles to visible clusters
function applyNavigationPaths(
  viewModel: HandsSceneViewModel,
  currentStreamSymbol: StreamSymbol,
  fingerLayout: FingerLayout,
  keyboardGraph: AdjacencyList,
  keyCoordinateMap: KeyCoordinateMap
): HandsSceneViewModel {
  const newViewModel = { ...viewModel };
  const targetKeyCaps = currentStreamSymbol.targetKeyCaps || [];

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

// STAGE 4: Apply press results based on the last attempt
function applyPressResults(
  viewModel: HandsSceneViewModel,
  currentStreamSymbol: StreamSymbol
): HandsSceneViewModel {
  const newViewModel = { ...viewModel };
  const targetKeyCaps = currentStreamSymbol.targetKeyCaps || [];
  const lastAttempt = currentStreamSymbol.attempts[currentStreamSymbol.attempts.length - 1];
  
  const wasAttemptIncorrect = lastAttempt && !areKeyCapIdArraysEqual(lastAttempt.pressedKeyCups, targetKeyCaps);
  if (!wasAttemptIncorrect) return newViewModel;

  const pressedSet = new Set(lastAttempt.pressedKeyCups);
  const targetSet = new Set(targetKeyCaps);
  const extraKeysPressed = lastAttempt.pressedKeyCups.filter((k) => !targetSet.has(k));

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

  // Stage 1: Determine and set finger states (ACTIVE, INACTIVE, INCORRECT)
  viewModel = determineAndSetFingerStates(
    viewModel,
    currentStreamSymbol,
    fingerLayout
  );

  // Stage 2: Build initial visible clusters for active fingers
  viewModel = buildVisibleClusters(
    viewModel,
    fingerLayout
  );

  // Stage 3: Apply navigation paths and roles to visible clusters
  viewModel = applyNavigationPaths(
    viewModel,
    currentStreamSymbol,
    fingerLayout,
    keyboardGraph,
    keyCoordinateMap
  );

  // Stage 4: Apply press results based on the last attempt
  viewModel = applyPressResults(
    viewModel,
    currentStreamSymbol
  );

  return viewModel;
}