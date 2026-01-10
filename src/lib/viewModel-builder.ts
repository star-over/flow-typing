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
 * 1.  **`getIdleViewModel`**:
 *     - Creates the initial, baseline state where all fingers are 'IDLE' and
 *       no key clusters are visible.
 *
 * 2.  **`determineAndSetFingerStates`**:
 *     - Analyzes the target keys and the user's last attempt.
 *     - Determines which fingers are `ACTIVE` (for the target), `INCORRECT`
 *       (for errors), and `INACTIVE` (on an active hand but not in use).
 *     - Sets the `fingerState` for every finger accordingly. This stage also
 *       handles the "Active Hand Rule", ensuring fingers on the non-active
 *       hand are correctly marked.
 *
 * 3.  **`buildKeyCapStates`**:
 *     - Iterates through all `ACTIVE` fingers.
 *     - For each active finger, it builds the `keyCapStates` object. This
 *       involves:
 *       - Making the finger's entire key cluster visible.
 *       - Identifying the `TARGET` key.
 *       - Calculating the `PATH` from the finger's home key to the target.
 *       - Setting navigation `ARROWS` along the path.
 *       - Marking `INCORRECT` key presses within the cluster.
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

// STAGE 2: Build KeyCap States for Active Fingers
function buildKeyCapStates(
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

    // Only build clusters for fingers that are meant to be active
    if (fingerData.fingerState !== "ACTIVE") continue;

    const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = {};
    const keyCluster = getFingerKeys(fingerId as FingerId, fingerLayout);
    const homeKey = getHomeKeyForFinger(fingerId as FingerId, fingerLayout);

    const targetKey = targetKeyCaps.find(
      (k: KeyCapId) => getFingerByKeyCap(k, fingerLayout) === fingerId
    );

    let path: KeyCapId[] = [];
    if (homeKey && targetKey) {
      path = findOptimalPath(homeKey, targetKey, keyboardGraph);
    }

    const lastAttempt =
      currentStreamSymbol?.attempts[currentStreamSymbol.attempts.length - 1];

    keyCluster.forEach((keyId) => {
      let role: KeySceneState["navigationRole"] = "NONE";
      let arrow: KeySceneState["navigationArrow"] = "NONE";
      let pressResult: KeySceneState["pressResult"] = "NEUTRAL";

      const pathIndex = path.indexOf(keyId);

      if (keyId === targetKey) {
        role = "TARGET";
      } else if (pathIndex > -1) {
        role = "PATH";
        const nextKeyInPath = path[pathIndex + 1];
        if (nextKeyInPath) {
          const currentCoords = keyCoordinateMap.get(keyId);
          const nextCoords = keyCoordinateMap.get(nextKeyInPath);
          if (currentCoords && nextCoords) {
            if (nextCoords.r < currentCoords.r) arrow = "UP";
            else if (nextCoords.r > currentCoords.r) arrow = "DOWN";
            else if (nextCoords.c < currentCoords.c) arrow = "LEFT";
            else if (nextCoords.c > currentCoords.c) arrow = "RIGHT";
          }
        }
      }

      const wasAttemptIncorrect = lastAttempt && !areKeyCapIdArraysEqual(lastAttempt.pressedKeyCups, targetKeyCaps);

      if (wasAttemptIncorrect) {
        const pressedSet = new Set(lastAttempt.pressedKeyCups);
        const targetSet = new Set(targetKeyCaps);

        const extraKeysPressed = lastAttempt.pressedKeyCups.filter((k) => !targetSet.has(k));
        
        const wasKeyPressed = pressedSet.has(keyId);
        const wasKeyRequired = targetSet.has(keyId);

        if (wasKeyRequired && wasKeyPressed) {
            pressResult = 'CORRECT'; // Correct part of a failed chord
        } else if (wasKeyRequired && !wasKeyPressed) {
            // It's a required key that wasn't pressed.
            // If an extra key was pressed, this should be neutral.
            // If no extra keys were pressed, it means it's a missed part of a chord.
            if (extraKeysPressed.length > 0) {
                pressResult = 'NEUTRAL'; 
            } else {
                pressResult = 'INCORRECT';
            }
        } else if (!wasKeyRequired && wasKeyPressed) {
            pressResult = 'INCORRECT'; // Extra, unrequired key pressed
        }
      }

      keyCapStates[keyId] = {
        visibility: "VISIBLE",
        navigationRole: role,
        pressResult: pressResult,
        navigationArrow: arrow,
      };
    });
    
    fingerData.keyCapStates = keyCapStates;
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

  // Stage 2: Build detailed keyCapStates for each ACTIVE finger
  viewModel = buildKeyCapStates(
    viewModel,
    currentStreamSymbol,
    fingerLayout,
    keyboardGraph,
    keyCoordinateMap
  );

  return viewModel;
}