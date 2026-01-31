import React from 'react';
import { type Actor, type StateFrom } from 'xstate';
import { type appMachine, type AppEvent } from '@/machines/app.machine';
import { type trainingMachine } from '@/machines/training.machine';
import { Dictionary } from '@/interfaces/types';

import { TrainingScene } from "@/components/ui/training-scene";
import { LessonStatsDisplay } from "@/components/ui/lesson-stats-display";
import { UserPreferencesPage } from "@/components/ui/user-preferences-page";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";

interface MainContentProps {
  state: StateFrom<typeof appMachine>;
  send: (event: AppEvent) => void;
  dictionary: Dictionary;
  trainingActor: Actor<typeof trainingMachine> | undefined;
}

export const MainContent: React.FC<MainContentProps> = ({ state, send, dictionary, trainingActor }) => {
  if (state.matches({ training: 'running' }) && trainingActor) {
    return <TrainingScene trainingActor={trainingActor} fingerLayout={fingerLayoutASDF} keyboardLayout={keyboardLayoutANSI} />;
  }
  if (state.matches('trainingComplete')) {
      return <LessonStatsDisplay stream={state.context.lastTrainingStream!} dictionary={dictionary} />;
  }
  if (state.matches('settings')) {
      return <UserPreferencesPage onBack={() => send({ type: 'TO_MENU' })} dictionary={dictionary.user_preferences} />;
  }
  if (state.matches('allStat')) {
      return <h2>{dictionary.app.stats_screen_title}</h2>;
  }
  if (state.matches({ training: 'paused' })) {
      return <h2 className="text-2xl font-bold">{dictionary.app.pause}</h2>;
  }
  if (state.matches('error')) {
      return <h2 className="text-red-500">{dictionary.app.error_title}</h2>;
  }
  if (state.matches('initializing')) {
      return <div>{dictionary.app.loading}</div>;
  }
  // Default content for 'menu'
  return <div className="p-4 text-center"><p>{dictionary.app.welcome}</p></div>;
};
