"use client";

import { useMachine } from "@xstate/react";
import { type Actor } from 'xstate';
import { useUserPreferencesStore } from "@/store/user-preferences.store";
import { appMachine } from "@/machines/app.machine";
import { trainingMachine } from "@/machines/training.machine";
import { type Dictionary, type Locale } from "@/interfaces/types";
import { LanguageSetter } from "@/components/LanguageSetter";

// Custom Hooks
import { useI18n } from "@/hooks/use-i18n";
import { useUrlSync } from "@/hooks/use-url-sync";
import { useKeyboardEvents } from "@/hooks/use-keyboard-events";

// Sub-components
import { Header } from "@/components/app/Header";
import { MainContent } from "@/components/app/MainContent";
import { FooterActions } from "@/components/app/FooterActions";

export function AppClient({ dictionary, initialLocale }: { dictionary: Dictionary, initialLocale: Locale }) {
  // === HOOKS ===
  const [state, send] = useMachine(appMachine);
  const { keyboardLayout: zustandKeyboardLayout } = useUserPreferencesStore();
  
  // Custom hooks for encapsulating logic
  const { currentDictionary } = useI18n(dictionary, initialLocale);
  useUrlSync();
  useKeyboardEvents(state, send);

  // === RENDER ===
  const trainingActor = state.children.trainingService as Actor<typeof trainingMachine> | undefined;

  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-4 gap-8">
      {/* This component is outside the main flow and manages its own state */}
      <LanguageSetter />

      <Header
        title={currentDictionary.app.title}
        appStateLabel={currentDictionary.app.app_state}
        appStateValue={JSON.stringify(state.value)}
      />
      
      <main className="flex flex-col gap-4 items-center w-full">
        <MainContent
          state={state}
          send={send}
          dictionary={currentDictionary}
          trainingActor={trainingActor}
        />
      </main>

      <FooterActions
        state={state}
        send={send}
        dictionary={currentDictionary}
        keyboardLayout={zustandKeyboardLayout}
      />
    </div>
  );
}