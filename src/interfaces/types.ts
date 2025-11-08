type KeyCapLabel = { symbol?: string };
type KeyCapHomeKeyMarker = "BAR" | "DOT" | "NONE";
type KeyCapNavigationRole = "IDLE" | "HOME" | "PATH" | "TARGET";
type KeyCapPressResult = "NEUTRAL" | "CORRECT" | "INCORRECT";
type KeyCapUnitWidth = "1U" | "1.25U" | "1.5U" | "1.75U" | "2U" | "5U";
type KeyCapColorGroup = "PRIMARY" | "SECONDARY" | "ACCENT";
type KeyCapSymbolSize = "MD" | "SM" | "XS";
type Visibility = "INVISIBLE" | "VISIBLE";
type Fingers = "L4" | "L3" | "L2" | "L1" | "L0" | "LB" | "RB" | "R0" | "R1" | "R2" | "R3" | "R4";
type Hands = "LeftHand" | "RightHand";
// todo change Hands to HandSide
// todo change Fingers to FingerName
// todo change FingerName from 1 to 5 instead from 0 to 4
// todo change remove KeyCapNavigationRole from Physical-Keyboard

type PhysicalKeyboardItem = {
  keyCapId: KeyEventCodes;
  unitWidth?: KeyCapUnitWidth;
  symbolSize?: KeyCapSymbolSize;
  homeKeyMarker?: KeyCapHomeKeyMarker;
  colorGroup?: KeyCapColorGroup;
};
type PhysicalKeyboard =  PhysicalKeyboardItem[][];

type FingerZoneItem = {
  keyCapId: KeyEventCodes;
  fingerId: Fingers;
  navigationRole?: KeyCapNavigationRole;
};
type FingerZones = FingerZoneItem[];

type SymbolLayoutItem = {
  keyCapId: KeyEventCodes;
  symbol: string;
  shift: boolean;
};
type SymbolLayout = SymbolLayoutItem[];
