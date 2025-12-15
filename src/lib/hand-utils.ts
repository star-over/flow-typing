import {
  FingerId,
  FingerLayout,
  SymbolLayout,
  SymbolKey,
  HandStates,
  TypedKey,
  LEFT_HAND_FINGER_IDS,
  RIGHT_HAND_FINGER_IDS,
} from "@/interfaces/types";
import { findKeyCapBySymbol, getFingerByKeyCap } from "./symbol-utils";
import { KeyCapId } from "@/interfaces/key-cap-id";

/**
 * Determines if a finger belongs to the left hand.
 * @param fingerId The finger ID to check.
 * @returns True if the finger belongs to the left hand.
 */
export function isLeftHandFinger(fingerId: FingerId): fingerId is typeof LEFT_HAND_FINGER_IDS[number] {
  return LEFT_HAND_FINGER_IDS.includes(fingerId as typeof LEFT_HAND_FINGER_IDS[number]);
}

/**
 * Determines if a finger belongs to the right hand.
 * @param fingerId The finger ID to check.
 * @returns True if the finger belongs to the right hand.
 */
export function isRightHandFinger(fingerId: FingerId): fingerId is typeof RIGHT_HAND_FINGER_IDS[number] {
  return RIGHT_HAND_FINGER_IDS.includes(fingerId as typeof RIGHT_HAND_FINGER_IDS[number]);
}

/**
 * Initializes hand states with all fingers in IDLE state.
 * @returns A HandStates object with all fingers set to IDLE.
 */
function initializeHandStates(): HandStates {
  return {
    L1: "IDLE",
    L2: "IDLE",
    L3: "IDLE",
    L4: "IDLE",
    L5: "IDLE",
    LB: "IDLE",
    R1: "IDLE",
    R2: "IDLE",
    R3: "IDLE",
    R4: "IDLE",
    R5: "IDLE",
    RB: "IDLE",
  };
}

/**
 * Gets the target finger for a symbol.
 * @param targetSymbol The symbol to find the finger for.
 * @param symbolLayout The layout mapping symbols to key caps.
 * @param fingerLayout The layout mapping key caps to fingers.
 * @returns The finger ID for the target symbol, or undefined if not found.
 */
function getTargetFinger(
  targetSymbol: SymbolKey,
  symbolLayout: SymbolLayout,
  fingerLayout: FingerLayout
): FingerId | undefined {
  const targetKeyCapId = findKeyCapBySymbol(targetSymbol.symbol, symbolLayout);
  if (!targetKeyCapId) {
    return undefined;
  }

  return getFingerByKeyCap(targetKeyCapId, fingerLayout);
}

/**
 * Updates hand states based on error indication logic.
 * @param handStates The current hand states to update.
 * @param targetFinger The finger that should be active for the target symbol.
 * @param typedKey The key that was actually typed.
 * @param fingerLayout The layout mapping key caps to fingers.
 */
function updateHandStatesForError(
  handStates: HandStates,
  targetFinger: FingerId,
  typedKey: TypedKey,
  fingerLayout: FingerLayout
): void {
  const typedFinger = getFingerByKeyCap(typedKey.keyCapId, fingerLayout);

  // If we can determine the finger for the typed key
  if (typedFinger) {
    // Case 1: Error made by the same finger - no change to algorithm
    if (typedFinger === targetFinger) {
      // No change needed, keep the target finger as ACTIVE
      return;
    }
    // Case 2: Error made by different finger but same hand
    else if (
      (isLeftHandFinger(targetFinger) && isLeftHandFinger(typedFinger)) ||
      (isRightHandFinger(targetFinger) && isRightHandFinger(typedFinger))
    ) {
      // Mark the erroneous finger as INCORRECT
      handStates[typedFinger] = "INCORRECT";
      // Keep the correct finger as ACTIVE
    }
    // Case 3: Error made by different hand
    else {
      // Mark the entire erroneous hand as INCORRECT
      const isTypedLeftHand = isLeftHandFinger(typedFinger);
      const handFingerIds = isTypedLeftHand ? LEFT_HAND_FINGER_IDS : RIGHT_HAND_FINGER_IDS;

      handFingerIds.forEach((fingerId) => {
        handStates[fingerId] = "INCORRECT";
      });

      // Keep the correct finger as ACTIVE
      handStates[targetFinger] = "ACTIVE";
    }
  }
}

/**
 * Sets other fingers on the same hand as INACTIVE.
 * @param handStates The hand states to update.
 * @param targetFinger The finger that should remain ACTIVE.
 */
function setOtherFingersInactive(handStates: HandStates, targetFinger: FingerId): void {
  const isTargetLeftHand = isLeftHandFinger(targetFinger);
  const isTargetRightHand = isRightHandFinger(targetFinger);

  if (isTargetLeftHand) {
    LEFT_HAND_FINGER_IDS.forEach((fingerId) => {
      if (handStates[fingerId] === "IDLE") {
        handStates[fingerId] = "INACTIVE";
      }
    });
  } else if (isTargetRightHand) {
    RIGHT_HAND_FINGER_IDS.forEach((fingerId) => {
      if (handStates[fingerId] === "IDLE") {
        handStates[fingerId] = "INACTIVE";
      }
    });
  }
}

/**
 * Determines the state of each finger for the Hands component based on the target symbol and typed key.
 *
 * @param targetSymbol The symbol to be typed.
 * @param typedKey The key that was actually typed (for error handling).
 * @param symbolLayout The layout mapping symbols to key caps.
 * @param fingerLayout The layout mapping key caps to fingers.
 * @returns A props object for the Hands component with finger states.
 */
export function getHandStates(
  targetSymbol: SymbolKey | undefined,
  typedKey: TypedKey | undefined,
  symbolLayout: SymbolLayout,
  fingerLayout: FingerLayout,
): HandStates {
  const handStates = initializeHandStates();

  // Handle case when there's no target symbol
  if (!targetSymbol) {
    return handStates;
  }

  // Get the target finger for the symbol
  const targetFinger = getTargetFinger(targetSymbol, symbolLayout, fingerLayout);
  if (!targetFinger) {
    return handStates;
  }

  // Set the correct finger as active
  handStates[targetFinger] = "ACTIVE";

  // Handle error indication logic
  if (typedKey && !typedKey.isCorrect) {
    updateHandStatesForError(handStates, targetFinger, typedKey, fingerLayout);
  }

  // Set other fingers on the same hand as INACTIVE
  setOtherFingersInactive(handStates, targetFinger);

  // TODO: Handle shift key. If shift is needed, the opposite pinky should be active.

  return handStates;
}

/**
 * Retrieves all keyCapIds associated with a given fingerId.
 * @param fingerId The ID of the finger.
 * @param fingerLayout The FingerLayout array.
 * @returns An array of KeyCapIds associated with the finger.
 */
export function getKeyCapIdsByFingerId(
  fingerId: FingerId,
  fingerLayout: FingerLayout
): KeyCapId[] {
  return fingerLayout
    .filter((fingerKey) => fingerKey.fingerId === fingerId)
    .map((fingerKey) => fingerKey.keyCapId);
}
