import { describe, expect, it } from 'vitest';
import { createActor, createMachine } from 'xstate';

import type { TypingStream } from '@/interfaces/types';
import { sym } from '@/fixtures/stream';

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

  describe('menu navigation keys', () => {
    it('Enter emits MENU_START_REQUESTED (the UI mirrors the Start button), stays in menu', () => {
      const actor = createActor(appMachineForTest);
      const requests: { type: string }[] = [];
      actor.on('MENU_START_REQUESTED', (event) => requests.push(event));
      actor.start();
      expect(actor.getSnapshot().value).toBe('menu');

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });

      // Машина не стартует сама — раскладку добавляет UI, здесь лишь уведомление.
      expect(requests).toHaveLength(1);
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('Escape in menu is inert (no Start button to mirror) and emits nothing', () => {
      const actor = createActor(appMachineForTest);
      const requests: { type: string }[] = [];
      actor.on('MENU_START_REQUESTED', (event) => requests.push(event));
      actor.start();

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });

      expect(requests).toHaveLength(0);
      expect(actor.getSnapshot().value).toBe('menu');
    });
  });

  describe('START_TRAINING', () => {
    it('from menu: enters training.running, stores symbolLayoutId, spawns sessionService', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });

      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
      expect(snap.children.sessionService).toBeDefined();
    });

    it('stores currentSymbolLayoutId = qwerty when started with qwerty', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'qwerty', durationSeconds: 300 });
      expect(actor.getSnapshot().context.currentSymbolLayoutId).toBe('qwerty');
    });

    it('stores sessionDurationSeconds in context and passes it to sessionService input', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'qwerty', durationSeconds: 600 });

      const snap = actor.getSnapshot();
      expect(snap.context.sessionDurationSeconds).toBe(600);
      expect(snap.children.sessionService).toBeDefined();
    });
  });

  describe('training.running / paused transitions', () => {
    it('PAUSE → paused; RESUME → running', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });

      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'RESUME' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('Escape in training.running → paused', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });
    });

    it('Escape in training.paused → menu', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('Enter in training.paused → resumes training.running', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('TO_MENU from training.paused → menu', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'TO_MENU' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('NAVIGATION_KEY other than Escape/Enter does not transition from running', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Tab' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });
  });

  describe('SESSION.COMPLETE', () => {
    it('moves to sessionComplete and stores final stream + canonical summary', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });

      const finalStream: TypingStream = [sym('x', 'KeyX')];
      const finalSummary = {
        exposures: 1,
        clean: 1,
        cpm: 60,
        durationMs: 60_000,
        latencyMedianMs: 0,
        confusions: [],
      };
      actor.send({ type: 'SESSION.COMPLETE', stream: finalStream, summary: finalSummary });

      const snap = actor.getSnapshot();
      expect(snap.value).toBe('sessionComplete');
      expect(snap.context.lastTrainingStream).toEqual(finalStream);
      expect(snap.context.lastSessionSummary).toEqual(finalSummary);
    });
  });

  describe('sessionComplete transitions', () => {
    function arriveInSessionComplete(layout: 'qwerty' | 'йцукен' = 'йцукен') {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: layout, durationSeconds: 300 });
      actor.send({ type: 'SESSION.COMPLETE', stream: [], summary: null });
      return actor;
    }

    it('START_TRAINING restarts with a new layout, updates currentSymbolLayoutId', () => {
      const actor = arriveInSessionComplete('qwerty');
      expect(actor.getSnapshot().value).toBe('sessionComplete');

      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
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

    it('Escape NAVIGATION_KEY returns to menu (mirrors the "В меню" button)', () => {
      const actor = arriveInSessionComplete();

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('menu');
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

  // Вход на /train (App.svelte mount) нормализует тренажёр в чистое меню из
  // ЛЮБОГО состояния: экран не переживает навигацию между страницами, «Начать
  // тренировку» начинает заново, а не воскрешает прошлый экран/сессию (ADR 0010).
  describe('TRAINER_OPENED (return to /train resets the view)', () => {
    it('from sessionComplete → menu (the reported bug: stale stats screen)', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      actor.send({ type: 'SESSION.COMPLETE', stream: [], summary: null });
      expect(actor.getSnapshot().value).toBe('sessionComplete');

      actor.send({ type: 'TRAINER_OPENED' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('from training.running → menu (abandoned, never-paused session)', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });

      actor.send({ type: 'TRAINER_OPENED' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('from training.paused → menu (paused session is not resurrected across nav)', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'TRAINER_OPENED' });
      expect(actor.getSnapshot().value).toBe('menu');
    });
  });

  // Уход с /train (App.svelte unmount) завершает тренажёр: без сброса брошенная
  // сессия тикает «в фоне» (Header в +layout читает таймер/паузу из живого FSM —
  // обратный отсчёт не останавливается, «Пауза» висит в шапке). Возврат в menu
  // завершает invoked-sessionService вместе с его таймером.
  describe('TRAINER_CLOSED (leaving /train terminates the trainer)', () => {
    it('from training.running → menu, and stops sessionService (background timer)', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      expect(actor.getSnapshot().children.sessionService).toBeDefined();

      actor.send({ type: 'TRAINER_CLOSED' });
      const snap = actor.getSnapshot();
      expect(snap.value).toBe('menu');
      expect(snap.children.sessionService).toBeUndefined();
    });

    it('from training.paused → menu', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'TRAINER_CLOSED' });
      expect(actor.getSnapshot().value).toBe('menu');
    });

    it('from sessionComplete → menu', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      actor.send({ type: 'SESSION.COMPLETE', stream: [], summary: null });
      expect(actor.getSnapshot().value).toBe('sessionComplete');

      actor.send({ type: 'TRAINER_CLOSED' });
      expect(actor.getSnapshot().value).toBe('menu');
    });
  });
});
