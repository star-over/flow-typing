/**
 * @file View Model Builder for Hands Scene
 * @description This module is responsible for generating the complete visual state
 * for the hands scene based on the current application state. It translates
 * the abstract training state into a concrete view model that UI components
 * can render.
 */

import { FingerId, FingerLayout, FingerState, HAND_SIDES, HandSide, HandsSceneViewModel, KeyboardLayout, KeyCapId, KeySceneState, LEFT_HAND_BASE, LEFT_HAND_FINGERS, RIGHT_HAND_BASE, RIGHT_HAND_FINGERS, StreamSymbol } from '@/interfaces/types';

import { getFingerKeys, getHomeKeyForFinger, isLeftHandFinger } from './hand-utils';
import { KeyCoordinateMap } from './layout-utils';
import { AdjacencyList, findOptimalPath } from './pathfinding';
import { areKeyCapIdArraysEqual, getFingerByKeyCap } from './symbol-utils';



/**
 * Определяет активные пальцы и руки на основе текущего символа потока тренировки.
 * @param trainingContext Контекст тренировочной машины.
 * @returns Объект, содержащий наборы активных пальцев и активных рук.
 */
/**
 * Определяет активные пальцы на основе текущего символа потока тренировки.
 * @param trainingContext Контекст тренировочной машины.
 * @returns Набор активных пальцев.
 */
function getActiveFingers(currentStreamSymbol: StreamSymbol | undefined, fingerLayout: FingerLayout): Set<FingerId> {
  const targetKeyCaps = currentStreamSymbol?.targetKeyCaps || [];

  const activeFingers = new Set<FingerId>();
  targetKeyCaps.forEach((keyId: KeyCapId) => {
    const finger = getFingerByKeyCap(keyId, fingerLayout);
    if (finger) {
      activeFingers.add(finger);
    }
  });
  return activeFingers;
}

/**
 * Определяет активные руки на основе набора активных пальцев.
 * @param activeFingers Набор активных пальцев.
 * @returns Набор активных рук.
 */
function getActiveHands(activeFingers: Set<FingerId>): Set<HandSide> {
  const activeHands = new Set<HandSide>();
  if (Array.from(activeFingers).some(isLeftHandFinger)) activeHands.add(HAND_SIDES[0]); // 'LEFT'
  if (Array.from(activeFingers).some((finger) => !isLeftHandFinger(finger))) activeHands.add(HAND_SIDES[1]); // 'RIGHT'
  return activeHands;
}

/**
 * Обрабатывает ошибки ввода, определяя пальцы, которые должны быть помечены как INCORRECT.
 * @param trainingContext Контекст тренировочной машины.
 * @param activeFingers Набор активных пальцев.
 * @returns Набор пальцев, которые должны быть помечены как INCORRECT.
 */
function processErrors(currentStreamSymbol: StreamSymbol | undefined, activeFingers: Set<FingerId>, fingerLayout: FingerLayout): Set<FingerId> {
  const errorFingers = new Set<FingerId>();
  const currentSymbol = currentStreamSymbol; // Use the directly passed symbol
  const lastAttempt = currentSymbol?.attempts[currentSymbol.attempts.length - 1];

  if (lastAttempt && currentSymbol && !areKeyCapIdArraysEqual(lastAttempt.pressedKeyCups, currentSymbol.targetKeyCaps)) {
    const incorrectPressFingers = new Set<FingerId>();

    const keyId = lastAttempt.pressedKeyCups[0]; // Assuming the first key in the array is the main key pressed
    if (keyId === 'Space') {
      incorrectPressFingers.add('L1');
    } else {
      const finger = getFingerByKeyCap(keyId, fingerLayout); // Use injected fingerLayout
      if (finger) incorrectPressFingers.add(finger);
    }

    const isErrorInCluster =
      incorrectPressFingers.size === activeFingers.size &&
      [...incorrectPressFingers].every((finger) => activeFingers.has(finger));

    if (!isErrorInCluster) {
      incorrectPressFingers.forEach((fingerId) => errorFingers.add(fingerId));
    }
  }
  return errorFingers;
}
/**
 * Применяет состояние INACTIVE к пальцам неактивных рук.
 * @param viewModel Текущий HandsSceneViewModel.
 * @param activeHands Набор активных рук.
 */
