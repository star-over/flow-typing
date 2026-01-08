/**
 * @file Основной компонент `Trainer` для тренировки слепой печати.
 * @description Этот компонент управляет логикой тренировки, обрабатывает
 * ввод пользователя, обновляет состояние упражнения и координирует
 * отображение `FlowLine` и `HandsExt`.
 */
import { JSX, useReducer } from "react";

import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { FingerId, KeyCapId, TypedKey } from "@/interfaces/types";
import { HandsSceneViewModel, KeySceneState } from "@/interfaces/types";
import { getFingerByKeyCap,getKeyCapIdsForChar, isModifierKey,isShiftRequired } from "@/lib/symbol-utils";
import {
  initialTrainerState,
  reducer,
  TrainerActionTypes,
} from "@/store/trainer-store";

import { FlowLine } from "./flow-line";
import { HandsExt } from "./hands-ext";

/** Пропсы для компонента `Trainer`. */
export type TrainerProps = React.ComponentProps<"div">

/**
 * Компонент `Trainer` предоставляет интерфейс для тренировки слепой печати.
 * Он обрабатывает события клавиатуры, управляет состоянием потока ввода
 * и отображает визуальную обратную связь через `FlowLine` и `HandsExt`.
 * @param props Пропсы компонента.
 * @param props.className Дополнительные классы CSS для корневого элемента.
 * @returns Элемент JSX, представляющий тренировочный интерфейс.
 */
export function Trainer(
  { className, ...props }: TrainerProps
): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialTrainerState)

  /**
   * Обработчик события `onKeyDownCapture` для перехвата нажатий клавиш.
   * Оценивает правильность нажатия и обновляет состояние тренировки.
   * @param e Объект события клавиатуры.
   */
  const handleOnKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isModifierKey(e.code, keyboardLayoutANSI)) {
      e.stopPropagation();
      e.preventDefault();

      const { stream, cursorPosition } = state;
      const targetSymbol = stream[cursorPosition].targetSymbol;

      const requiredKeyCapIds = getKeyCapIdsForChar(targetSymbol, symbolLayoutEnQwerty);
      const primaryKey = requiredKeyCapIds?.find(id => !id.includes('Shift')) || requiredKeyCapIds?.[0];
      const shiftNeeded = isShiftRequired(targetSymbol, symbolLayoutEnQwerty);
      
      const isCorrect = e.code === primaryKey && e.shiftKey === shiftNeeded;

      const typedKey: TypedKey = {
        keyCapId: e.code as KeyCapId,
        shift: e.shiftKey,
        isCorrect: isCorrect,
      };
      dispatch({ type: TrainerActionTypes.AddAttempt, payload: typedKey });
    }
  }

  // Генерируем `highlightedFingerKeys` для `HandsExt` на основе текущего целевого символа.
  const targetSymbol = state.stream[state.cursorPosition].targetSymbol;
  const requiredKeyCapIds = getKeyCapIdsForChar(targetSymbol, symbolLayoutEnQwerty) || [];

  const highlightedFingerKeys: Partial<Record<FingerId, KeyCapId[]>> = {};
  requiredKeyCapIds.forEach(keyCapId => {
    const fingerId = getFingerByKeyCap(keyCapId, fingerLayoutASDF);
    if (fingerId) {
      if (!highlightedFingerKeys[fingerId]) {
        highlightedFingerKeys[fingerId] = [];
      }
      highlightedFingerKeys[fingerId]?.push(keyCapId);
    }
  });

  // Construct the viewModel for HandsExt
  const viewModel: HandsSceneViewModel = {} as HandsSceneViewModel;
  for (const fingerId in state.handStates) {
    viewModel[fingerId as FingerId] = {
      fingerState: state.handStates[fingerId as FingerId],
    };
  }

  for (const fingerIdStr in highlightedFingerKeys) {
    const fingerId = fingerIdStr as FingerId;
    const keyCapIds = highlightedFingerKeys[fingerId];
    if (keyCapIds && viewModel[fingerId]) {
      const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = {};
      keyCapIds.forEach(keyId => {
        keyCapStates[keyId] = {
          visibility: 'VISIBLE',
          navigationRole: 'TARGET',
          pressResult: 'NEUTRAL',
          navigationArrow: 'NONE',
        };
      });
      viewModel[fingerId].keyCapStates = keyCapStates;
    }
  }

  return (
    <div
      id="trainer-frame"
      tabIndex={0} // Делаем div фокусируемым для приема событий клавиатуры
      onKeyDownCapture={handleOnKey}
      className={className}
      role="textbox" // Changed role to textbox
      {...props}
    >
      <FlowLine stream={state.stream} cursorPosition={state.cursorPosition} />
      <HandsExt viewModel={viewModel} />
    </div>
  )
}
