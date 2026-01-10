/**
 * @file Компонент `TrainingScene` для отображения основной сцены тренировки.
 * @description Этот компонент является контейнером, который управляет состоянием
 * тренировки с помощью XState-актора и отображает основные UI-элементы:
 * `FlowLine`, `HandsExt` и кнопки управления тренировкой.
 */
import { useSelector } from "@xstate/react";
import type { ActorRefFrom } from "xstate";

import { fingerLayoutASDF } from '@/data/finger-layout-asdf';
import { keyboardLayoutANSI } from '@/data/keyboard-layout-ansi';
import { HandsSceneViewModel } from "@/interfaces/types";
import { createKeyCoordinateMap, KeyCoordinateMap } from '@/lib/layout-utils';
import { AdjacencyList, createKeyboardGraph } from '@/lib/pathfinding';
import { generateHandsSceneViewModel } from "@/lib/viewModel-builder";
import { trainingMachine } from "@/machines/training.machine";

import { FlowLine } from "./flow-line";
import { HandsExt } from "./hands-ext";

// Helper component for displaying debug state
const DebugState = ({ dataFlowLine, dataViewModel }: { dataFlowLine: unknown; dataViewModel: unknown; }) => {
  // The 'replacer' function is used to handle special cases during JSON serialization.
  // In this case, it ensures that 'undefined' values are explicitly converted to the string "undefined"
  // instead of being omitted, which is the default behavior of JSON.stringify.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replacer = (key: string, value: any) => (typeof value === 'undefined' ? 'undefined' : value);

  const stateString = `
import { HandsExtFixture } from './types';
export const simpleKFixture: HandsExtFixture = {
  input: ${JSON.stringify(dataFlowLine, replacer)?.replace(/"undefined"/g, 'undefined')},
  expectedOutput: ${JSON.stringify(dataViewModel, replacer)?.replace(/"undefined"/g, 'undefined')},
};  
`;

  return (
    <div className="w-full mt-8">
      <h3 className="text-lg font-bold">State</h3>
      <textarea
        readOnly
        className="w-full h-48 p-2 font-mono text-xs bg-gray-100 dark:bg-gray-900 border rounded"
        value={stateString}
        onClick={async (e) => {
          const textToCopy = (e.target as HTMLTextAreaElement).value;
          try {
            await navigator.clipboard.writeText(textToCopy);
            // console.log('Content copied to clipboard'); // For debugging
          } catch (err) {
            console.error('Failed to copy: ', err);
          }
        }}
      />
    </div>
  );
};


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

  const keyboardGraph: AdjacencyList = createKeyboardGraph(keyboardLayoutANSI);
  const keyCoordinateMap: KeyCoordinateMap = createKeyCoordinateMap(keyboardLayoutANSI);

  // Генерируем ViewModel для HandsExt на основе текущего состояния машины
  const viewModel: HandsSceneViewModel = generateHandsSceneViewModel(trainingState.context.stream?.[trainingState.context.currentIndex], fingerLayoutASDF, keyboardLayoutANSI, keyboardGraph, keyCoordinateMap);

  const flowLineFixture = stream[currentIndex];


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

      <div className="w-full max-w-4xl">
        <DebugState dataFlowLine={flowLineFixture} dataViewModel={viewModel} />
      </div>
    </div>
  );
};
