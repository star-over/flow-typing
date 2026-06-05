/**
 * @file Сборка `KeyboardSceneViewModel` — финальной render-готовой модели клавиатуры.
 * @description Объединяет три раскладки-источника (Physical, Symbol, Finger) в одну
 * плоскую сцену, которую отрисовывает компонент `KeyboardScene.svelte`. Это не «слой»
 * (как `*Layout`), а его производное — артефакт для UI.
 */
import type {
  FingerId,
  FingerLayout,
  HandsSceneViewModel,
  KeyCapId,
  KeyboardSceneKey,
  KeyboardSceneViewModel,
  KeySceneState,
  PhysicalKey,
  PhysicalLayout,
  SymbolLayout,
  Visibility,
} from "@/interfaces/types";
import { getHomeKeyForFinger } from "@/lib/hand-utils";
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

interface CreateKeyboardSceneForFingerOptions {
  fingerId: FingerId;
  viewModel: HandsSceneViewModel;
  fingerLayout: FingerLayout;
  physicalLayout: PhysicalLayout;
}

/**
 * Создаёт клавиатурную сцену, адаптированную под конкретный палец, на основе общей сцены рук.
 * Определяет, какие клавиши должны быть видимыми и каково их состояние (TARGET, PATH, …)
 * для данного пальца — на выходе только клавиши его кластера обогащены сценическим состоянием.
 *
 * @returns `KeyboardSceneViewModel` — двумерная сцена, где каждая клавиша несёт состояние для рендера.
 */
export const createKeyboardSceneForFinger = ({
  fingerId,
  viewModel,
  fingerLayout,
  physicalLayout,
}: CreateKeyboardSceneForFingerOptions): KeyboardSceneViewModel => {
  // Получаем состояние сцены конкретно для текущего пальца
  const fingerSceneState = viewModel[fingerId];
  // Извлекаем состояния колпачков клавиш для этого пальца, по умолчанию пустой объект, если их нет
  const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> =
    fingerSceneState.keyCapStates || {};

  const homeKeyForFinger = getHomeKeyForFinger({ fingerId, fingerLayout });

  // Проходим по физической геометрии ANSI, чтобы построить сцену для пальца
  return physicalLayout.map((row, rowIndex) =>
    row.map((physicalKey): KeyboardSceneKey => {
      const { keyCapId } = physicalKey;
      // Получаем конкретное состояние для этого колпачка клавиши из состояния сцены пальца
      const keyCapState = keyCapStates[keyCapId];

      // Определяем видимость: клавиша видима, если у нее есть определенное состояние в viewModel для этого пальца
      const isVisible = !!keyCapState;
      const visibility: Visibility = isVisible ? "VISIBLE" : "INVISIBLE";

      return {
        ...physicalKey,
        rowIndex,
        colIndex: 0, // colIndex не используется в текущей логике макета для этого компонента
        symbol: keyCapId, // Заполнитель, компонент KeyboardScene рассчитает фактический отображаемый символ
        fingerId: fingerId, // Присваиваем идентификатор пальца, с запасным значением
        isHomeKey: keyCapId === homeKeyForFinger, // Отмечаем, является ли это "домашней" клавишей для этого пальца
        // Динамические свойства из ViewModel
        visibility: visibility,
        navigationRole: keyCapState?.navigationRole || "NONE", // Роль (TARGET, PATH, NONE)
        navigationArrow: keyCapState?.navigationArrow || "NONE", // Направление стрелки для навигации
        pressResult: keyCapState?.pressResult || "NONE", // Результат нажатия клавиши (CORRECT, INCORRECT, NEUTRAL)
      };
    }),
  );
};
