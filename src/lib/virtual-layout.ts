import { KeyCapId } from "@/interfaces/key-cap-id";
import { KeyboardLayout, SymbolLayout, FingerLayout, VirtualLayout, PhysicalKey, VirtualKey, SymbolKey, FingerKey } from "@/interfaces/types";

interface CreateVirtualLayoutOptions {
  keyboardLayout: KeyboardLayout;
  symbolLayout: SymbolLayout;
  fingerLayout: FingerLayout;
  shift?: boolean; // Optional, with default
}

/**
 * Creates a VirtualKeyboard by merging the physical, symbol, and finger layouts.
 *
 * @param options - The options for creating the virtual keyboard.
 * @param options.keyboardLayout The physical layout of the keyboard (key positions, sizes).
 * @param options.symbolLayout The layout of symbols on the keys.
 * @param options.fingerLayout The layout of finger responsibilities for each key.
 * @param [options.shift=false] Status of the `Shift` modifier. Defaults to `false`.
 * @returns A VirtualKeyboard, which is a 2D array of VirtualKey objects ready for UI rendering.
 */
export function createVirtualLayout(
  options: CreateVirtualLayoutOptions
): VirtualLayout {
  const { keyboardLayout, symbolLayout, fingerLayout, shift = false } = options;

  const virtualLayout: VirtualLayout = keyboardLayout
    .map((row: PhysicalKey[], rowIndex: number) => {
      return row.map((physicalKey: PhysicalKey, colIndex: number): VirtualKey => {
        // Find the corresponding symbol by keyCapId and shift status
        let symbolKey: SymbolKey | undefined = symbolLayout.find(
          (sKey) => sKey.keyCapId === physicalKey.keyCapId && sKey.shift === shift
        );

        // If no symbol is found for the current shift state, fall back to the inverse shift state.
        // This ensures that keys defined only for one state (e.g., system keys) are always found.
        if (!symbolKey) {
          symbolKey = symbolLayout.find(
            (sKey) => sKey.keyCapId === physicalKey.keyCapId && sKey.shift === !shift
          );
        }

        // Find the corresponding finger
        const fingerKey: FingerKey | undefined = fingerLayout.find(
          (fKey) => fKey.keyCapId === physicalKey.keyCapId
        );

        // Create the VirtualKey by merging properties and adding default UI states
        const virtualKey: VirtualKey = {
          // Base properties from the physical key
          ...physicalKey,
          rowIndex,
          colIndex,
          // Properties from the symbol layout
          symbol: symbolKey?.symbol || "...",

          // Properties from the finger layout
          fingerId: fingerKey?.fingerId || "NONE",
        };

        return virtualKey;
      });
    });

  return virtualLayout;
}


/**
 * For performance-critical scenarios where this function might be called frequently,
 * consider creating a pre-computed Map from the symbolLayout for O(1) lookups
 * instead of using .find() which is O(n).
 */
export interface FindSymbolKeyBySymbolOptions {
  symbolLayout: SymbolLayout;
  keyboardLayout: KeyboardLayout;
  fingerLayout: FingerLayout;
  targetSymbol: string;
};

export function findPath(options: FindSymbolKeyBySymbolOptions) {
  const { keyboardLayout, symbolLayout, fingerLayout, targetSymbol } = options;
  const targetSymbolKey = symbolLayout.find((sKey) => sKey.symbol === targetSymbol)!;
  const targetFinger = fingerLayout.find((fKey) => fKey.keyCapId === targetSymbolKey.keyCapId);
  const targetKeyCaps = fingerLayout.filter((fKey) => fKey.fingerId === targetFinger?.fingerId);
  const targetKeyCapIds = targetKeyCaps.map((kKey) => kKey.keyCapId);
  const virtualLayout = createVirtualLayout({ keyboardLayout, symbolLayout, fingerLayout, shift: targetSymbolKey.shift });
  const virtualLayout2 = virtualLayout.map(
    (row: VirtualKey[]) => row.map(
      (vKey: VirtualKey) => ({
        ...vKey,
        visibility: targetKeyCapIds.includes(vKey.keyCapId)
          ? "VISIBLE"
          : "INVISIBLE"
      })
    )
  );

  return virtualLayout2;
};
