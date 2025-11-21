import { KeyCapId } from "@/interfaces/key-cap-id";

export type KeyCapLabel = { symbol?: string };
export type KeyCapHomeKeyMarker = "BAR" | "DOT" | "NONE";
export type KeyCapNavigationRole = "IDLE" | "HOME" | "PATH" | "TARGET";
export type KeyCapPressResult = "NEUTRAL" | "CORRECT" | "INCORRECT";
export type KeyCapUnitWidth = "1U" | "1.25U" | "1.5U" | "1.75U" | "2U" | "5U";
export type KeyCapColorGroup = "PRIMARY" | "SECONDARY" | "ACCENT";
export type KeyCapSymbolSize = "MD" | "SM" | "XS";
export type Visibility = "INVISIBLE" | "VISIBLE";
export type FingerId =  "L5" | "L4" | "L3" | "L2" | "L1" | "LB" | "RB" | "R1" | "R2" | "R3" | "R4"| "R5" ;
export type FingerState = "IDLE" | "ACTIVE" | "INACTIVE" | "INCORRECT";
// export type HandSide = "LEFT" | "RIGHT";
export type FlowLineState = "START" | "TYPING" | "PAUSE" | "END"
export type FlowLineCursorType = "RECTANGLE" | "UNDERSCORE" | "VERTICAL"
export type FlowLineSymbolType = "NONE" | "CORRECT" | "INCORRECT" | "INCORRECTS" | "CORRECTED"
export type FlowLineSize = "XS" | "SM" | "MD" |"LG" | "XL"
export type FlowLineCursorMode = "HALF" | "THIRD" | "QUARTER" | "DINAMIC"


export type StreamAttempt = {
  typedSymbol: string;
  startAt: number;
  endAt: number;
};

export type StreamSymbol = {
  targetSymbol: string;
  attempts?: StreamAttempt[];
};

export type TypingStream = StreamSymbol[];

export type PhysicalKey = {
  keyCapId: KeyCapId;
  unitWidth?: KeyCapUnitWidth;
  symbolSize?: KeyCapSymbolSize;
  homeKeyMarker?: KeyCapHomeKeyMarker;
  colorGroup?: KeyCapColorGroup;
};
export type KeyboardLayout =  PhysicalKey[][];

export type FingerKey = {
  keyCapId: KeyCapId;
  fingerId: FingerId;
  isHomeKey?: boolean;
};
export type FingerLayout = FingerKey[];

export type SymbolKey = {
  keyCapId: KeyCapId;
  symbol: string;
  shift: boolean;
};
export type SymbolLayout = SymbolKey[];

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
