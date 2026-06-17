import { describe, expect, it } from 'vitest';
import { createActor, createMachine } from 'xstate';

import type { TypingStream } from '@/interfaces/types';

import { appMachine } from './app.machine';

// Заглушка сессии — пустая МАШИНА (не fromCallback!). В setup appMachine
// `sessionService` зарегистрирован как машина, поэтому override обязан быть
// машинной логикой — callback-актор не присвоится по типам (red в make check).
// Пустая машина глотает KEY_PRESS/PAUSE_TIMER/RESUME_TIMER, остаётся жива →
// snap.children.sessionService определён. Каст нужен, т.к. её generics не совпадают
// с конкретным sessionService; SESSION.COMPLETE в тестах шлём в appMachine напрямую.
const sessionStub = createMachine({ id: 'sessionStub' });
const appMachineForTest = appMachine.provide({
  actors: { sessionService: sessionStub as any },
});

describe('appMachine', () => {
  describe('initial / navigation', () => {
    it('settles in menu after initializing (always transition)', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      expect(actor.getSnapshot().value).toBe('menu');
    });

  });

  describe('START_TRAINING', () => {
    it('from menu: enters training.running, stores symbolLayoutId, spawns sessionService', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
      expect(snap.children.sessionService).toBeDefined();
    });

    it('stores currentSymbolLayoutId = qwerty when started with qwerty', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'qwerty' });
      expect(actor.getSnapshot().context.currentSymbolLayoutId).toBe('qwerty');
    });
  });

  describe('training.running / paused transitions', () => {
    it('PAUSE → paused; RESUME → running', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });

      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'RESUME' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('Escape in training.running → paused', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });
    });

    it('Escape in training.paused → menu', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('Enter in training.paused → resumes training.running', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('TO_MENU from training.paused → menu', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('NAVIGATION_KEY other than Escape/Enter does not transition from running', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Tab' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });
  });

  describe('SESSION.COMPLETE', () => {
    it('moves to sessionComplete and stores final stream', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      const finalStream: TypingStream = [
        { targetSymbol: 'x', targetKeyCaps: ['KeyX'], attempts: [] },
      ];
      actor.send({ type: 'SESSION.COMPLETE', stream: finalStream });

      const snap = actor.getSnapshot();
      expect(snap.value).toBe('sessionComplete');
      expect(snap.context.lastTrainingStream).toEqual(finalStream);
    });
  });

  describe('sessionComplete transitions', () => {
    function arriveInSessionComplete(layout: 'qwerty' | 'йцукен' = 'йцукен') {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: layout });
      actor.send({ type: 'SESSION.COMPLETE', stream: [] });
      return actor;
    }

    it('START_TRAINING restarts with a new layout, updates currentSymbolLayoutId', () => {
      const actor = arriveInSessionComplete('qwerty');
      expect(actor.getSnapshot().value).toBe('sessionComplete');

      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
    });

    it('Enter NAVIGATION_KEY restarts training and preserves currentSymbolLayoutId', () => {
      const actor = arriveInSessionComplete('йцукен');

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
    });

    it('Escape NAVIGATION_KEY is ignored in sessionComplete (no Escape handler)', () => {
      const actor = arriveInSessionComplete();

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('sessionComplete');
    });

    it('TO_MENU returns to menu', () => {
      const actor = arriveInSessionComplete();

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });
  });
});
