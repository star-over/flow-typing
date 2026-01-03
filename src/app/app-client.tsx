"use client";

import { useMachine } from "@xstate/react";
import { useEffect } from "react";

import { TrainingScene } from "@/components/ui/training-scene";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { AppEvent } from "@/interfaces/types"; // Import AppEvent
import { appMachine } from "@/machines/app.machine";

export function AppClient() {
  const [state, send] = useMachine(appMachine);

  // Access the invoked training actor if it exists
  const trainingActor = state.children.trainingService;

  /**
   * АРХИТЕКТУРНОЕ РЕШЕНИЕ:
   * Этот `useEffect` является единственной точкой входа для всех событий
   * клавиатуры в приложении. Он перехватывает нажатия и отпускания клавиш,
   * и, не анализируя их, отправляет в главную машину состояний (`appMachine`).
   * Это гарантирует, что вся логика обработки ввода централизована в машинах состояний.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const appEvent: AppEvent = { type: "KEY_DOWN", keyCapId: event.code as KeyCapId };
      send(appEvent);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const appEvent: AppEvent = { type: "KEY_UP", keyCapId: event.code as KeyCapId };
      send(appEvent);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [send]);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">FlowTyping</h1>
        <p className="text-lg">
          App State: <code className="font-mono bg-gray-200 dark:bg-gray-800 p-1 rounded">{state.value.toString()}</code>
        </p>

        {state.matches('initializing') && <div>Loading...</div>}

        {state.matches('idle') && (
          <div className="flex gap-4">
            <button onClick={() => send({ type: 'START_TRAINING' })} className="p-2 bg-blue-500 text-white rounded">
              Start Training
            </button>
            <button onClick={() => send({ type: 'GO_TO_SETTINGS' })} className="p-2 bg-gray-500 text-white rounded">
              Settings
            </button>
            <button onClick={() => send({ type: 'VIEW_STATS' })} className="p-2 bg-gray-500 text-white rounded">
              Stats
            </button>
          </div>
        )}

        {trainingActor && (
          <div>
            <TrainingScene actor={trainingActor} />
            {state.matches('trainingComplete') && <p className="text-xl font-bold text-green-500 mt-4">Lesson Complete!</p>}
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              Back to Menu
            </button>
          </div>
        )}

        {state.matches('settings') && (
          <div>
            <h2>Settings Screen</h2>
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              Back to Menu
            </button>
          </div>
        )}

        {state.matches('stats') && (
          <div>
            <h2>Stats Screen</h2>
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              Back to Menu
            </button>
          </div>
        )}

        {state.matches('error') && (
            <div>
                <h2 className="text-red-500">An Error Occurred</h2>
                <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
                Back to Menu
                </button>
            </div>
        )}

      </main>
    </div>
  );
}