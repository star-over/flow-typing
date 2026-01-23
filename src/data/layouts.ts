import { UserPreferences } from '@/interfaces/user-preferences';
import { SymbolLayout } from '@/interfaces/types';
import { symbolLayoutEnQwerty } from '@/data/symbol-layout-en';
import { symbolLayoutRu } from '@/data/symbol-layout-ru';

export const symbolLayouts: Record<UserPreferences['keyboardLayout'], SymbolLayout> = {
  qwerty: symbolLayoutEnQwerty,
  йцукен: symbolLayoutRu,
};

export const getSymbolLayout = (
  layout: UserPreferences['keyboardLayout'] = 'qwerty'
): SymbolLayout => {
  return symbolLayouts[layout];
};
