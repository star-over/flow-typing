import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';

import { HandsSceneViewModel, KeyCapId, StreamSymbol } from '@/interfaces/types';
import { trainingMachine } from '@/machines/training.machine';

import { generateHandsSceneViewModel } from './viewModel-builder';

// --- Mock ViewModel Data ---
// Эти моки HandsSceneViewModel используются для тестирования различных состояний
// компонента HandsExt в Storybook. При добавлении новой сложной логики
// рендеринга в HandsExt, настоятельно рекомендуется создавать новый мок
// и новую историю для его изолированного тестирования.
// Based on examples from /VisualContract.md

const idleViewModel: HandsSceneViewModel = {
  L1: { fingerState: 'IDLE' }, L2: { fingerState: 'IDLE' }, L3: { fingerState: 'IDLE' }, L4: { fingerState: 'IDLE' }, L5: { fingerState: 'IDLE' }, LB: { fingerState: 'IDLE' },
  R1: { fingerState: 'IDLE' }, R2: { fingerState: 'IDLE' }, R3: { fingerState: 'IDLE' }, R4: { fingerState: 'IDLE' }, R5: { fingerState: 'IDLE' }, RB: { fingerState: 'IDLE' },
};

/*
 * Best Practice: Для создания состояний рекомендуется использовать композицию.
 * 1. Начните с `...idleViewModel`, чтобы гарантировать наличие всех пальцев.
 * 2. Добавьте `...leftInactive` или `...rightInactive`, чтобы "выключить" неиспользуемую руку.
 * 3. Явно определите состояние для одного или нескольких АКТИВНЫХ пальцев.
*/
const leftInactive: Partial<HandsSceneViewModel> = {
  L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" }, L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
};
const rightInactive: Partial<HandsSceneViewModel> = {
  R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
};


describe('viewModel-builder', () => {

  describe('getIdleViewModel', () => {
    it('should return a view model with all fingers in IDLE state', () => {
      const viewModel = generateHandsSceneViewModel(undefined);
      expect(viewModel).toEqual(idleViewModel);
    });
  });

  describe('generateHandsSceneViewModel', () => {
    it('should return an idle view model when not in the training state', () => {
      const viewModel = generateHandsSceneViewModel(undefined);
      expect(viewModel).toEqual(idleViewModel);
    });

    it.skip('should correctly generate a view model for a simple "k" character', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'k',
        targetKeyCaps: ['KeyK'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();
      const viewModel = generateHandsSceneViewModel(trainingActor.getSnapshot().context);
      const simpleK: HandsSceneViewModel = {
        ...idleViewModel,
        ...rightInactive,
        R3: {
          fingerState: "ACTIVE",
          keyCapStates: {
            "Digit8": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyI": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyK": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Comma": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
          }
        }
      };
      expect(viewModel).toEqual(simpleK);
    });

    it.skip('should correctly generate a view model for a simple "t" character', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 't',
        targetKeyCaps: ['KeyT'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();
      const viewModel = generateHandsSceneViewModel(trainingActor.getSnapshot().context);
      const originalViewModel: HandsSceneViewModel = {
        ...idleViewModel,
        ...leftInactive,
        L2: {
          fingerState: "ACTIVE",
          keyCapStates: {
            "Digit4": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Digit5": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyR": { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
            "KeyT": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyF": { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NEUTRAL" },
            "KeyG": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyV": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyB": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
          },
        },
      };
      expect(viewModel).toEqual(originalViewModel);
    });

    it.skip('should correctly generate a view model for a simple "c" character', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'c',
        targetKeyCaps: ['KeyC'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();
      const viewModel = generateHandsSceneViewModel(trainingActor.getSnapshot().context);
      const simpleC: HandsSceneViewModel = {
        ...idleViewModel,
        ...leftInactive,
        L3: {
          fingerState: "ACTIVE",
          keyCapStates: {
            "Digit3": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyE": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyD": { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
            "KeyC": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
          },
        },
      };
      expect(viewModel).toEqual(simpleC);
    });


    it.skip('should correctly generate a view model for a shifted (SHIFT - F) character', () => {
      const trainingStream: StreamSymbol[] = [{
        targetSymbol: 'F',
        targetKeyCaps: ['KeyF', 'ShiftRight'],
        attempts: []
      }];

      const trainingActor = createActor(trainingMachine, { input: { stream: trainingStream } });
      trainingActor.start();

      const viewModel = generateHandsSceneViewModel(trainingActor.getSnapshot().context);
      const shiftF: HandsSceneViewModel = {
        ...idleViewModel,
        ...leftInactive,
        ...rightInactive,
        L2: {
          fingerState: "ACTIVE",
          keyCapStates: {
            "KeyF":     { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Digit4":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Digit5":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyR":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyT":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyG":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyV":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyB":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
          }
        },
        R5: {
          fingerState: "ACTIVE",
          keyCapStates: {
            "Semicolon":    { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
            "Quote":        { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
            "ShiftRight":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Digit0":       { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Minus":        { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Equal":        { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Backspace":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "KeyP":         { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "BracketLeft":  { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "BracketRight": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Backslash":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
            "Enter":        { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
          }
        },
      };
      expect(viewModel).toEqual(shiftF);

    });

    it.skip('should handle in-cluster errors correctly', () => {
      const mockTrainingContext = {
        stream: [
          {
            targetSymbol: 'f',
            targetKeyCaps: ['KeyF'] as KeyCapId[],
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

    it.skip('should handle out-of-cluster errors correctly', () => {
      const mockTrainingContext = {
        stream: [
          {
            targetSymbol: 'f',
            targetKeyCaps: ['KeyF'] as KeyCapId[],
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

describe.skip('trainingMachine', () => {
  it('should transition to correctInput on correct spacebar press', () => {
    const trainingStream: StreamSymbol[] = [
      {
        targetSymbol: ' ',
        targetKeyCaps: ['Space'],
        attempts: [],
      },
      {
        targetSymbol: 'a',
        targetKeyCaps: ['KeyA'],
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
        targetKeyCaps: ['Space'],
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
