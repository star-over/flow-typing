"use client";

import { useMachine } from "@xstate/react";
import { useEffect, useState } from "react"; // Added useState
import { useSearchParams, useRouter } from 'next/navigation';

import { TrainingScene } from "@/components/ui/training-scene";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { AppEvent, appMachine } from "@/machines/app.machine";
import { useUserPreferencesStore } from "@/store/user-preferences.store";
import { UserPreferencesPage } from "@/components/ui/user-preferences-page"; // Renamed component
import { Dictionary, Locale } from "@/interfaces/types";
import { LanguageSetter } from "@/components/LanguageSetter";


export function AppClient({ dictionary, initialLocale }: { dictionary: Dictionary, initialLocale: Locale }) { // Added initialLocale
  const [state, send] = useMachine(appMachine);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentDictionary, setCurrentDictionary] = useState<Dictionary>(dictionary); // Managed client-side
  const [currentLocale, setCurrentLocale] = useState<Locale>(initialLocale); // Managed client-side

  const {
    language: zustandLanguage,
    keyboardLayout: zustandKeyboardLayout,
    isInitialized: isUserPreferencesStoreInitialized,
    shared,
    updateUserPreferences,
  } = useUserPreferencesStore();
  const { exerciseId: exerciseIdFromStore } = shared;

  // Effect to correct language client-side if server-rendered language is outdated
  useEffect(() => {
    if (isUserPreferencesStoreInitialized && zustandLanguage !== currentLocale) {
      const loadDictionary = async () => {
        const newDictionary = await import(`../../dictionaries/${zustandLanguage}.json`).then(
          (module) => module.default
        );
        setCurrentDictionary(newDictionary);
        setCurrentLocale(zustandLanguage);
      };
      loadDictionary();
    }
  }, [zustandLanguage, currentLocale, isUserPreferencesStoreInitialized]);


  // Effect to read URL parameters on initial load
  useEffect(() => {
    if (isUserPreferencesStoreInitialized) {
      const exerciseIdFromUrl = searchParams.get('exerciseId');
      if (exerciseIdFromUrl) {
        updateUserPreferences({ shared: { exerciseId: exerciseIdFromUrl } });
      }
    }
  }, [isUserPreferencesStoreInitialized, searchParams, updateUserPreferences]);

  // Effect to update URL parameters when settings change
  useEffect(() => {
    if (isUserPreferencesStoreInitialized) {
      const currentUrlParams = new URLSearchParams(window.location.search);
      if (exerciseIdFromStore) {
        currentUrlParams.set('exerciseId', exerciseIdFromStore);
      } else {
        currentUrlParams.delete('exerciseId');
      }
      const newQueryString = currentUrlParams.toString();
      const currentQueryString = window.location.search.substring(1);

      if (newQueryString !== currentQueryString) {
        router.replace(`/${newQueryString ? `?${newQueryString}` : ''}`, { scroll: false });
      }
    }
  }, [isUserPreferencesStoreInitialized, exerciseIdFromStore, router]);


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
      <LanguageSetter />
      <main className="flex flex-col gap-4 row-start-2 items-center sm:items-start">
        <h1 className="text-xl font-bold">{currentDictionary.app.title}</h1>
        <p className="text-lg">
        {currentDictionary.app.app_state}: <code className="font-mono bg-gray-200 dark:bg-gray-800 p-1 rounded">{state.value.toString()}</code>
        </p>

        {state.matches('initializing') && <div>{currentDictionary.app.loading}</div>}

        {state.matches('idle') && (
          <div className="flex gap-4">
            <button onClick={() => send({ type: 'START_TRAINING', keyboardLayout: zustandKeyboardLayout })} className="p-2 bg-blue-500 text-white rounded">
              {currentDictionary.app.start_training}
            </button>
            <button onClick={() => send({ type: 'GO_TO_SETTINGS' })} className="p-2 bg-gray-500 text-white rounded">
              {currentDictionary.app.settings}
            </button>
            <button onClick={() => send({ type: 'VIEW_STATS' })} className="p-2 bg-gray-500 text-white rounded">
              {currentDictionary.app.stats}
            </button>
          </div>
        )}

        {trainingActor && (
          <div>
            <TrainingScene trainingActor={trainingActor} fingerLayout={fingerLayoutASDF} keyboardLayout={keyboardLayoutANSI} />
            {state.matches('trainingComplete') && <p className="text-xl font-bold text-green-500 mt-4">{currentDictionary.app.lesson_complete}</p>}
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              {currentDictionary.app.back_to_menu}
            </button>
          </div>
        )}

        {state.matches('settings') && (
          <UserPreferencesPage onBack={() => send({ type: 'BACK_TO_MENU' })} dictionary={currentDictionary.user_preferences} />
        )}

        {state.matches('stats') && (
          <div>
            <h2>{currentDictionary.app.stats_screen_title}</h2>
            <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
              {currentDictionary.app.back_to_menu}
            </button>
          </div>
        )}

        {state.matches('error') && (
            <div>
                <h2 className="text-red-500">{currentDictionary.app.error_title}</h2>
                <button onClick={() => send({ type: 'BACK_TO_MENU' })} className="p-2 mt-4 bg-red-500 text-white rounded">
                {currentDictionary.app.back_to_menu}
                </button>
            </div>
        )}

      </main>
    </div>
  );
}
