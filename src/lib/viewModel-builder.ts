import { SnapshotFrom } from 'xstate';

import { fingerLayoutASDF } from '@/data/finger-layout-asdf';
import { keyboardLayoutANSI } from '@/data/keyboard-layout-ansi';
import { FingerId, FingerState, HandsSceneViewModel, KeyCapId, KeySceneState } from '@/interfaces/types';
import { appMachine } from '@/machines/app.machine';

import { getHomeKeyForFinger, getKeyCapIdsByFingerId, isLeftHandFinger } from './hand-utils';
import { createKeyCoordinateMap } from './layout-utils';
import { createKeyboardGraph, findOptimalPath } from './pathfinding';
import { getFingerByKeyCap } from './symbol-utils';

type AppMachineState = SnapshotFrom<typeof appMachine>;

// Create utility maps once at the module level for performance.
const keyboardGraph = createKeyboardGraph(keyboardLayoutANSI);
const keyCoordinateMap = createKeyCoordinateMap(keyboardLayoutANSI);

/**
 * Returns a completely idle view model where all fingers are IDLE.
 * @returns A HandsSceneViewModel.
 */
function getIdleViewModel(): HandsSceneViewModel {
  const idleState: FingerState = 'IDLE';
  const viewModel: Partial<HandsSceneViewModel> = {};
  const allFingerIds: FingerId[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'LB', 'R1', 'R2', 'R3', 'R4', 'R5', 'RB'];
  allFingerIds.forEach(id => {
    viewModel[id] = { fingerState: idleState };
  });
  return viewModel as HandsSceneViewModel;
}

/**
 * Generates the complete HandsSceneViewModel from the current state of the app machine.
 * This is the core "factory" for the visual representation of the trainer.
 *
 * @param state The current state of the AppMachine.
 * @returns A HandsSceneViewModel object ready for rendering by UI components.
 */
export function generateHandsSceneViewModel(state: AppMachineState): HandsSceneViewModel {
  const trainingContext = state.children.trainingService?.getSnapshot()?.context;

  // If training is not active, return a completely idle view.
  if (!trainingContext || !state.matches('training')) {
    return getIdleViewModel();
  }

  // --- 1. Determine Target and Active Keys/Fingers ---
  const { stream, currentIndex, lastAttempt } = trainingContext;
  const currentStreamSymbol = stream[currentIndex];
  const requiredKeyCapIds = currentStreamSymbol?.requiredKeyCapIds || [];
  
  const activeFingers = new Set<FingerId>();
  requiredKeyCapIds.forEach((keyId: KeyCapId) => {
    const finger = getFingerByKeyCap(keyId, fingerLayoutASDF);
    if (finger) {
      activeFingers.add(finger);
    }
  });

  // --- 2. Determine Finger and Hand States (ACTIVE, INACTIVE, IDLE) ---
  const viewModel = getIdleViewModel();
  const activeHands = new Set<'left' | 'right'>();
  if (Array.from(activeFingers).some(isLeftHandFinger)) activeHands.add('left');
  if (Array.from(activeFingers).some(finger => !isLeftHandFinger(finger))) activeHands.add('right');

  // --- 2.5 Process Errors ---
  const errorFingers = new Set<FingerId>();
  if (lastAttempt && !lastAttempt.isCorrect) {
    const incorrectPressFingers = new Set<FingerId>();
    lastAttempt.keys.forEach((keyId: KeyCapId) => {
      if (keyId === 'Space') {
        incorrectPressFingers.add('L1');
        return;
      }
      const finger = getFingerByKeyCap(keyId, fingerLayoutASDF);
      if (finger) incorrectPressFingers.add(finger);
    });

    // An "in-cluster" error is when the finger that made the error is the same as the target finger.
    // In this case, we don't mark the finger as INCORRECT, but rather the key itself.
    const isErrorInCluster =
      incorrectPressFingers.size === activeFingers.size &&
      [...incorrectPressFingers].every(finger => activeFingers.has(finger));

    if (!isErrorInCluster) {
      incorrectPressFingers.forEach(fingerId => errorFingers.add(fingerId));
    }

    // Ensure the hand that made the error is active to be visible
    errorFingers.forEach(fingerId => {
      if (isLeftHandFinger(fingerId)) activeHands.add('left');
      else activeHands.add('right');
    });
  }

  // Apply INACTIVE state based on the Active Hand Rule
  if (activeHands.size > 0) {
    if (!activeHands.has('left')) {
      ['L1', 'L2', 'L3', 'L4', 'L5', 'LB'].forEach(id => viewModel[id as FingerId].fingerState = 'INACTIVE');
    }
    if (!activeHands.has('right')) {
      ['R1', 'R2', 'R3', 'R4', 'R5', 'RB'].forEach(id => viewModel[id as FingerId].fingerState = 'INACTIVE');
    }
  }

  // Set ACTIVE state for the required fingers
  activeFingers.forEach(fingerId => {
    viewModel[fingerId].fingerState = 'ACTIVE';
  });

  // Set INCORRECT state for out-of-cluster error fingers. This overrides other states.
  errorFingers.forEach(fingerId => {
    viewModel[fingerId].fingerState = 'INCORRECT';
  });


  // --- 3. Build detailed keyCapStates for each ACTIVE finger ---
  activeFingers.forEach(fingerId => {
    const fingerData = viewModel[fingerId];
    // Only build clusters for fingers that are meant to be active (not the ones that made an error)
    if (fingerData.fingerState !== 'ACTIVE') return;

    const keyCluster = getKeyCapIdsByFingerId(fingerId, fingerLayoutASDF);
    const homeKey = getHomeKeyForFinger(fingerId, fingerLayoutASDF);
    
    // Find which of the required keys this finger is responsible for
    const targetKey = requiredKeyCapIds.find((k: KeyCapId) => getFingerByKeyCap(k, fingerLayoutASDF) === fingerId);

    let path: KeyCapId[] = [];
    if (homeKey && targetKey) {
      path = findOptimalPath(homeKey, targetKey, keyboardGraph);
    }

    const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = {};
    keyCluster.forEach(keyId => {
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
          const currentCoords = keyCoordinateMap.get(keyId);
          const nextCoords = keyCoordinateMap.get(nextKeyInPath);
          if (currentCoords && nextCoords) {
            if (nextCoords.r < currentCoords.r) arrow = 'UP';
            else if (nextCoords.r > currentCoords.r) arrow = 'DOWN';
            else if (nextCoords.c < currentCoords.c) arrow = 'LEFT';
            else if (nextCoords.c > currentCoords.c) arrow = 'RIGHT';
          }
        }
      }

      // Check if this key was part of an incorrect attempt
      if (lastAttempt && !lastAttempt.isCorrect && lastAttempt.keys.includes(keyId)) {
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
    requiredKeyCapIds.forEach((keyId: KeyCapId) => {
        if (!keyCapStates[keyId]) {
            keyCapStates[keyId] = {
                visibility: 'VISIBLE',
                navigationRole: getFingerByKeyCap(keyId, fingerLayoutASDF) === fingerId ? 'TARGET' : 'NONE',
                pressResult: 'NEUTRAL',
                navigationArrow: 'NONE', 
            }
        }
    })


    fingerData.keyCapStates = keyCapStates;
  });

  return viewModel;
}
