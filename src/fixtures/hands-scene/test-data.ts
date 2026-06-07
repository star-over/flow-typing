import { getFingerLayout, getPhysicalLayout } from '@/lib/layouts';
import { createKeyCoordinateMap } from '@/lib/layout-utils';
import { createKeyboardGraph } from '@/lib/pathfinding';

const fingerLayoutASDF = getFingerLayout('asdf');
const physicalLayoutANSI = getPhysicalLayout('ansi');

export const fingerLayout = fingerLayoutASDF;
export const physicalLayout = physicalLayoutANSI;
export const keyboardGraph = createKeyboardGraph(physicalLayoutANSI);
export const keyCoordinateMap = createKeyCoordinateMap(physicalLayoutANSI);
