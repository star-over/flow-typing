import { StreamSymbol, KeyCapPressResult } from "@/interfaces/types";
import { areKeyCapIdArraysEqual } from "./symbol-utils";

/**
 * Determines the visual feedback result of the last typing attempt for a given symbol.
 *
 * @param currentStreamSymbol The stream symbol to evaluate, which contains the target keys and all user attempts.
 * @returns {KeyCapPressResult} - 'CORRECT' if the last attempt matches the target,
 * 'ERROR' if it does not, and 'NONE' if there have been no attempts yet.
 */
export function getPressResult(currentStreamSymbol: StreamSymbol | undefined): KeyCapPressResult {
    if (!currentStreamSymbol) {
        return "NONE";
    }

    const lastAttempt = currentStreamSymbol.attempts[currentStreamSymbol.attempts.length - 1];

    if (!lastAttempt) {
        return "NONE";
    }

    const wasCorrect = areKeyCapIdArraysEqual(lastAttempt.pressedKeyCups, currentStreamSymbol.targetKeyCaps);

    return wasCorrect ? "CORRECT" : "ERROR";
}
