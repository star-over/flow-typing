import { useSelector } from "@xstate/react";
import type { ActorRefFrom } from "xstate";
import { useEffect } from "react";
import { FlowLine } from "./flow-line";
import { HandsExt } from "./hands-ext"; // Import HandsExt
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { FingerId, FingerState, KeyCapId, HandStates } from "@/interfaces/types";
import { trainingMachine } from "@/machines/training.machine";
import { getKeyCapIdsForChar, getFingerByKeyCap } from "@/lib/symbol-utils";

const ALL_FINGER_IDS: FingerId[] = ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5", "LB", "RB"];

// Определяем пропсы для компонента.
// Мы ожидаем получить актор (живой экземпляр) запущенной 'trainingMachine'.
type TrainingSceneProps = {
  actor: ActorRefFrom<typeof trainingMachine>;
};

export const TrainingScene = ({ actor }: TrainingSceneProps) => {
  // Подписываемся на состояние и получаем метод send для актора trainingMachine
  const state = useSelector(actor, (snapshot) => snapshot);
  const send = actor.send;
  const { stream, currentIndex, targetFingerId } = state.context; // Removed targetKeyCapId

  // Generate highlightedFingerKeys for HandsExt
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


  // Определяем состояния пальцев
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
      // console.log(event.key)
      if (event.key.length === 1) {
        event.preventDefault(); // Предотвращаем действие браузера по умолчанию
        send({ type: 'KEY_PRESS', key: event.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Очистка при размонтировании компонента
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [send]); // `send` стабилен, но лучше указать его в зависимостях

  return (
    <div className="flex flex-col items-center gap-8">
      <h2 className="text-2xl font-semibold">Training In Progress</h2>
      <p>
        Training Machine State: <code className="font-mono bg-gray-200 dark:bg-gray-800 p-1 rounded">{state.value.toString()}</code>
      </p>

      <FlowLine stream={stream} cursorPosition={currentIndex} />

      <HandsExt
        highlightedFingerKeys={highlightedFingerKeys}
        handStates={fingerStates as HandStates} // Cast to HandStates
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
