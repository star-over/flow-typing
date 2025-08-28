type KeyCapLabel = { symbol?: string };
type KeyCapHomeKeyMarker = "BAR" | "DOT" | "NONE";
type KeyCapNavigationRole = "IDLE" | "HOME" | "PATH" | "TARGET";
type KeyCapPressResult = "NEUTRAL" | "CORRECT" | "INCORRECT";
type KeyCapUnitWidth = "1U" | "1.25U" | "1.5U" | "1.75U" | "2U" | "5U";
type KeyCapColorGroup = "PRIMARY" | "SECONDARY" | "ACCENT";
type Visibility = "INVISIBLE" | "VISIBLE";
type Fingers = "L4" | "L3" | "L2" | "L1" | "L0" | "LB" | "RB" | "R0" | "R1" | "R2" | "R3" | "R4";
type Hands = "LeftHand" | "RightHand";

type PhysicalKeyboard = {
  name: string;
  keyCaps: {
    keyCapId: KeyEventCodes;
    unitWith?: KeyCapUnitWidth;
    navigationRole?: KeyCapNavigationRole;
    homeKeyMarker?: KeyCapHomeKeyMarker;
    colorGroup?: KeyCapColorGroup;
  }[][];
};

type FingerZones = {
  keyCapId: KeyEventCodes;
  fingerId: Fingers;
  navigationRole?: KeyCapNavigationRole;
}[];

type SymbolLayout = {
  keyCapId: KeyEventCodes,
  symbol: string,
  shift: boolean
}[];
