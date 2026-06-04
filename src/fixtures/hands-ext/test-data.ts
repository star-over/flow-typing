import { fingerLayoutASDF } from '@/data/layouts/finger-layout-asdf';
import { physicalLayoutANSI } from '@/data/layouts/physical-layout-ansi';
import { createKeyCoordinateMap } from '@/lib/layout-utils';
import { createKeyboardGraph } from '@/lib/pathfinding';

export const fingerLayout = fingerLayoutASDF;
export const physicalLayout = physicalLayoutANSI;
export const keyboardGraph = createKeyboardGraph(physicalLayoutANSI);
export const keyCoordinateMap = createKeyCoordinateMap(physicalLayoutANSI);
