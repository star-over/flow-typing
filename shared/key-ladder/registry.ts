/**
 * @file Реестр KeyLadder по раскладкам. Пока одна — йцукен; qwerty добавится
 * рукотворной лестницей, когда дойдём до латиницы.
 */
import type { KeyLadder } from './types.ts';
import { jcukenKeyLadder } from './jcuken.ts';

const LADDERS: Record<string, KeyLadder> = {
  'йцукен': jcukenKeyLadder,
};

export function getKeyLadder(symbolLayoutId: string): KeyLadder {
  const ladder = LADDERS[symbolLayoutId];
  if (!ladder) throw new Error(`нет KeyLadder для раскладки: ${symbolLayoutId}`);
  return ladder;
}
