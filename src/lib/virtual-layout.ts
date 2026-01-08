/**
 * @file Утилиты для создания и манипуляции виртуальной раскладкой клавиатуры.
 * @description Содержит функции для построения `VirtualLayout`, которая является
 * финальной, обогащенной моделью клавиатуры для отображения в UI.
 */
import { ModifierKey } from "@/interfaces/types";
import { FingerLayout, KeyboardLayout, PhysicalKey, SymbolLayout, VirtualKey,VirtualLayout,  } from "@/interfaces/types";
import { getSymbol } from "@/lib/symbol-utils";

interface CreateVirtualLayoutOptions {
  keyboardLayout: KeyboardLayout;
  symbolLayout: SymbolLayout;
  fingerLayout: FingerLayout;
  activeModifiers?: ModifierKey[];
}

/**
 * Создает `VirtualLayout` путем объединения физического, символьного и пальцевого макетов.
 * @param options - Опции для создания виртуальной клавиатуры.
 * @param options.keyboardLayout Физический макет клавиатуры (расположение, размеры).
 * @param options.symbolLayout Символьный макет (какой символ на какой клавише).
 * @param options.fingerLayout Пальцевый макет (какой палец за какую клавишу отвечает).
 * @param [options.activeModifiers=[]] Список активных клавиш-модификаторов.
 * @returns `VirtualLayout` (двумерный массив `VirtualKey`), готовый для рендеринга в UI.
 */
export function createVirtualLayout(
  options: CreateVirtualLayoutOptions
): VirtualLayout {
  const { keyboardLayout, symbolLayout, fingerLayout, activeModifiers = [] } = options;

  const virtualLayout: VirtualLayout = keyboardLayout
    .map((row: PhysicalKey[], rowIndex: number) => {
      return row.map((physicalKey: PhysicalKey, colIndex: number): VirtualKey => {
        const keyCapId = physicalKey.keyCapId;
        const symbol = getSymbol(keyCapId, activeModifiers, symbolLayout);
        const fingerKey = fingerLayout[physicalKey.keyCapId];

        const virtualKey: VirtualKey = {
          ...physicalKey,
          rowIndex,
          colIndex,
          symbol: symbol || "...",
          fingerId: fingerKey?.fingerId || "L1",
          isHomeKey: fingerKey?.isHomeKey,
        };

        return virtualKey;
      });
    });

  return virtualLayout;
}
