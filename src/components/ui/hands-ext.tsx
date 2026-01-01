import React from 'react';
import { VirtualKeyboard } from './virtual-keyboard';
import { Hands } from './hands';
import { FingerId, KeyCapId, VirtualLayout, VirtualKey, HandStates } from '@/interfaces/types';
import { fingerLayoutASDF } from '@/data/finger-layout-asdf';
import { keyboardLayoutANSI } from '@/data/keyboard-layout-ansi';
import { symbolLayoutEnQwerty } from '@/data/symbol-layout-en-qwerty';

// Helper to get symbol for a KeyCapId based on shift state
const getSymbolForKeyCapId = (keyCapId: KeyCapId, shift: boolean): string => {
  for (const [symbolChar, keyCapIds] of Object.entries(symbolLayoutEnQwerty)) {
    const hasShift = keyCapIds.some(id => id.includes("Shift"));
    const primaryKey = keyCapIds.find(id => !id.includes("Shift"));

    if ((primaryKey === keyCapId || keyCapIds[0] === keyCapId) && hasShift === shift) {
      return symbolChar;
    }
  }
  // Fallback for system keys or if not found
  return "";
};

// Helper to generate a VirtualLayout for a specific finger's keyboard
const getFingerVirtualLayout = (
  fingerId: FingerId,
  highlightedKeys: KeyCapId[],
): VirtualLayout => {
  const fingerLayoutAsdfEntries = Object.entries(fingerLayoutASDF);
  const virtualLayout: VirtualLayout = keyboardLayoutANSI.map((row, rowIndex) => {
    return row.map((physicalKey, colIndex): VirtualKey => {
      const keyCapId = physicalKey.keyCapId;
      const fingerData = fingerLayoutAsdfEntries.find(
        ([kId]) => kId === keyCapId,
      )?.[1];

      const isKeyForCurrentFinger = fingerData && fingerData.fingerId === fingerId;
      const isHighlighted = highlightedKeys.includes(keyCapId);
      const isShift = keyCapId.includes("Shift"); // Assuming Shift key logic

      const symbol = getSymbolForKeyCapId(keyCapId, isShift);


      return {
        ...physicalKey,
        rowIndex,
        colIndex,
        symbol: symbol || " ", // Fallback symbol
        fingerId: fingerData?.fingerId || 'L1', // Default or actual fingerId
        isHomeKey: fingerData?.isHomeKey,
        visibility: (isKeyForCurrentFinger && isHighlighted) ? 'VISIBLE' : 'INVISIBLE',
        navigationRole: (isKeyForCurrentFinger && isHighlighted) ? 'TARGET' : 'IDLE',
      };
    });
  });
  return virtualLayout;
};

interface HandsExtProps {
  // A map where key is FingerId and value is an array of KeyCapIds that should be highlighted for that finger
  highlightedFingerKeys: Partial<Record<FingerId, KeyCapId[]>>;
  // Other props for Hands, if any
  handStates: HandStates;
}

export const HandsExt: React.FC<HandsExtProps> = ({ highlightedFingerKeys, handStates }) => {
  const fingerIds: FingerId[] = [
    'L5', 'L4', 'L3', 'L2', 'L1',
    'R1', 'R2', 'R3', 'R4', 'R5',
  ];

  return (
    <div className="relative w-full h-full">
      {fingerIds.map((fingerId) => {
        const fingerHighlightedKeys = highlightedFingerKeys[fingerId] || [];
        const fingerVirtualLayout = getFingerVirtualLayout(fingerId, fingerHighlightedKeys);

        return (
          <VirtualKeyboard
            key={fingerId}
            virtualLayout={fingerVirtualLayout}
            className="absolute top-0 left-0 w-full h-full"
          />
        );
      })}
      <Hands {...handStates} />
    </div>
  );
};


