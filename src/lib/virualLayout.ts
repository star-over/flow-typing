/**
 * Creates a VirtualKeyboard by merging the physical, symbol, and finger layouts.
 *
 * @param {KeyboardLayout} keyboardLayout The physical layout of the keyboard (key positions, sizes).
 * @param {SymbolLayout} symbolLayout The layout of symbols on the keys.
 * @param {FingerLayout} fingerLayout The layout of finger responsibilities for each key.
 * @param {boolean} shift Status of the `Shift` modifier.
 * @returns {VirtualKeyboard} A VirtualKeyboard, which is a 2D array of VirtualKey objects ready for UI rendering.
 */
export function createVirtualKeyboard(
  keyboardLayout: KeyboardLayout,
  symbolLayout: SymbolLayout,
  fingerLayout: FingerLayout,
  shift: boolean,
): VirtualKeyboard {
  const virtualKeyboard: VirtualKeyboard = keyboardLayout.map((row: PhysicalKey[]) => {
    return row.map((physicalKey: PhysicalKey): VirtualKey => {
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

        // Properties from the symbol layout
        symbol: symbolKey!.symbol,

        // Properties from the finger layout
        fingerId: fingerKey!.fingerId,
      };

      return virtualKey;
    });
  });

  return virtualKeyboard;
}
