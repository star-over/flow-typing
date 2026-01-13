"use client";

import { useMachine } from "@xstate/react";
import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { TrainingScene } from "@/components/ui/training-scene";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { AppEvent, appMachine } from "@/machines/app.machine";
import { useSettingsStore } from "@/store/settings.store";
import { SettingsClientPage } from "@/components/ui/settings-client-page";


export function AppClient() {
  const [state, send] = useMachine(appMachine);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isSettingsStoreInitialized = useSettingsStore((state) => state.isInitialized);
  const exerciseIdFromStore = useSettingsStore((state) => state.shared.exerciseId);

  // Effect to read URL parameters on initial load
  useEffect(() => {
    if (isSettingsStoreInitialized) {
      const exerciseIdFromUrl = searchParams.get('exerciseId');
      if (exerciseIdFromUrl) {
        useSettingsStore.getState().updateSettings({ shared: { exerciseId: exerciseIdFromUrl } });
      }
    }
  }, [isSettingsStoreInitialized, searchParams]);

  // Effect to update URL parameters when settings change
  useEffect(() => {
    if (isSettingsStoreInitialized) {
      const currentUrlParams = new URLSearchParams(window.location.search);
      if (exerciseIdFromStore) {
        currentUrlParams.set('exerciseId', exerciseIdFromStore);
      } else {
        currentUrlParams.delete('exerciseId');
      }
      const newUrl = `${pathname}?${currentUrlParams.toString()}`;
      // Only replace if the URL actually changed to avoid unnecessary navigations
      if (window.location.search !== `?${currentUrlParams.toString()}`) {
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [isSettingsStoreInitialized, exerciseIdFromStore, pathname, router]);

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
      // Prevent default browser actions for certain keys during training
      if (state.matches('training') && event.code === 'Space') {
        event.preventDefault();
      }
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
  }, [send, state]);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_10px] items-center justify-items-center min-h-screen p-4 pb-20">
      <main className="flex flex-col gap-4 row-start-2 items-center sm:items-start">
        <h1 className="text-xl font-bold">FlowTyping</h1>
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
            <TrainingScene trainingActor={trainingActor} fingerLayout={fingerLayoutASDF} keyboardLayout={keyboardLayoutANSI} />
            {state.matches('trainingComplete') && <p className="text-xl font-bold text-green-500 mt-4">Lesson Complete!</p>}
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              Back to Menu
            </button>
          </div>
        )}

        {state.matches('settings') && (
          <SettingsClientPage onBack={() => send({ type: 'BACK_TO_MENU' })} />
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
