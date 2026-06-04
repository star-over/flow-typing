import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';

import type { TypingStream } from '@/interfaces/types';

import { appMachine } from './app.machine';

describe('appMachine', () => {
  describe('initial / navigation', () => {
    it('settles in menu after initializing (always transition)', () => {
      const actor = createActor(appMachine);
      actor.start();
      expect(actor.getSnapshot().matches('menu')).toBe(true);
    });

    it('navigates menu → settings → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'TO_SETTINGS' });
      expect(actor.getSnapshot().matches('settings')).toBe(true);
      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().matches('menu')).toBe(true);
    });

    it('navigates menu → allStat → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'TO_ALL_STAT' });
      expect(actor.getSnapshot().matches('allStat')).toBe(true);
      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().matches('menu')).toBe(true);
    });
  });

  describe('START_TRAINING', () => {
    it('from menu: enters training.running, stores symbolLayoutId, prepares non-empty stream', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      const snap = actor.getSnapshot();
      expect(snap.matches({ training: 'running' })).toBe(true);
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
      expect(snap.context.lastTrainingStream).not.toBeNull();
      expect(snap.context.lastTrainingStream!.length).toBeGreaterThan(0);
    });

    it('stores currentSymbolLayoutId = qwerty when started with qwerty', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'qwerty' });
      expect(actor.getSnapshot().context.currentSymbolLayoutId).toBe('qwerty');
    });
  });

  describe('training.running / paused transitions', () => {
    it('PAUSE → paused; RESUME → running', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      expect(actor.getSnapshot().matches({ training: 'running' })).toBe(true);

      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().matches({ training: 'paused' })).toBe(true);

      actor.send({ type: 'RESUME' });
      expect(actor.getSnapshot().matches({ training: 'running' })).toBe(true);
    });

    it('Escape in training.running → paused', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().matches({ training: 'paused' })).toBe(true);
    });

    it('Escape in training.paused → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().matches('menu')).toBe(true);
    });

    it('Enter in training.paused → resumes training.running', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      expect(actor.getSnapshot().matches({ training: 'running' })).toBe(true);
    });

    it('TO_MENU from training.paused → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().matches('menu')).toBe(true);
    });

    it('NAVIGATION_KEY other than Escape/Enter does not transition from running', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Tab' });
      expect(actor.getSnapshot().matches({ training: 'running' })).toBe(true);
    });
  });

  describe('TRAINING.COMPLETE', () => {
    it('moves to trainingComplete and stores final stream', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      const finalStream: TypingStream = [
        { targetSymbol: 'x', targetKeyCaps: ['KeyX'], attempts: [] },
      ];
      actor.send({ type: 'TRAINING.COMPLETE', stream: finalStream });

      const snap = actor.getSnapshot();
      expect(snap.matches('trainingComplete')).toBe(true);
      expect(snap.context.lastTrainingStream).toEqual(finalStream);
    });
  });

  describe('trainingComplete transitions', () => {
    function arriveInTrainingComplete(layout: 'qwerty' | 'йцукен' = 'йцукен') {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: layout });
      actor.send({ type: 'TRAINING.COMPLETE', stream: [] });
      return actor;
    }

    it('START_TRAINING restarts with a new layout, updates currentSymbolLayoutId', () => {
      const actor = arriveInTrainingComplete('qwerty');
      expect(actor.getSnapshot().matches('trainingComplete')).toBe(true);

      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      const snap = actor.getSnapshot();
      expect(snap.matches({ training: 'running' })).toBe(true);
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
    });

    it('Enter NAVIGATION_KEY restarts training and preserves currentSymbolLayoutId', () => {
      const actor = arriveInTrainingComplete('йцукен');

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      const snap = actor.getSnapshot();
      expect(snap.matches({ training: 'running' })).toBe(true);
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
      expect(snap.context.lastTrainingStream).not.toBeNull();
      expect(snap.context.lastTrainingStream!.length).toBeGreaterThan(0);
    });

    it('Escape NAVIGATION_KEY is ignored in trainingComplete (no Escape handler)', () => {
      const actor = arriveInTrainingComplete();

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().matches('trainingComplete')).toBe(true);
    });

    it('TO_MENU returns to menu', () => {
      const actor = arriveInTrainingComplete();

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().matches('menu')).toBe(true);
    });
  });
});
