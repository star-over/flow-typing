import { KeyCapId } from "@/interfaces/key-cap-id";

export type KeyCapLabel = { symbol?: string };
export type KeyCapHomeKeyMarker = "BAR" | "DOT" | "NONE";
export type KeyCapNavigationRole = "IDLE" | "HOME" | "PATH" | "TARGET";
export type KeyCapPressResult = "NEUTRAL" | "CORRECT" | "INCORRECT";
export type KeyCapUnitWidth = "1U" | "1.25U" | "1.5U" | "1.75U" | "2U" | "5U";
export type KeyCapColorGroup = "PRIMARY" | "SECONDARY" | "ACCENT";
export type KeyCapType = "SYMBOL" | "SYSTEM" | "MODIFIER";
export type KeyCapSymbolSize = "MD" | "SM" | "XS";
export type Visibility = "INVISIBLE" | "VISIBLE";
// Define finger IDs as constants to avoid duplication
export const LEFT_HAND_FINGER_IDS = ["L1", "L2", "L3", "L4", "L5", "LB"] as const;
export const RIGHT_HAND_FINGER_IDS = ["R1", "R2", "R3", "R4", "R5", "RB"] as const;

// Create types from the constants
export type LeftHandFingerId = typeof LEFT_HAND_FINGER_IDS[number];
export type RightHandFingerId = typeof RIGHT_HAND_FINGER_IDS[number];

// Union of all finger IDs
export type FingerId = LeftHandFingerId | RightHandFingerId;

export type FingerState = "IDLE" | "ACTIVE" | "INACTIVE" | "INCORRECT";

// Union type for all hand finger IDs
export type HandFingerId = FingerId;
export type FlowLineState = "START" | "TYPING" | "PAUSE" | "END"
export type FlowLineCursorType = "RECTANGLE" | "UNDERSCORE" | "VERTICAL"
export type FlowLineSymbolType = "PENDING" | "CORRECT" | "INCORRECT" | "INCORRECTS" | "CORRECTED"
export type FlowLineSize = "XS" | "SM" | "MD" |"LG" | "XL"
export type FlowLineCursorMode = "HALF" | "THIRD" | "QUARTER" | "DINAMIC"

export type TypedKey = {
  keyCapId: KeyCapId;
  shift: boolean;
  isCorrect: boolean;
};

export type StreamAttempt = {
  typedKey: TypedKey;
  startAt: number;
  endAt: number;
};

export type StreamSymbol = {
  targetSymbol: string;
  attempts: StreamAttempt[];
};

export type TypingStream = StreamSymbol[];

export type PhysicalKey = {
  keyCapId: KeyCapId;
  unitWidth?: KeyCapUnitWidth;
  symbolSize?: KeyCapSymbolSize;
  homeKeyMarker?: KeyCapHomeKeyMarker;
  colorGroup?: KeyCapColorGroup;
  type: KeyCapType;
};
export type KeyboardLayout =  PhysicalKey[][];

export type FingerKey = {
  fingerId: FingerId;
  isHomeKey?: boolean;
};
export type FingerLayout = Partial<Record<KeyCapId, FingerKey>>;

export type SymbolLayout = Record<string, KeyCapId[]>;

export type VirtualKey = {
  // From PhysicalKey
  keyCapId: KeyCapId;
  unitWidth?: KeyCapUnitWidth;
  symbolSize?: KeyCapSymbolSize;
  homeKeyMarker?: KeyCapHomeKeyMarker;
  colorGroup?: KeyCapColorGroup;

  // From SymbolKey
  symbol: string;

  // From FingerKey
  fingerId: FingerId;
  isHomeKey?: boolean;

  // UI State
  rowIndex?: number,
  colIndex?: number,
  visibility?: Visibility;
  pressResult?: KeyCapPressResult;
  navigationRole?: KeyCapNavigationRole;
};
export type VirtualLayout = VirtualKey[][];

export type HandStates = {
  [F in FingerId]: FingerState;
};
