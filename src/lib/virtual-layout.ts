import { KeyCapId } from "@/interfaces/types";
import { KeyboardLayout, SymbolLayout, FingerLayout, VirtualLayout, PhysicalKey, VirtualKey, } from "@/interfaces/types";
import { getKeyCapIdsForChar, isShiftRequired } from "@/lib/symbol-utils";
import { getKeyCapIdsByFingerId } from "./hand-utils";


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
        const keyCapId = physicalKey.keyCapId;
        let symbol = "";

        // Reverse lookup: Find the symbol that corresponds to the physical key and shift state
        for (const [char, keyCapIds] of Object.entries(symbolLayout)) {
          const hasShift = keyCapIds.some(id => id.includes("Shift"));
          const primaryKey = keyCapIds.find(id => !id.includes("Shift"));

          if (primaryKey === keyCapId && hasShift === shift) {
            symbol = char;
            break;
          }
        }
        
        // Fallback for system keys or keys not in the current shift state
        if (!symbol) {
          for (const [char, keyCapIds] of Object.entries(symbolLayout)) {
            if (keyCapIds[0] === keyCapId && keyCapIds.length === 1) {
              symbol = char;
              break;
            }
          }
        }

        // Find the corresponding finger
        const fingerKey = fingerLayout[physicalKey.keyCapId];

        // Create the VirtualKey by merging properties and adding default UI states
        const virtualKey: VirtualKey = {
          // Base properties from the physical key
          ...physicalKey,
          rowIndex,
          colIndex,
          // Properties from the symbol layout
          symbol: symbol || "...",

          // Properties from the finger layout
          fingerId: fingerKey?.fingerId || "L1",
          isHomeKey: fingerKey?.isHomeKey,
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
export interface FindPathOptions {
  /** The physical layout of the keyboard (key positions, sizes). */
  keyboardLayout: KeyboardLayout;
  /** The layout of symbols on the keys. */
  symbolLayout: SymbolLayout;
  /** The layout of finger responsibilities for each key. */
  fingerLayout: FingerLayout;
  /** The target symbol to find the path for. */
  targetSymbol: string;
}

const findKeyInData = (layout: VirtualLayout, keyCapId: KeyCapId) => {
  for (const row of layout) {
    const key = row.find(k => k.keyCapId === keyCapId);
    if (key) {
      return key;
    }
  }
  return null;
};

/**
 * Creates a virtual keyboard layout where only the keys associated with the
 * finger for the target symbol are visible.
 *
 * @param {FindPathOptions} options
 * @returns {VirtualLayout} A new virtual layout with updated key visibility.
 */
export function findPath(options: FindPathOptions): VirtualLayout {
  const { keyboardLayout, symbolLayout, fingerLayout, targetSymbol } = options;

  // If the target symbol is null/undefined, return a default layout.
  if (!targetSymbol) {
    console.warn(`targetSymbol is missing.`);
    return createVirtualLayout({ keyboardLayout, symbolLayout, fingerLayout });
  }

  const keyCapIds = getKeyCapIdsForChar(targetSymbol);
  if (!keyCapIds) {
    console.warn(`KeyCapIds for symbol "${targetSymbol}" not found.`);
    return createVirtualLayout({ keyboardLayout, symbolLayout, fingerLayout });
  }

  const targetKeyCapId = keyCapIds.find(id => !id.includes('Shift')) || keyCapIds[0];
  const shift = isShiftRequired(targetSymbol);

  // 1. Find the finger responsible for the target key
  const targetFingerKey = fingerLayout[targetKeyCapId];

  if (!targetFingerKey) {
    console.warn(`Finger for keyCapId "${targetKeyCapId}" not found.`);
    return createVirtualLayout({ keyboardLayout, symbolLayout, fingerLayout, shift: shift });
  }

  // 2. Get all key IDs associated with that finger
  const keyCapIdsForTargetFinger = getKeyCapIdsByFingerId(targetFingerKey.fingerId, fingerLayout);

  const homeKeyCapId = (Object.entries(fingerLayout).find(
    ([, fingerKey]) => fingerKey.isHomeKey && fingerKey.fingerId === targetFingerKey.fingerId
  )?.[0]) as KeyCapId | undefined;


  // 3. Create the base virtual layout
  const virtualLayout = createVirtualLayout({
    keyboardLayout,
    symbolLayout,
    fingerLayout,
    shift: shift,
  });

  // 4. Pathfinding
  const pathKeyCapIds: KeyCapId[] = [];
  if (homeKeyCapId) {
    const homeKey = findKeyInData(virtualLayout, homeKeyCapId);
    const targetKey = findKeyInData(virtualLayout, targetKeyCapId);

    if (homeKey && targetKey && homeKey.rowIndex !== undefined && homeKey.colIndex !== undefined && targetKey.rowIndex !== undefined && targetKey.colIndex !== undefined) {
      // Vertical path
      const startRow = Math.min(homeKey.rowIndex, targetKey.rowIndex);
      const endRow = Math.max(homeKey.rowIndex, targetKey.rowIndex);
      for (let i = startRow; i <= endRow; i++) {
        const key = virtualLayout[i][homeKey.colIndex];
        if (key) {
          pathKeyCapIds.push(key.keyCapId);
        }
      }

      // Horizontal path
      const startCol = Math.min(homeKey.colIndex, targetKey.colIndex);
      const endCol = Math.max(homeKey.colIndex, targetKey.colIndex);
      for (let i = startCol; i <= endCol; i++) {
        const key = virtualLayout[targetKey.rowIndex][i];
        if (key) {
          pathKeyCapIds.push(key.keyCapId);
        }
      }
    }
  }


  // 5. Update visibility and navigation roles for the keys
  const layoutWithVisibility = virtualLayout.map((row) =>
    row.map(
      (virtualKey): VirtualKey => {
        const isTarget = virtualKey.keyCapId === targetKeyCapId;
        const isHome = virtualKey.keyCapId === homeKeyCapId;
        const isPath = pathKeyCapIds.includes(virtualKey.keyCapId) && !isTarget && !isHome;

        return {
          ...virtualKey,
          visibility: keyCapIdsForTargetFinger.includes(virtualKey.keyCapId)
            ? "VISIBLE"
            : "INVISIBLE",
          navigationRole: isTarget
            ? "TARGET"
            : isHome
              ? "HOME"
              : isPath
                ? "PATH"
                : "IDLE",
        }
      }
    )
  );

  return layoutWithVisibility;
};


export function findKeyInLayout(layout: VirtualLayout, keyCapId: KeyCapId): VirtualKey | null {
  for (const row of layout) {
    const key = row.find(k => k.keyCapId === keyCapId);
    if (key) {
      return key;
    }
  }
  return null;
}

export function getPathKeyCapIds(
  virtualLayout: VirtualLayout,
  homeKeyCapId: KeyCapId,
  targetKeyCapId: KeyCapId
): KeyCapId[] {
  const pathKeyCapIds: KeyCapId[] = [];
  const homeKey = findKeyInLayout(virtualLayout, homeKeyCapId);
  const targetKey = findKeyInLayout(virtualLayout, targetKeyCapId);

  if (homeKey && targetKey && homeKey.rowIndex !== undefined && homeKey.colIndex !== undefined && targetKey.rowIndex !== undefined && targetKey.colIndex !== undefined) {
    // Vertical path
    const startRow = Math.min(homeKey.rowIndex, targetKey.rowIndex);
    const endRow = Math.max(homeKey.rowIndex, targetKey.rowIndex);
    for (let i = startRow; i <= endRow; i++) {
      const key = virtualLayout[i][homeKey.colIndex];
      if (key) {
        pathKeyCapIds.push(key.keyCapId);
      }
    }

    // Horizontal path
    const startCol = Math.min(homeKey.colIndex, targetKey.colIndex);
    const endCol = Math.max(homeKey.colIndex, targetKey.colIndex);
    for (let i = startCol; i <= endCol; i++) {
      const key = virtualLayout[targetKey.rowIndex][i];
      if (key) {
        pathKeyCapIds.push(key.keyCapId);
      }
    }
  }

  return pathKeyCapIds;
}
