import type { StateValue } from 'xstate';
import { describe, expect, it, vi } from 'vitest';
import {
  dispatchUserAction,
  isEditableTarget,
  isShortcutChord,
  isUserActionKey,
  matchUserAction,
  type UserActionKeyEvent,
} from './dispatch';
import { USER_ACTIONS, type UserAction, type UserActionContext } from './user-actions';

function keyEvent(overrides: Partial<UserActionKeyEvent> = {}): UserActionKeyEvent {
  return {
    code: 'KeyA',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    target: null,
    ...overrides,
  };
}

// Обоснование `as unknown as EventTarget`: структурные объекты вместо
// DOM-узлов — тесты идут в node-окружении без DOM-классов (паттерн device.test.ts).
const inputTarget = { tagName: 'INPUT' } as unknown as EventTarget;

/**
 * Контекст с заданными активными состояниями appMachine: isActive сравнивает
 * StateValue структурно (объекты вида { training: 'running' } равны по
 * содержимому, а не по ссылке).
 */
function makeContext(activeStates: readonly StateValue[] = []): UserActionContext {
  return {
    isActive: (value) =>
      activeStates.some((active) => JSON.stringify(active) === JSON.stringify(value)),
    send: vi.fn(),
    navigate: vi.fn(),
    trainingParams: { symbolLayoutId: 'qwerty', durationSeconds: 60 },
  };
}

describe('isShortcutChord', () => {
  it('true для meta + текстовая клавиша', () => {
    expect(isShortcutChord(keyEvent({ metaKey: true }))).toBe(true);
  });

  it('true для ctrl и alt по отдельности', () => {
    expect(isShortcutChord(keyEvent({ ctrlKey: true }))).toBe(true);
    expect(isShortcutChord(keyEvent({ altKey: true }))).toBe(true);
  });

  it('false без модификаторов', () => {
    expect(isShortcutChord(keyEvent())).toBe(false);
  });

  it('false для shift-only — это канал печати (заглавные)', () => {
    expect(isShortcutChord(keyEvent({ shiftKey: true }))).toBe(false);
  });

  it('false для ctrl+alt вместе — это AltGr на Windows, канал печати', () => {
    expect(isShortcutChord(keyEvent({ ctrlKey: true, altKey: true }))).toBe(false);
  });

  it('false при auto-repeat зажатого аккорда', () => {
    expect(isShortcutChord(keyEvent({ metaKey: true, repeat: true }))).toBe(false);
  });

  it('false, когда сама нажатая клавиша — модификатор (keydown MetaLeft)', () => {
    expect(isShortcutChord(keyEvent({ code: 'MetaLeft', metaKey: true }))).toBe(false);
    expect(isShortcutChord(keyEvent({ code: 'ControlLeft', ctrlKey: true }))).toBe(false);
    expect(isShortcutChord(keyEvent({ code: 'AltLeft', altKey: true }))).toBe(false);
  });

  it('false для неизвестного code (F13, media-клавиши)', () => {
    expect(isShortcutChord(keyEvent({ code: 'F13', metaKey: true }))).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('false для null', () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it('true для input, textarea и select', () => {
    expect(isEditableTarget(inputTarget)).toBe(true);
    expect(isEditableTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true);
  });

  it('true для contenteditable', () => {
    expect(isEditableTarget({ isContentEditable: true } as unknown as EventTarget)).toBe(true);
  });

  it('false для обычного элемента', () => {
    expect(isEditableTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(false);
  });
});

describe('isUserActionKey', () => {
  it('true для Escape и Enter — голых триггеров реестра', () => {
    expect(isUserActionKey('Escape')).toBe(true);
    expect(isUserActionKey('Enter')).toBe(true);
  });

  it('false для клавиш из аккордов и прочих', () => {
    expect(isUserActionKey('Comma')).toBe(false);
    expect(isUserActionKey('KeyA')).toBe(false);
  });
});

describe('matchUserAction', () => {
  it('Cmd+, (meta) находит OPEN_SETTINGS', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true }),
      actions: USER_ACTIONS,
      context: makeContext(),
    });
    expect(action?.id).toBe('OPEN_SETTINGS');
  });

  it('Ctrl+, находит OPEN_SETTINGS — mod распознаётся по metaKey || ctrlKey', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', ctrlKey: true }),
      actions: USER_ACTIONS,
      context: makeContext(),
    });
    expect(action?.id).toBe('OPEN_SETTINGS');
  });

  it('Cmd+Ctrl+, тоже совпадает — mod снисходителен к лишнему meta/ctrl', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true, ctrlKey: true }),
      actions: USER_ACTIONS,
      context: makeContext(),
    });
    expect(action?.id).toBe('OPEN_SETTINGS');
  });

  it('другой code не совпадает', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Slash', metaKey: true }),
      actions: USER_ACTIONS,
      context: makeContext(),
    });
    expect(action).toBeUndefined();
  });

  it('лишний модификатор (shift) ломает аккорд', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true, shiftKey: true }),
      actions: USER_ACTIONS,
      context: makeContext(),
    });
    expect(action).toBeUndefined();
  });

  it('фокус в поле ввода глушит сочетание', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true, target: inputTarget }),
      actions: USER_ACTIONS,
      context: makeContext(),
    });
    expect(action).toBeUndefined();
  });

  it('alt-binding совпадает только по точному аккорду', () => {
    const altAction: UserAction = {
      id: 'OPEN_SETTINGS',
      trigger: { binding: { alt: true, code: 'KeyX' } },
      when: 'always',
      run: () => undefined,
    };
    expect(
      matchUserAction({
        event: keyEvent({ code: 'KeyX', altKey: true }),
        actions: [altAction],
        context: makeContext(),
      })?.id,
    ).toBe('OPEN_SETTINGS');
    expect(
      matchUserAction({
        event: keyEvent({ code: 'KeyX', altKey: true, metaKey: true }),
        actions: [altAction],
        context: makeContext(),
      }),
    ).toBeUndefined();
    expect(
      matchUserAction({
        event: keyEvent({ code: 'KeyX' }),
        actions: [altAction],
        context: makeContext(),
      }),
    ).toBeUndefined();
  });

  it('Cmd+. находит OPEN_STATS', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Period', metaKey: true }),
      actions: USER_ACTIONS,
      context: makeContext(),
    });
    expect(action?.id).toBe('OPEN_STATS');
  });

  it('Escape без модификаторов в { training: running } находит PAUSE_TRAINING', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Escape' }),
      actions: USER_ACTIONS,
      context: makeContext([{ training: 'running' }]),
    });
    expect(action?.id).toBe('PAUSE_TRAINING');
  });

  it('Escape в { training: paused } находит RESUME_TRAINING, а не PAUSE — гейт по состоянию', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Escape' }),
      actions: USER_ACTIONS,
      context: makeContext([{ training: 'paused' }]),
    });
    expect(action?.id).toBe('RESUME_TRAINING');
  });

  it('Escape с shift не совпадает — голая клавиша требует ноль модификаторов', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Escape', shiftKey: true }),
      actions: USER_ACTIONS,
      context: makeContext([{ training: 'running' }, { training: 'paused' }]),
    });
    expect(action).toBeUndefined();
  });

  it('Enter в { training: paused } находит RESTART_TRAINING', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Enter' }),
      actions: USER_ACTIONS,
      context: makeContext([{ training: 'paused' }]),
    });
    expect(action?.id).toBe('RESTART_TRAINING');
  });

  it('Enter в sessionComplete и sessionError находит RESTART_TRAINING — when со списком состояний', () => {
    for (const state of ['sessionComplete', 'sessionError'] as const) {
      const action = matchUserAction({
        event: keyEvent({ code: 'Enter' }),
        actions: USER_ACTIONS,
        context: makeContext([state]),
      });
      expect(action?.id).toBe('RESTART_TRAINING');
    }
  });

  it('Enter в { training: running } не совпадает', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Enter' }),
      actions: USER_ACTIONS,
      context: makeContext([{ training: 'running' }]),
    });
    expect(action).toBeUndefined();
  });

  it('auto-repeat гасится для обоих видов триггеров', () => {
    expect(
      matchUserAction({
        event: keyEvent({ code: 'Escape', repeat: true }),
        actions: USER_ACTIONS,
        context: makeContext([{ training: 'running' }]),
      }),
    ).toBeUndefined();
    expect(
      matchUserAction({
        event: keyEvent({ code: 'Comma', metaKey: true, repeat: true }),
        actions: USER_ACTIONS,
        context: makeContext(),
      }),
    ).toBeUndefined();
  });

  it('фокус в поле ввода глушит голую клавишу', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Escape', target: inputTarget }),
      actions: USER_ACTIONS,
      context: makeContext([{ training: 'running' }]),
    });
    expect(action).toBeUndefined();
  });

  it('when по состоянию: действие активно только в перечисленных состояниях', () => {
    const gated: UserAction = {
      id: 'PAUSE_TRAINING',
      trigger: { key: 'Escape' },
      when: { training: 'running' },
      run: () => undefined,
    };
    const event = keyEvent({ code: 'Escape' });
    expect(
      matchUserAction({ event, actions: [gated], context: makeContext([{ training: 'running' }]) })?.id,
    ).toBe('PAUSE_TRAINING');
    expect(
      matchUserAction({ event, actions: [gated], context: makeContext(['idle']) }),
    ).toBeUndefined();
  });
});

