import React from 'react';
import { type StateFrom } from 'xstate';
import { type appMachine, type AppEvent } from '@/machines/app.machine';
import { Dictionary } from '@/interfaces/types';
import { UserPreferences } from '@/interfaces/user-preferences';

type Send = (event: AppEvent) => void;

interface FooterActionsProps {
  state: StateFrom<typeof appMachine>;
  send: Send;
  dictionary: Dictionary;
  keyboardLayout: UserPreferences['keyboardLayout'];
}

export const FooterActions: React.FC<FooterActionsProps> = ({ state, send, dictionary, keyboardLayout }) => {
  return (
    <footer className="flex flex-wrap gap-4 justify-center">
      {state.can({ type: 'START_TRAINING', keyboardLayout: keyboardLayout }) && (
          <button onClick={() => send({ type: 'START_TRAINING', keyboardLayout: keyboardLayout })} className="p-2 bg-blue-500 text-white rounded">
            {dictionary.app.start_training}
          </button>
      )}
      {state.can({ type: 'TO_SETTINGS' }) && (
          <button onClick={() => send({ type: 'TO_SETTINGS' })} className="p-2 bg-gray-500 text-white rounded">
            {dictionary.app.settings}
          </button>
      )}
      {state.can({ type: 'TO_ALL_STAT' }) && (
          <button onClick={() => send({ type: 'TO_ALL_STAT' })} className="p-2 bg-gray-500 text-white rounded">
            {dictionary.app.stats}
          </button>
      )}
      {state.can({ type: 'PAUSE' }) && (
          <button onClick={() => send({ type: 'PAUSE' })} className="p-2 bg-yellow-500 text-white rounded">
            {dictionary.app.pause}
          </button>
      )}
      {state.can({ type: 'RESUME' }) && (
          <button onClick={() => send({ type: 'RESUME' })} className="p-2 bg-green-500 text-white rounded">
            {dictionary.app.resume}
          </button>
      )}
      {state.can({ type: 'TO_MENU' }) && (
          <button onClick={() => send({ type: 'TO_MENU' })} className="p-2 bg-red-500 text-white rounded">
            {dictionary.app.back_to_menu}
          </button>
      )}
    </footer>
  );
};
