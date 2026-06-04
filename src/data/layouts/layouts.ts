import type { SymbolLayout, SymbolLayoutId } from '@/interfaces/types';
import { symbolLayoutQwerty } from './symbol-layout-qwerty';
import { symbolLayoutJcuken } from './symbol-layout-jcuken';

const symbolLayouts: Record<SymbolLayoutId, SymbolLayout> = {
  qwerty: symbolLayoutQwerty,
  йцукен: symbolLayoutJcuken,
};

export const getSymbolLayout = (
  layoutId: SymbolLayoutId = 'qwerty'
): SymbolLayout => {
  return symbolLayouts[layoutId];
};