function applyHandInactivity(viewModel: HandsSceneViewModel, activeHands: Set<HandSide>): void {
  if (activeHands.size > 0) {
    if (!activeHands.has(HAND_SIDES[0])) { // 'LEFT'
      ['L1', 'L2', 'L3', 'L4', 'L5', 'LB'].forEach((id) => viewModel[id as FingerId].fingerState = 'INACTIVE');
    }
    if (!activeHands.has(HAND_SIDES[1])) { // 'RIGHT'
      ['R1', 'R2', 'R3', 'R4', 'R5', 'RB'].forEach((id) => viewModel[id as FingerId].fingerState = 'INACTIVE');
    }
  }
}

/**
 * Строит детальные keyCapStates для одного активного пальца.
 * @param trainingContext Контекст тренировочной машины.
 * @param fingerId Идентификатор активного пальца.
 * @param lastAttempt Последняя попытка ввода.
 * @param requiredKeyCapIds Обязательные KeyCapId для текущего символа.
 * @returns Объект Partial<Record<KeyCapId, KeySceneState>> с состояниями клавиш.
 */
function buildKeyCapStates(
  currentStreamSymbol: StreamSymbol | undefined,
  fingerId: FingerId,
  targetKeyCaps: KeyCapId[],
  fingerLayout: FingerLayout,
  keyboardGraph: AdjacencyList,
  keyCoordinateMap: KeyCoordinateMap
): Partial<Record<KeyCapId, KeySceneState>> {
  const currentSymbol = currentStreamSymbol;
  const lastAttempt = currentSymbol?.attempts[currentSymbol.attempts.length - 1];

  const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = {};
  const keyCluster = getFingerKeys(fingerId, fingerLayout); // Use injected fingerLayout
  const homeKey = getHomeKeyForFinger(fingerId, fingerLayout); // Use injected fingerLayout

  // Find which of the required keys this finger is responsible for
  const targetKey = targetKeyCaps.find((k: KeyCapId) => getFingerByKeyCap(k, fingerLayout) === fingerId); // Use injected fingerLayout

  let path: KeyCapId[] = [];
  if (homeKey && targetKey) {
    path = findOptimalPath(homeKey, targetKey, keyboardGraph); // Use injected keyboardGraph
  }

  keyCluster.forEach((keyId) => {
    let role: KeySceneState['navigationRole'] = 'NONE';
    let arrow: KeySceneState['navigationArrow'] = 'NONE';
    let pressResult: KeySceneState['pressResult'] = 'NEUTRAL';

    const pathIndex = path.indexOf(keyId);

    if (keyId === targetKey) {
      role = 'TARGET';
    } else if (pathIndex > -1) {
      role = 'PATH';
      // Determine arrow direction
      const nextKeyInPath = path[pathIndex + 1];
      if (nextKeyInPath) {
        const currentCoords = keyCoordinateMap.get(keyId); // Use injected keyCoordinateMap
        const nextCoords = keyCoordinateMap.get(nextKeyInPath); // Use injected keyCoordinateMap
        if (currentCoords && nextCoords) {
          if (nextCoords.r < currentCoords.r) arrow = 'UP';
          else if (nextCoords.r > currentCoords.r) arrow = 'DOWN';
          else if (nextCoords.c < currentCoords.c) arrow = 'LEFT';
          else if (nextCoords.c > currentCoords.c) arrow = 'RIGHT';
        }
      }
    }

    // Check if this key was part of an incorrect attempt
    if (lastAttempt && currentSymbol && !areKeyCapIdArraysEqual(lastAttempt.pressedKeyCups, targetKeyCaps) && lastAttempt.pressedKeyCups.includes(keyId)) {
      pressResult = 'INCORRECT';
    }

    keyCapStates[keyId] = {
      visibility: 'VISIBLE',
      navigationRole: role,
      pressResult: pressResult,
      navigationArrow: arrow,
    };
  });

  // Also make any other required keys (like shift on another hand) visible in this cluster
  targetKeyCaps.forEach((keyId: KeyCapId) => {
      if (!keyCapStates[keyId]) {
          keyCapStates[keyId] = {
              visibility: 'VISIBLE',
              navigationRole: getFingerByKeyCap(keyId, fingerLayout) === fingerId ? 'TARGET' : 'NONE', // Use injected fingerLayout
              pressResult: 'NEUTRAL',
              navigationArrow: 'NONE',
          }
      }
  })

  return keyCapStates;
}

