import {
  FingerId,
  FingerLayout,
  SymbolLayout,
  SymbolKey, // Changed from TargetSymbol
  HandStates,
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
 * Determines the state of each finger for the Hands component based on the target symbol.
 *
 * @param targetSymbol The symbol to be typed.
 * @param symbolLayout The layout mapping symbols to key caps.
 * @param fingerLayout The layout mapping key caps to fingers.
 * @returns A props object for the Hands component with finger states.
 */
export function getHandStates(
  targetSymbol: SymbolKey | undefined, // Changed from TargetSymbol
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

  const keyCapId = findKeyCapBySymbol(targetSymbol.symbol, symbolLayout);
  if (!keyCapId) {
    // might be a symbol that is not on the keyboard, like a special space or tab
    return handStates;
  }

  const activeFinger = getFingerByKeyCap(keyCapId, fingerLayout);
  if (!activeFinger) {
    return handStates;
  }

  handStates[activeFinger] = "ACTIVE";

  const isLeftHand = LEFT_HAND_FINGER_IDS.includes(activeFinger);
  const isRightHand = RIGHT_HAND_FINGER_IDS.includes(activeFinger);

  if (isLeftHand) {
    LEFT_HAND_FINGER_IDS.forEach((fingerId) => {
      if (fingerId !== activeFinger) {
        handStates[fingerId] = "INACTIVE";
      }
    });
  } else if (isRightHand) {
    RIGHT_HAND_FINGER_IDS.forEach((fingerId) => {
      if (fingerId !== activeFinger) {
        handStates[fingerId] = "INACTIVE";
      }
    });
  }

  // TODO: Handle shift key. If shift is needed, the opposite pinky should be active.

  return handStates;
}