describe('dispatchUserAction', () => {
  it('выполняет действие и возвращает true при совпадении аккорда', () => {
    const context = makeContext();
    const handled = dispatchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true }),
      context,
    });
    expect(handled).toBe(true);
    expect(context.navigate).toHaveBeenCalledWith('/settings');
  });

  it('возвращает false и ничего не выполняет при промахе', () => {
    const context = makeContext();
    const handled = dispatchUserAction({
      event: keyEvent({ code: 'KeyZ', metaKey: true }),
      context,
    });
    expect(handled).toBe(false);
    expect(context.navigate).not.toHaveBeenCalled();
    expect(context.send).not.toHaveBeenCalled();
  });

  it('Escape в { training: running } шлёт PAUSE в appMachine', () => {
    const context = makeContext([{ training: 'running' }]);
    const handled = dispatchUserAction({ event: keyEvent({ code: 'Escape' }), context });
    expect(handled).toBe(true);
    expect(context.send).toHaveBeenCalledWith({ type: 'PAUSE' });
  });

  it('Enter в { training: paused } шлёт START_TRAINING с параметрами свежей сессии', () => {
    const context = makeContext([{ training: 'paused' }]);
    const handled = dispatchUserAction({ event: keyEvent({ code: 'Enter' }), context });
    expect(handled).toBe(true);
    expect(context.send).toHaveBeenCalledWith({
      type: 'START_TRAINING',
      symbolLayoutId: 'qwerty',
      durationSeconds: 60,
    });
  });
});
