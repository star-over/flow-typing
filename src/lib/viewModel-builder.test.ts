import { describe, expect,it } from 'vitest';
import { createActor } from 'xstate';

import { KeyCapId,StreamSymbol } from '@/interfaces/types';
import { trainingMachine } from '@/machines/training.machine';

import { generateHandsSceneViewModel } from './viewModel-builder';

describe('viewModel-builder', () => {
  describe('getIdleViewModel', () => {
    it('should return a view model with all fingers in IDLE state', () => {
      const viewModel = generateHandsSceneViewModel(undefined);
      Object.values(viewModel).forEach(fingerScene => {
        expect(fingerScene.fingerState).toBe('IDLE');
        expect(fingerScene.keyCapStates).toBeUndefined();
      });
    });
  });

  describe('generateHandsSceneViewModel', () => {
    it('should return an idle view model when not in the training state', () => {
      const viewModel = generateHandsSceneViewModel(undefined);
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
      const viewModel = generateHandsSceneViewModel(trainingActor.getSnapshot().context);
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

      const viewModel = generateHandsSceneViewModel(trainingActor.getSnapshot().context);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE');
      expect(viewModel['R5'].fingerState).toBe('ACTIVE');
    });

    it('should handle in-cluster errors correctly', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'f',
        requiredKeyCapIds: ['KeyF'],
        attempts: []
      }];

      const mockTrainingContext = {
        stream: trainingStream,
        currentIndex: 0,
        pressedKeys: ['KeyG'] as KeyCapId[],
        errors: 1,
        lastAttempt: {
          keys: ['KeyG'] as KeyCapId[],
          isCorrect: false,
        },
      };

      const viewModel = generateHandsSceneViewModel(mockTrainingContext);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE');
      expect(viewModel['L2'].keyCapStates?.['KeyG']?.pressResult).toBe('INCORRECT');
    });

    it('should handle out-of-cluster errors correctly', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'f',
        requiredKeyCapIds: ['KeyF'],
        attempts: []
      }];

      const mockTrainingContext = {
        stream: trainingStream,
        currentIndex: 0,
        pressedKeys: ['KeyJ'] as KeyCapId[],
        errors: 1,
        lastAttempt: {
          keys: ['KeyJ'] as KeyCapId[],
          isCorrect: false,
        },
      };

      const viewModel = generateHandsSceneViewModel(mockTrainingContext);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE');
      expect(viewModel['R2'].fingerState).toBe('INCORRECT');
    });
  });
});
