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
      const mockTrainingContext = {
        stream: [
          {
            targetSymbol: 'f',
            requiredKeyCapIds: ['KeyF'] as KeyCapId[],
            attempts: [
              {
                typedKey: { keyCapId: 'KeyG' as KeyCapId, shift: false, isCorrect: false },
                startAt: 0,
                endAt: 0,
              },
            ],
          },
        ],
        currentIndex: 0,
        pressedKeys: ['KeyG'] as KeyCapId[],
        errors: 1,
      };

      const viewModel = generateHandsSceneViewModel(mockTrainingContext);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE');
      expect(viewModel['L2'].keyCapStates?.['KeyG']?.pressResult).toBe('INCORRECT');
    });

    it('should handle out-of-cluster errors correctly', () => {
      const mockTrainingContext = {
        stream: [
          {
            targetSymbol: 'f',
            requiredKeyCapIds: ['KeyF'] as KeyCapId[],
            attempts: [
              {
                typedKey: { keyCapId: 'KeyJ' as KeyCapId, shift: false, isCorrect: false },
                startAt: 0,
                endAt: 0,
              },
            ],
          },
        ],
        currentIndex: 0,
        pressedKeys: ['KeyJ'] as KeyCapId[],
        errors: 1,
      };

      const viewModel = generateHandsSceneViewModel(mockTrainingContext);
      expect(viewModel['L2'].fingerState).toBe('ACTIVE');
      expect(viewModel['R2'].fingerState).toBe('INCORRECT');
    });
  });
});

describe('trainingMachine', () => {
  it('should transition to correctInput on correct spacebar press', () => {
    const trainingStream: StreamSymbol[] = [
      {
        targetSymbol: ' ',
        requiredKeyCapIds: ['Space'],
        attempts: [],
      },
      {
        targetSymbol: 'a',
        requiredKeyCapIds: ['KeyA'],
        attempts: [],
      },
    ];

    const actor = createActor(trainingMachine, { input: { stream: trainingStream } });
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['Space'] });

    const state = actor.getSnapshot();
    expect(state.value).toBe('awaitingInput');
    expect(state.context.currentIndex).toBe(1);
  });

  it('should transition to incorrectInput on incorrect spacebar press', () => {
    const trainingStream: StreamSymbol[] = [
      {
        targetSymbol: ' ',
        requiredKeyCapIds: ['Space'],
        attempts: [],
      },
    ];

    const actor = createActor(trainingMachine, { input: { stream: trainingStream } });
    actor.start();
    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });

    const state = actor.getSnapshot();
    expect(state.value).toBe('awaitingInput');
    expect(state.context.currentIndex).toBe(0);
    expect(state.context.errors).toBe(1);
  });
});
