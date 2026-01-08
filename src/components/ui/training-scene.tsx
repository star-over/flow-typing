/**
 * @file Компонент `TrainingScene` для отображения основной сцены тренировки.
 * @description Этот компонент является контейнером, который управляет состоянием
 * тренировки с помощью XState-актора и отображает основные UI-элементы:
 * `FlowLine`, `HandsExt` и кнопки управления тренировкой.
 */
import { useSelector } from "@xstate/react";
import type { ActorRefFrom } from "xstate";

import { generateHandsSceneViewModel } from "@/lib/viewModel-builder";
import { trainingMachine } from "@/machines/training.machine";

import { FlowLine } from "./flow-line";
import { HandsExt } from "./hands-ext";

/** Пропсы для компонента `TrainingScene`. */
type TrainingSceneProps = {
  /** Актор (живой экземпляр) запущенной `trainingMachine`. */
  trainingActor: ActorRefFrom<typeof trainingMachine>;
};

/**
 * Компонент `TrainingScene` отрисовывает основную сцену тренировки слепой печати.
 * Он подключается к XState-машине `trainingMachine` для получения состояния
 * и отправки событий, а также отображает `FlowLine`, `HandsExt` и элементы управления.
 * @param props Пропсы компонента.
 * @param props.trainingActor Актор `trainingMachine`.
 * @returns Элемент JSX, представляющий тренировочную сцену.
 */
export const TrainingScene = ({ trainingActor }: TrainingSceneProps) => {
  const trainingState = useSelector(trainingActor, (snapshot) => snapshot);
  const send = trainingActor.send;
  const { stream, currentIndex } = trainingState.context;

  // Генерируем ViewModel для HandsExt на основе текущего состояния машины
  const viewModel = generateHandsSceneViewModel(trainingState.context.stream?.[trainingState.context.currentIndex]);

  return (
    <div className="flex flex-col items-center gap-8">
      <h2 className="text-2xl font-semibold">Training In Progress</h2>
      <p>
        Training Machine State: <code className="font-mono bg-gray-200 dark:bg-gray-800 p-1 rounded">{trainingState.value.toString()}</code>
      </p>

      <FlowLine stream={stream} cursorPosition={currentIndex} />

      <HandsExt viewModel={viewModel} />

      {/* Кнопки для тестирования событий паузы/возобновления */}
      {trainingState.matches('paused') ? (
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
