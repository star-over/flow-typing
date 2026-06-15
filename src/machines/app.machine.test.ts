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

  describe('SESSION.COMPLETE', () => {
    it('moves to sessionComplete and stores final stream', () => {
      const actor = createActor(appMachine);
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
      const actor = createActor(appMachine);
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
      expect(snap.context.lastTrainingStream).not.toBeNull();
      expect(snap.context.lastTrainingStream!.length).toBeGreaterThan(0);
    });

    it('Escape NAVIGATION_KEY is ignored in sessionComplete (no Escape handler)', () => {
      const actor = arriveInSessionComplete();

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('sessionComplete');
    });

    it('a stray CHARACTER_INPUT does not freeze the machine; Enter still restarts', () => {
      const actor = arriveInSessionComplete('йцукен');

      // Pressing a text key on the completion screen emits CHARACTER_INPUT.
      // trainingService is gone here — forwarding it must not crash the actor.
      actor.send({ type: 'KEYBOARD.CHARACTER_INPUT', keys: ['KeyA'] });
      expect(actor.getSnapshot().status).toBe('active');
      expect(actor.getSnapshot().value).toBe('sessionComplete');

      // The actor must still process navigation afterwards.
      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('TO_MENU returns to menu', () => {
      const actor = arriveInSessionComplete();

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });
  });
});
