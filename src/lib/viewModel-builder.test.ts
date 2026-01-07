import { describe, expect,it } from 'vitest';
import { createActor } from 'xstate';

import { StreamSymbol } from '@/interfaces/types';
import { appMachine } from '@/machines/app.machine';
import { trainingMachine } from '@/machines/training.machine';

import { generateHandsSceneViewModel } from './viewModel-builder';

describe('viewModel-builder', () => {
  describe('getIdleViewModel', () => {
    it('should return a view model with all fingers in IDLE state', () => {
      const actor = createActor(appMachine);
      actor.start();
      const state = actor.getSnapshot();
      const viewModel = generateHandsSceneViewModel(state);
      Object.values(viewModel).forEach(fingerScene => {
        expect(fingerScene.fingerState).toBe('IDLE');
        expect(fingerScene.keyCapStates).toBeUndefined();
      });
    });
  });

  describe('generateHandsSceneViewModel', () => {
    it('should return an idle view model when not in the training state', () => {
      const actor = createActor(appMachine);
      actor.start();
      const state = actor.getSnapshot();
      const viewModel = generateHandsSceneViewModel(state);
      expect(Object.values(viewModel).every(f => f.fingerState === 'IDLE')).toBe(true);
    });

    it('should correctly generate a view model for a simple character', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'f',
        requiredKeyCapIds: ['KeyF'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();
      const appActor = createActor(appMachine);
      appActor.start();
      appActor.send({ type: 'START_TRAINING' });
      const appState = appActor.getSnapshot();
      appState.children.trainingService = trainingActor;


      const viewModel = generateHandsSceneViewModel(appState);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE'); 
      expect(viewModel['R1'].fingerState).toBe('INACTIVE');
    });

    it('should correctly generate a view model for a shifted character', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'F',
        requiredKeyCapIds: ['KeyF', 'ShiftRight'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();
      const appActor = createActor(appMachine);
      appActor.start();
      appActor.send({ type: 'START_TRAINING' });
      const appState = appActor.getSnapshot();
      appState.children.trainingService = trainingActor;

      const viewModel = generateHandsSceneViewModel(appState);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE'); 
      expect(viewModel['R5'].fingerState).toBe('ACTIVE'); 
    });

    it('should handle in-cluster errors correctly', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'f',
        requiredKeyCapIds: ['KeyF'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();
      trainingActor.send({ type: 'KEY_PRESS', keys: ['KeyG'] });

      const appActor = createActor(appMachine);
      appActor.start();
      appActor.send({ type: 'START_TRAINING' });
      const appState = appActor.getSnapshot();
      appState.children.trainingService = trainingActor;

      const viewModel = generateHandsSceneViewModel(appState);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE');
      expect(viewModel['L2'].keyCapStates?.['KeyG']?.pressResult).toBe('INCORRECT');
    });

    it('should handle out-of-cluster errors correctly', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'f',
        requiredKeyCapIds: ['KeyF'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();
      trainingActor.send({ type: 'KEY_PRESS', keys: ['KeyJ'] });

      const appActor = createActor(appMachine);
      appActor.start();
      appActor.send({ type: 'START_TRAINING' });
      const appState = appActor.getSnapshot();
      appState.children.trainingService = trainingActor;

      const viewModel = generateHandsSceneViewModel(appState);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE'); 
      expect(viewModel['R2'].fingerState).toBe('INCORRECT');
    });
  });
});
