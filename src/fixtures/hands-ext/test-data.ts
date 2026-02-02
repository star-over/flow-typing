import { fingerLayoutASDF } from '@/data/layouts/finger-layout-asdf';
import { keyboardLayoutANSI } from '@/data/layouts/keyboard-layout-ansi';
import { createKeyCoordinateMap } from '@/lib/layout-utils';
import { createKeyboardGraph } from '@/lib/pathfinding';

export const fingerLayout = fingerLayoutASDF;
export const keyboardLayout = keyboardLayoutANSI;
export const keyboardGraph = createKeyboardGraph(keyboardLayoutANSI);
export const keyCoordinateMap = createKeyCoordinateMap(keyboardLayoutANSI);