/**
 * Returns a completely idle view model where all fingers are IDLE.
 * This is the default state when no training is active.
 * @returns A HandsSceneViewModel with all fingers in 'IDLE' state.
 */
function getIdleViewModel(): HandsSceneViewModel {
  const idleState: FingerState = 'IDLE';
  const viewModel: Partial<HandsSceneViewModel> = {};
  const allFingerIds: FingerId[] = [...LEFT_HAND_FINGERS, LEFT_HAND_BASE, ...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];
  allFingerIds.forEach((id) => { viewModel[id] = { fingerState: idleState } });
  return viewModel as HandsSceneViewModel;
}

/**
 * Generates the complete HandsSceneViewModel from the current state of the app machine.
 * This is the core "factory" for the visual representation of the trainer.
 * The view model contains all information needed by the UI components to render
 * the hands, fingers, and keys with appropriate states (active, inactive, incorrect, etc.).
 *
 * The process involves:
 * 1. Determining which keys and fingers are required for the current symbol.
 * 2. Calculating finger and hand states based on active fingers and errors.
 * 3. Building detailed key states including navigation paths and press results.
 *
 * @param state The current state of the AppMachine, containing training context.
 * @returns A HandsSceneViewModel object ready for rendering by UI components.
 */
export function generateHandsSceneViewModel(
  currentStreamSymbol: StreamSymbol | undefined,
  fingerLayout: FingerLayout,
  keyboardLayout: KeyboardLayout, // Not directly used here, but for completeness and potential future use
  keyboardGraph: AdjacencyList,
  keyCoordinateMap: KeyCoordinateMap
): HandsSceneViewModel {
  // If training is not active, return a completely idle view.
  if (!currentStreamSymbol) { // Changed condition to use currentStreamSymbol
    return getIdleViewModel();
  }

  const viewModel = getIdleViewModel();
  // --- 1. Determine Target and Active Keys/Fingers ---
  const activeFingers = getActiveFingers(currentStreamSymbol, fingerLayout); // Pass fingerLayout
  const activeHands = getActiveHands(activeFingers);
  const targetKeyCaps = currentStreamSymbol.targetKeyCaps || [];

  // --- 2.5 Process Errors ---
  const errorFingers = processErrors(currentStreamSymbol, activeFingers, fingerLayout); // Pass fingerLayout

  // Ensure the hand that made the error is active to be visible
  errorFingers.forEach((fingerId) => {
    if (isLeftHandFinger(fingerId)) activeHands.add(HAND_SIDES[0]); // 'LEFT'
    else activeHands.add(HAND_SIDES[1]); // 'RIGHT'
  });

  // Apply INACTIVE state based on the Active Hand Rule
  applyHandInactivity(viewModel, activeHands);

  // Set ACTIVE state for the required fingers
  activeFingers.forEach((fingerId) => {
    viewModel[fingerId].fingerState = 'ACTIVE';
  });

  // Set INCORRECT state for out-of-cluster error fingers. This overrides other states.
  errorFingers.forEach((fingerId) => {
    viewModel[fingerId].fingerState = 'INCORRECT';
  });


  // --- 3. Build detailed keyCapStates for each ACTIVE finger ---
  activeFingers.forEach((fingerId) => {
    const fingerData = viewModel[fingerId];
    // Only build clusters for fingers that are meant to be active (not the ones that made an error)
    if (fingerData.fingerState !== 'ACTIVE') return;

    fingerData.keyCapStates = buildKeyCapStates(currentStreamSymbol, fingerId, targetKeyCaps, fingerLayout, keyboardGraph, keyCoordinateMap); // Pass all dependencies
  });

  return viewModel;
}
