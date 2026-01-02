/**
 * @file Компонент `TrainingScene` для отображения основной сцены тренировки.
 * @description Этот компонент является контейнером, который управляет состоянием
 * тренировки с помощью XState-актора и отображает основные UI-элементы:
 * `FlowLine`, `HandsExt` и кнопки управления тренировкой.
 */
import { useSelector } from "@xstate/react";
import { useEffect } from "react";
import type { ActorRefFrom } from "xstate";

import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { FingerId, FingerState, KeyCapId } from "@/interfaces/types";
import { getFingerByKeyCap,getKeyCapIdsForChar } from "@/lib/symbol-utils";
import { trainingMachine } from "@/machines/training.machine";

import { FlowLine } from "./flow-line";
import { HandsExt } from "./hands-ext";

/** Идентификаторы всех пальцев, включая основания кистей. */
const ALL_FINGER_IDS: FingerId[] = ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5", "LB", "RB"];

/** Пропсы для компонента `TrainingScene`. */
type TrainingSceneProps = {
  /** Актор (живой экземпляр) запущенной `trainingMachine`. */
  actor: ActorRefFrom<typeof trainingMachine>;
};

/**
 * Компонент `TrainingScene` отрисовывает основную сцену тренировки слепой печати.
 * Он подключается к XState-машине `trainingMachine` для получения состояния
 * и отправки событий, а также отображает `FlowLine`, `HandsExt` и элементы управления.
 * @param props Пропсы компонента.
 * @param props.actor Актор `trainingMachine`.
 * @returns Элемент JSX, представляющий тренировочную сцену.
 */
export const TrainingScene = ({ actor }: TrainingSceneProps) => {
  const state = useSelector(actor, (snapshot) => snapshot);
  const send = actor.send;
  const { stream, currentIndex, targetFingerId } = state.context;

  // Генерируем `highlightedFingerKeys` для `HandsExt` на основе текущего целевого символа.
  const targetSymbol = stream[currentIndex].targetSymbol;
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


  // Определяем состояния пальцев на основе `targetFingerId` из контекста машины состояний.
  const fingerStates: Partial<Record<FingerId, FingerState>> = {};
  ALL_FINGER_IDS.forEach(id => {
    fingerStates[id] = "IDLE";
  });
  if (targetFingerId) {
    fingerStates[targetFingerId] = "ACTIVE";
  }


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Отправляем событие только для одиночных символов, игнорируя служебные клавиши
      if (event.key.length === 1) {
        event.preventDefault(); // Предотвращаем действие браузера по умолчанию
        send({ type: 'KEY_PRESS', key: event.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [send]);

  return (
    <div className="flex flex-col items-center gap-8">
      <h2 className="text-2xl font-semibold">Training In Progress</h2>
      <p>
        Training Machine State: <code className="font-mono bg-gray-200 dark:bg-gray-800 p-1 rounded">{state.value.toString()}</code>
      </p>

      <FlowLine stream={stream} cursorPosition={currentIndex} />

      <HandsExt
        highlightedFingerKeys={highlightedFingerKeys}
        {...fingerStates}
      />

      {/* Кнопки для тестирования событий паузы/возобновления */}
      {state.matches('paused') ? (
        <button
          onClick={() => send({ type: 'RESUME_TRAINING' })}
          className="p-2 mt-4 bg-green-500 text-white rounded"
        >
          Resume
        </button>
      ) : (
        <button
          onClick={() => send({ type: 'PAUSE_TRAINING' })}
          className="p-2 mt-4 bg-yellow-500 text-white rounded"
        >
          Pause
        </button>
      )}
    </div>
  );
};
