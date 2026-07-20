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

// Вход на /train автоматически запускает тренировку (ADR 0025): App.svelte на входе шлёт
// TRAINER_OPENED с раскладкой/длительностью из $settings. Функция ниже повторяет эту последовательность.
function enterTraining(layout: 'qwerty' | 'йцукен' = 'йцукен', duration = 300) {
  const actor = createActor(appMachineForTest);
  actor.start();
  actor.send({ type: 'TRAINER_OPENED', symbolLayoutId: layout, durationSeconds: duration });
  return actor;
}

describe('appMachine', () => {
  describe('initial / idle', () => {
    it('settles in idle after initializing (at-rest, never rendered — ADR 0025)', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      expect(actor.getSnapshot().value).toBe('idle');
    });

    it('idle ignores START_TRAINING (entry starts via TRAINER_OPENED, not this event)', () => {
      const actor = createActor(appMachineForTest);
      actor.start();
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      expect(actor.getSnapshot().value).toBe('idle');
    });
  });

  // Вход на /train автоматически запускает тренировку (ADR 0025). TRAINER_OPENED — корневой
  // обработчик: из ЛЮБОГО состояния даёт свежую сессию. Ядро ADR 0010 (возврат на
  // /train не воскрешает залипший экран) сохранено — теперь через автоматический запуск.
  describe('TRAINER_OPENED starts training on entry', () => {
    it('from idle: enters training.running, stores layout, spawns sessionService', () => {
      const actor = enterTraining('йцукен', 300);
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
      expect(snap.children.sessionService).toBeDefined();
    });

    it('stores currentSymbolLayoutId = qwerty when opened with qwerty', () => {
      const actor = enterTraining('qwerty', 300);
      expect(actor.getSnapshot().context.currentSymbolLayoutId).toBe('qwerty');
    });

    it('stores sessionDurationSeconds in context and passes it to sessionService input', () => {
      const actor = enterTraining('qwerty', 600);
      const snap = actor.getSnapshot();
      expect(snap.context.sessionDurationSeconds).toBe(600);
      expect(snap.children.sessionService).toBeDefined();
    });

    it('from stale sessionComplete → fresh training (the reported ADR 0010 bug: stale stats)', () => {
      const actor = enterTraining();
      actor.send({ type: 'SESSION.COMPLETE', stream: [], summary: null });
      expect(actor.getSnapshot().value).toBe('sessionComplete');

      actor.send({ type: 'TRAINER_OPENED', symbolLayoutId: 'qwerty', durationSeconds: 300 });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('qwerty');
    });

    it('from training.running → fresh training (return to /train restarts, never resurrects)', () => {
      const actor = enterTraining();
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });

      actor.send({ type: 'TRAINER_OPENED', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('from training.paused → fresh training (paused session is not resurrected across nav)', () => {
      const actor = enterTraining();
      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'TRAINER_OPENED', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });
  });

  describe('training.running / paused transitions', () => {
    it('PAUSE → paused; RESUME → running', () => {
      const actor = enterTraining();
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });

      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'RESUME' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('Escape in training.running → paused', () => {
      const actor = enterTraining();
      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });
    });

    it('Escape in training.paused → resumes running (pause toggle; no menu screen — ADR 0025)', () => {
      const actor = enterTraining();
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('Enter in training.paused → resumes running', () => {
      const actor = enterTraining();
      actor.send({ type: 'PAUSE' });

      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });

    it('START_TRAINING in training.paused → fresh training («Начать заново»), updates params', () => {
      const actor = enterTraining('йцукен');
      actor.send({ type: 'PAUSE' });
      const pausedSession = actor.getSnapshot().children.sessionService;

      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'qwerty', durationSeconds: 180 });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('qwerty');
      expect(snap.context.sessionDurationSeconds).toBe(180);
      // Рестарт — не воскрешение: sessionService пересоздан (новый актор), иначе
      // «Начать заново» неотличимо от «Продолжить» (расследование 2026-07-20).
      expect(snap.children.sessionService).toBeDefined();
      expect(snap.children.sessionService === pausedSession).toBe(false);
    });

    it('NAVIGATION_KEY other than Escape/Enter does not transition from running', () => {
      const actor = enterTraining();
      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Tab' });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });
  });

  describe('SESSION.COMPLETE', () => {
    it('moves to sessionComplete and stores final stream + canonical summary', () => {
      const actor = enterTraining();

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
      const actor = enterTraining(layout);
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

    it('Escape NAVIGATION_KEY is inert (no menu screen — ADR 0025; уход через шапку)', () => {
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
  });

  // Сетевой сбой старта сессии всплывает отдельным экраном sessionError (не тихим
  // пустым sessionComplete): sessionMachine шлёт SESSION.ERROR, родитель даёт
  // повтор. Уход — через шапку (ADR 0025): экрана-меню нет.
  describe('SESSION.ERROR (network failure surfaced as a first-class screen)', () => {
    function arriveInSessionError(layout: 'qwerty' | 'йцукен' = 'йцукен') {
      const actor = enterTraining(layout);
      actor.send({ type: 'SESSION.ERROR' });
      return actor;
    }

    it('moves from training to sessionError, not a silent empty complete', () => {
      const actor = arriveInSessionError();
      expect(actor.getSnapshot().value).toBe('sessionError');
    });

    it('START_TRAINING retries with the chosen layout', () => {
      const actor = arriveInSessionError('qwerty');
      actor.send({ type: 'START_TRAINING', symbolLayoutId: 'qwerty', durationSeconds: 300 });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('qwerty');
    });

    it('Enter NAVIGATION_KEY retries and preserves currentSymbolLayoutId', () => {
      const actor = arriveInSessionError('йцукен');
      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Enter' });
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ training: 'running' });
      expect(snap.context.currentSymbolLayoutId).toBe('йцукен');
    });

    it('Escape NAVIGATION_KEY is inert (no menu screen — ADR 0025)', () => {
      const actor = arriveInSessionError();
      actor.send({ type: 'KEYBOARD.NAVIGATION_KEY', key: 'Escape' });
      expect(actor.getSnapshot().value).toBe('sessionError');
    });

    it('TRAINER_OPENED starts a fresh session on entry (never resurrects the error)', () => {
      const actor = arriveInSessionError();
      actor.send({ type: 'TRAINER_OPENED', symbolLayoutId: 'йцукен', durationSeconds: 300 });
      expect(actor.getSnapshot().value).toEqual({ training: 'running' });
    });
  });

  // Уход с /train (App.svelte unmount) завершает тренажёр в `idle`: без сброса
  // брошенная сессия тикает «в фоне» (Header в +layout читает таймер/паузу из
  // живого FSM). Возврат в `idle` завершает invoked-sessionService с его таймером.
  describe('TRAINER_CLOSED (leaving /train terminates the trainer)', () => {
    it('from training.running → idle, and stops sessionService (background timer)', () => {
      const actor = enterTraining();
      expect(actor.getSnapshot().children.sessionService).toBeDefined();

      actor.send({ type: 'TRAINER_CLOSED' });
      const snap = actor.getSnapshot();
      expect(snap.value).toBe('idle');
      expect(snap.children.sessionService).toBeUndefined();
    });

    it('from training.paused → idle', () => {
      const actor = enterTraining();
      actor.send({ type: 'PAUSE' });
      expect(actor.getSnapshot().value).toEqual({ training: 'paused' });

      actor.send({ type: 'TRAINER_CLOSED' });
      const snap = actor.getSnapshot();
      expect(snap.value).toBe('idle');
      expect(snap.children.sessionService).toBeUndefined();
    });

    it('from sessionComplete → idle', () => {
      const actor = enterTraining();
      actor.send({ type: 'SESSION.COMPLETE', stream: [], summary: null });
      expect(actor.getSnapshot().value).toBe('sessionComplete');

      actor.send({ type: 'TRAINER_CLOSED' });
      expect(actor.getSnapshot().value).toBe('idle');
    });
  });
});
