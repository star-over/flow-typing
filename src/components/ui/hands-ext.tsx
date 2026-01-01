/**
 * @file Компонент `HandsExt` объединяет виртуальную клавиатуру и визуализацию рук.
 * @description Этот компонент отображает 10 виртуальных клавиатур (по одной на каждый палец),
 * которые накладываются друг на друга. Только актуальные для текущего нажатия клавиши
 * отображаются как видимые, создавая иллюзию единой клавиатуры с подсветкой.
 * Также компонент визуализирует руки и пальцы в соответствии с их состоянием.
 */
import React from 'react';

import { fingerLayoutASDF } from '@/data/finger-layout-asdf';
import { keyboardLayoutANSI } from '@/data/keyboard-layout-ansi';
import { symbolLayoutEnQwerty } from '@/data/symbol-layout-en-qwerty';
import { FingerId, HandStates,KeyCapId, VirtualKey, VirtualLayout } from '@/interfaces/types';

import { Hands } from './hands';
import { VirtualKeyboard } from './virtual-keyboard';

/**
 * Получает символ для заданного `KeyCapId` с учетом состояния Shift.
 * @param keyCapId Идентификатор клавиши.
 * @param shift Флаг, указывающий, нажат ли Shift.
 * @returns Символ, соответствующий клавише, или пустая строка, если не найден.
 */
const getSymbolForKeyCapId = (keyCapId: KeyCapId, shift: boolean): string => {
  for (const [symbolChar, keyCapIds] of Object.entries(symbolLayoutEnQwerty)) {
    const hasShift = keyCapIds.some(id => id.includes("Shift"));
    const primaryKey = keyCapIds.find(id => !id.includes("Shift"));

    if ((primaryKey === keyCapId || keyCapIds[0] === keyCapId) && hasShift === shift) {
      return symbolChar;
    }
  }
  return "";
};

/**
 * Генерирует `VirtualLayout` для виртуальной клавиатуры конкретного пальца.
 * В этом макете видимы только те клавиши, которые принадлежат данному пальцу и подсвечены.
 * @param fingerId Идентификатор пальца, для которого генерируется макет.
 * @param highlightedKeys Массив `KeyCapId` клавиш, которые должны быть подсвечены.
 * @returns Объект `VirtualLayout`, готовый для передачи в `VirtualKeyboard`.
 */
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
      // Определение isShift должно быть более точным, основываясь на целевом символе, а не на самой клавише
      const isShift = keyCapId.includes("Shift"); 

      const symbol = getSymbolForKeyCapId(keyCapId, isShift);


      return {
        ...physicalKey,
        rowIndex,
        colIndex,
        symbol: symbol || " ",
        fingerId: fingerData?.fingerId || 'L1',
        isHomeKey: fingerData?.isHomeKey,
        visibility: (isKeyForCurrentFinger && isHighlighted) ? 'VISIBLE' : 'INVISIBLE',
        navigationRole: (isKeyForCurrentFinger && isHighlighted) ? 'TARGET' : 'IDLE',
      };
    });
  });
  return virtualLayout;
};

/** Пропсы для компонента `HandsExt`. */
interface HandsExtProps {
  /**
   * Карта, где ключ - `FingerId`, а значение - массив `KeyCapId`,
   * которые должны быть подсвечены для этого пальца.
   */
  highlightedFingerKeys: Partial<Record<FingerId, KeyCapId[]>>;
  /** Состояния всех пальцев и кистей для визуализации. */
  handStates: HandStates;
}

/**
 * Компонент `HandsExt` для расширенной визуализации клавиатуры и рук.
 * @param props Пропсы компонента.
 * @param props.highlightedFingerKeys Клавиши, которые должны быть подсвечены для каждого пальца.
 * @param props.handStates Текущие состояния пальцев и кистей.
 * @returns Элемент JSX, отображающий виртуальную клавиатуру для пальцев и сами руки.
 */
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


