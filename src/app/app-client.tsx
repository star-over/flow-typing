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
import { Dictionary } from "@/interfaces/types";


export function AppClient({ dictionary }: { dictionary: Dictionary }) {
  const [state, send] = useMachine(appMachine);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { language, isInitialized: isSettingsStoreInitialized, shared, updateSettings } = useSettingsStore();
  const { exerciseId: exerciseIdFromStore } = shared;

  // Effect to synchronize language setting with URL
  useEffect(() => {
    const currentLocale = pathname.split('/')[1];
    if (isSettingsStoreInitialized && language !== currentLocale) {
      router.push(`/${language}`);
    }
  }, [language, pathname, router, isSettingsStoreInitialized]);


  // Effect to read URL parameters on initial load
  useEffect(() => {
    if (isSettingsStoreInitialized) {
      const exerciseIdFromUrl = searchParams.get('exerciseId');
      if (exerciseIdFromUrl) {
        updateSettings({ shared: { exerciseId: exerciseIdFromUrl } });
      }
    }
  }, [isSettingsStoreInitialized, searchParams, updateSettings]);

  // Effect to update URL parameters when settings change
  useEffect(() => {
    if (isSettingsStoreInitialized) {
      const currentUrlParams = new URLSearchParams(window.location.search);
      if (exerciseIdFromStore) {
        currentUrlParams.set('exerciseId', exerciseIdFromStore);
      } else {
        currentUrlParams.delete('exerciseId');
      }
      const newQueryString = currentUrlParams.toString();
      const currentQueryString = window.location.search.substring(1);

      if (newQueryString !== currentQueryString) {
        router.replace(`${pathname}?${newQueryString}`, { scroll: false });
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
        <h1 className="text-xl font-bold">{dictionary.app.title}</h1>
        <p className="text-lg">
        {dictionary.app.app_state}: <code className="font-mono bg-gray-200 dark:bg-gray-800 p-1 rounded">{state.value.toString()}</code>
        </p>

        {state.matches('initializing') && <div>{dictionary.app.loading}</div>}

        {state.matches('idle') && (
          <div className="flex gap-4">
            <button onClick={() => send({ type: 'START_TRAINING' })} className="p-2 bg-blue-500 text-white rounded">
              {dictionary.app.start_training}
            </button>
            <button onClick={() => send({ type: 'GO_TO_SETTINGS' })} className="p-2 bg-gray-500 text-white rounded">
              {dictionary.app.settings}
            </button>
            <button onClick={() => send({ type: 'VIEW_STATS' })} className="p-2 bg-gray-500 text-white rounded">
              {dictionary.app.stats}
            </button>
          </div>
        )}

        {trainingActor && (
          <div>
            <TrainingScene trainingActor={trainingActor} fingerLayout={fingerLayoutASDF} keyboardLayout={keyboardLayoutANSI} />
            {state.matches('trainingComplete') && <p className="text-xl font-bold text-green-500 mt-4">{dictionary.app.lesson_complete}</p>}
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              {dictionary.app.back_to_menu}
            </button>
          </div>
        )}

        {state.matches('settings') && (
          <SettingsClientPage onBack={() => send({ type: 'BACK_TO_MENU' })} dictionary={dictionary.settings} />
        )}

        {state.matches('stats') && (
          <div>
            <h2>{dictionary.app.stats_screen_title}</h2>
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              {dictionary.app.back_to_menu}
            </button>
          </div>
        )}

        {state.matches('error') && (
            <div>
                <h2 className="text-red-500">{dictionary.app.error_title}</h2>
                <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
                {dictionary.app.back_to_menu}
                </button>
            </div>
        )}

      </main>
    </div>
  );
}
