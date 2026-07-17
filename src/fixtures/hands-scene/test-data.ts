import { getFingerLayout, getPhysicalLayout, getSymbolLayout } from '@/lib/layouts';
import { createKeyboardGraph } from '@/lib/pathfinding';

const fingerLayoutASDF = getFingerLayout('asdf');
const physicalLayoutANSI = getPhysicalLayout('ansi');

export const fingerLayout = fingerLayoutASDF;
export const physicalLayout = physicalLayoutANSI;
export const symbolLayout = getSymbolLayout('qwerty');
export const keyboardGraph = createKeyboardGraph(physicalLayoutANSI);
