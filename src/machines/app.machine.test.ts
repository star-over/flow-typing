import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';

import type { TypingStream } from '@/interfaces/types';

import { appMachine } from './app.machine';

describe('appMachine', () => {
  describe('initial / navigation', () => {
    it('settles in menu after initializing (always transition)', () => {
      const actor = createActor(appMachine);
      actor.start();
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('navigates menu → settings → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'TO_SETTINGS' });
      expect(actor.getSnapshot().value).toBe('settings');
      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('navigates menu → allStat → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'TO_ALL_STAT' });
      expect(actor.getSnapshot().value).toBe('allStat');
      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });
  });

  describe('START_TRAINING', () => {
    it('from menu: enters training.running, stores symbolLayoutId, prepares non-empty stream', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
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
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });

      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'RESUME' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('Escape in training.running → paused', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });
    });

    it('Escape in training.paused → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('Enter in training.paused → resumes training.running', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('TO_MENU from training.paused → menu', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('NAVIGATION_KEY other than Escape/Enter does not transition from running', () => {
      const actor = createActor(appMachine);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Tab' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
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
      expect(snap.value).toBe('trainingComplete');
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
      expect(actor.getSnapshot().value).toBe('trainingComplete');

      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен' });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
    });

    it('Enter NAVIGATION_KEY restarts training and preserves currentSymbolLayoutId', () => {
      const actor = arriveInTrainingComplete('йцукен');

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
      expect(snap.context.lastTrainingStream).not.toBeNull();
      expect(snap.context.lastTrainingStream!.length).toBeGreaterThan(0);
    });

    it('Escape NAVIGATION_KEY is ignored in trainingComplete (no Escape handler)', () => {
      const actor = arriveInTrainingComplete();

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('trainingComplete');
    });

    it('TO_MENU returns to menu', () => {
      const actor = arriveInTrainingComplete();

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });
  });
});
