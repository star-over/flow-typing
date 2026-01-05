import { SnapshotFrom } from 'xstate';

import { fingerLayoutASDF } from '@/data/finger-layout-asdf';
import { FingerId, FingerState, HandsSceneViewModel, KeyCapId,KeySceneState } from '@/interfaces/types';
import { appMachine } from '@/machines/app.machine';

import { getFingerByKeyCap } from './symbol-utils';

type AppMachineState = SnapshotFrom<typeof appMachine>;

/**
 * Generates the complete HandsSceneViewModel from the current state of the app machine.
 *
 * @param state The current state of the AppMachine.
 * @returns A HandsSceneViewModel object ready for rendering by UI components.
 */
export function generateHandsSceneViewModel(state: AppMachineState): HandsSceneViewModel {
  const trainingContext = state.children.trainingService?.getSnapshot()?.context;
  const keyboardContext = state.children.keyboardService?.getSnapshot()?.context;

  if (!trainingContext || !keyboardContext) {
    // Return an idle view model if machines are not ready
    return getIdleViewModel();
  }

  // Step 1: Determine target keys and fingers
  const currentStreamSymbol = trainingContext.stream[trainingContext.currentIndex];
  const requiredKeyCapIds = currentStreamSymbol?.requiredKeyCapIds || [];
  
  const targetFingers = new Set<FingerId>();
  requiredKeyCapIds.forEach((keyId: KeyCapId) => {
    const finger = getFingerByKeyCap(keyId, fingerLayoutASDF);
    if (finger) {
      targetFingers.add(finger);
    }
  });

  // Step 2: Determine finger states (ACTIVE, INACTIVE, IDLE, INCORRECT)
  // This is a complex step that involves checking for errors and active hands.
  // Placeholder logic:
  const fingerStates = {} as Record<FingerId, { fingerState: FingerState }>;
  // ... to be implemented based on VisualContract.md rules ...
  
  // For now, let's just create a basic active/idle state
  const allFingerIds: FingerId[] = Object.values(fingerLayoutASDF).map(f => f.fingerId).filter((v, i, a) => a.indexOf(v) === i) as FingerId[];
  allFingerIds.forEach(id => {
    if (targetFingers.has(id)) {
      fingerStates[id] = { fingerState: 'ACTIVE' };
    } else {
      fingerStates[id] = { fingerState: 'IDLE' };
    }
  });


  // Step 3: Determine KeyCap states for active fingers
  // This involves pathfinding and error checking.
  // Placeholder logic:
  const finalViewModel: HandsSceneViewModel = { ...getIdleViewModel() };

  for (const fingerId in fingerStates) {
    finalViewModel[fingerId as FingerId] = { fingerState: fingerStates[fingerId as FingerId].fingerState };
  }

  targetFingers.forEach(fingerId => {
    // ... complex logic to build keyCapStates for each active finger ...
    // This will involve pathfinding from home key to target key.
    const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = {};
    requiredKeyCapIds.forEach((keyId: KeyCapId) => {
        // Simplified for now
        const stateForKey = keyCapStates[keyId];
        if(stateForKey) {
            stateForKey.visibility = 'VISIBLE';
            stateForKey.navigationRole = 'TARGET';
            stateForKey.pressResult = 'NEUTRAL';
            stateForKey.navigationArrow = 'NONE';
        }
    })

    if (finalViewModel[fingerId]) {
      finalViewModel[fingerId].keyCapStates = keyCapStates;
    }
  });


  // Step 4: Assemble and return the final ViewModel
  // The placeholder logic above is a temporary stand-in.
  // The full implementation will be required.
  return finalViewModel;
}


/**
 * Returns a completely idle view model.
 * @returns A HandsSceneViewModel where all fingers are IDLE.
 */
function getIdleViewModel(): HandsSceneViewModel {
  const idleState: FingerState = 'IDLE';
  return {
    L1: { fingerState: idleState }, L2: { fingerState: idleState }, L3: { fingerState: idleState }, L4: { fingerState: idleState }, L5: { fingerState: idleState }, LB: { fingerState: idleState },
    R1: { fingerState: idleState }, R2: { fingerState: idleState }, R3: { fingerState: idleState }, R4: { fingerState: idleState }, R5: { fingerState: idleState }, RB: { fingerState: idleState },
  };
}
