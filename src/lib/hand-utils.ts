import {
  FingerId,
  FingerLayout,
  SymbolLayout,
  SymbolKey,
  HandStates,
  TypedKey,
} from "@/interfaces/types";
import { findKeyCapBySymbol, getFingerByKeyCap } from "./symbol-utils";

const LEFT_HAND_FINGER_IDS: FingerId[] = [
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "LB",
];
const RIGHT_HAND_FINGER_IDS: FingerId[] = [
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "RB",
];

/**
 * Determines if a finger belongs to the left hand.
 * @param fingerId The finger ID to check.
 * @returns True if the finger belongs to the left hand.
 */
export function isLeftHandFinger(fingerId: FingerId): boolean {
  return LEFT_HAND_FINGER_IDS.includes(fingerId);
}

/**
 * Determines if a finger belongs to the right hand.
 * @param fingerId The finger ID to check.
 * @returns True if the finger belongs to the right hand.
 */
export function isRightHandFinger(fingerId: FingerId): boolean {
  return RIGHT_HAND_FINGER_IDS.includes(fingerId);
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
  const handStates: HandStates = {
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

  if (!targetSymbol) {
    return handStates;
  }

  const targetKeyCapId = findKeyCapBySymbol(targetSymbol.symbol, symbolLayout);
  if (!targetKeyCapId) {
    // might be a symbol that is not on the keyboard, like a special space or tab
    return handStates;
  }

  const targetFinger = getFingerByKeyCap(targetKeyCapId, fingerLayout);
  if (!targetFinger) {
    return handStates;
  }

  // Set the correct finger as active
  handStates[targetFinger] = "ACTIVE";

  // Handle error indication logic
  if (typedKey && !typedKey.isCorrect) {
    const typedFinger = getFingerByKeyCap(typedKey.keyCapId, fingerLayout);

    // If we can determine the finger for the typed key
    if (typedFinger) {
      // Case 1: Error made by the same finger - no change to algorithm
      if (typedFinger === targetFinger) {
        // No change needed, keep the target finger as ACTIVE
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

  // Set other fingers on the same hand as INACTIVE
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

  // TODO: Handle shift key. If shift is needed, the opposite pinky should be active.

  return handStates;
}
