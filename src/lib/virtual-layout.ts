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
 * @param {CreateVirtualLayoutOptions} options - The options for creating the virtual keyboard.
 * @param {KeyboardLayout} options.keyboardLayout The physical layout of the keyboard (key positions, sizes).
 * @param {SymbolLayout} options.symbolLayout The layout of symbols on the keys.
 * @param {FingerLayout} options.fingerLayout The layout of finger responsibilities for each key.
 * @param {boolean} [options.shift=false] Status of the `Shift` modifier. Defaults to `false`.
 * @returns {VirtualKeyboard} A VirtualKeyboard, which is a 2D array of VirtualKey objects ready for UI rendering.
 */
export function createVirtualLayout(
  options: CreateVirtualLayoutOptions
): VirtualLayout {
  const { keyboardLayout, symbolLayout, fingerLayout, shift = false } = options;

  const virtualLayout: VirtualLayout = keyboardLayout
    .map((row: PhysicalKey[], rowIndex: number) => {
      return row.map((physicalKey: PhysicalKey, colIndex: number): VirtualKey => {
        // Find the corresponding symbol by keyCapId and shift status
        const symbolKey: SymbolKey | undefined = symbolLayout.find(
          (sKey) => sKey.keyCapId === physicalKey.keyCapId && sKey.shift === shift
        );

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
