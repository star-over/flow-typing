import { StreamSymbol, FlowLineSymbolType } from '@/interfaces/types';
import { nbsp, sp } from '@/lib/utils';

/**
 * Determines the visual state (symbolType) of a stream symbol based on its attempts.
 */
export function getSymbolType(symbol: StreamSymbol): FlowLineSymbolType {
  const { attempts, targetSymbol } = symbol;

  if (!attempts || attempts.length === 0) {
    return "NONE";
  }

  const lastAttempt = attempts.at(-1)!;
  const isCorrect = lastAttempt.typedSymbol === targetSymbol;

  if (isCorrect) {
    // If the last attempt is correct, it's either CORRECT (1st try) or FIXED (after errors).
    return attempts.length > 1 ? "FIXED" : "CORRECT";
  } else {
    // If the last attempt is incorrect, it's either an ERROR (1st try) or ERRORS (multiple).
    return attempts.length > 1 ? "ERRORS" : "ERROR";
  }
}

/**
 * Returns the character to be displayed, converting space to a non-breaking space.
 */
export const getSymbolChar = (symbol: { targetSymbol: string; }) =>
  symbol.targetSymbol === sp ? nbsp : symbol.targetSymbol;
