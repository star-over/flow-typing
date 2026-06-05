/**
 * @file Сборка `KeyboardSceneViewModel` — финальной render-готовой модели клавиатуры.
 * @description Объединяет три раскладки-источника (Physical, Symbol, Finger) в одну
 * плоскую сцену, которую отрисовывает компонент `KeyboardScene.svelte`. Это не «слой»
 * (как `*Layout`), а его производное — артефакт для UI.
 */
import type { FingerLayout, PhysicalLayout, PhysicalKey, SymbolLayout, KeyboardSceneKey, KeyboardSceneViewModel } from "@/interfaces/types";
import { getLabel } from "@/lib/symbol-utils";

interface CreateKeyboardSceneOptions {
  physicalLayout: PhysicalLayout;
  symbolLayout: SymbolLayout;
  fingerLayout: FingerLayout;
}

/**
 * Строит `KeyboardSceneViewModel` для всей клавиатуры из трёх раскладок-источников.
 * @param options.physicalLayout Геометрия клавиш (форм-фактор).
 * @param options.symbolLayout Какой символ на какой клавише в выбранной раскладке.
 * @param options.fingerLayout Какой палец отвечает за какую клавишу.
 * @returns Двумерный массив `KeyboardSceneKey`, готовый для рендера.
 */
export function createKeyboardScene(
  options: CreateKeyboardSceneOptions
): KeyboardSceneViewModel {
  const { physicalLayout, symbolLayout, fingerLayout } = options;

  const keyboardScene: KeyboardSceneViewModel = physicalLayout
    .map((row: PhysicalKey[], rowIndex: number) => {
      return row.map((physicalKey: PhysicalKey, colIndex: number): KeyboardSceneKey => {
        const keyCapId = physicalKey.keyCapId;
        const symbol = getLabel(keyCapId, symbolLayout, physicalLayout);
        const fingerKey = fingerLayout.find((item) => item.keyCapId === physicalKey.keyCapId);

        const sceneKey: KeyboardSceneKey = {
          ...physicalKey,
          rowIndex,
          colIndex,
          symbol: symbol || "...",
          fingerId: fingerKey?.fingerId || "L1",
          isHomeKey: fingerKey?.isHomeKey,
        };

        return sceneKey;
      });
    });

  return keyboardScene;
}
