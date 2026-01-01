/**
 * @file Основной компонент `Trainer` для тренировки слепой печати.
 * @description Этот компонент управляет логикой тренировки, обрабатывает
 * ввод пользователя, обновляет состояние упражнения и координирует
 * отображение `FlowLine` и `HandsExt`.
 */
import { JSX, useReducer } from "react";

import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { FingerId, KeyCapId, TypedKey } from "@/interfaces/types";
import { getFingerByKeyCap,getKeyCapIdsForChar, isShiftRequired, isTextKey } from "@/lib/symbol-utils";
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
    if (isTextKey(e.code)) {
      e.stopPropagation();
      e.preventDefault();

      const { stream, cursorPosition } = state;
      const targetSymbol = stream[cursorPosition].targetSymbol;

      const requiredKeyCapIds = getKeyCapIdsForChar(targetSymbol);
      const primaryKey = requiredKeyCapIds?.find(id => !id.includes('Shift')) || requiredKeyCapIds?.[0];
      const shiftNeeded = isShiftRequired(targetSymbol);
      
      const isCorrect = e.code === primaryKey && e.shiftKey === shiftNeeded;

      const typedKey: TypedKey = {
        keyCapId: e.code,
        shift: e.shiftKey,
        isCorrect: isCorrect,
      };
      dispatch({ type: TrainerActionTypes.AddAttempt, payload: typedKey });
    }
  }

  // Генерируем `highlightedFingerKeys` для `HandsExt` на основе текущего целевого символа.
  const targetSymbol = state.stream[state.cursorPosition].targetSymbol;
  const requiredKeyCapIds = getKeyCapIdsForChar(targetSymbol) || [];

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
      <HandsExt
        highlightedFingerKeys={highlightedFingerKeys}
        handStates={state.handStates}
      />
    </div>
  )
}
