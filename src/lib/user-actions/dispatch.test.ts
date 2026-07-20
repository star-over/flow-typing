import { describe, expect, it, vi } from 'vitest';
import {
  dispatchUserAction,
  isEditableTarget,
  isShortcutChord,
  matchUserAction,
  type UserActionKeyEvent,
} from './dispatch';
import { USER_ACTIONS, type UserAction } from './user-actions';

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

describe('matchUserAction', () => {
  it('Cmd+, (meta) находит OPEN_SETTINGS', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true }),
      actions: USER_ACTIONS,
      isTraining: false,
    });
    expect(action?.id).toBe('OPEN_SETTINGS');
  });

  it('Ctrl+, находит OPEN_SETTINGS — mod распознаётся по metaKey || ctrlKey', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', ctrlKey: true }),
      actions: USER_ACTIONS,
      isTraining: false,
    });
    expect(action?.id).toBe('OPEN_SETTINGS');
  });

  it('Cmd+Ctrl+, тоже совпадает — mod снисходителен к лишнему meta/ctrl', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true, ctrlKey: true }),
      actions: USER_ACTIONS,
      isTraining: false,
    });
    expect(action?.id).toBe('OPEN_SETTINGS');
  });

  it('другой code не совпадает', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Slash', metaKey: true }),
      actions: USER_ACTIONS,
      isTraining: false,
    });
    expect(action).toBeUndefined();
  });

  it('лишний модификатор (shift) ломает аккорд', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true, shiftKey: true }),
      actions: USER_ACTIONS,
      isTraining: false,
    });
    expect(action).toBeUndefined();
  });

  it('фокус в поле ввода глушит сочетание', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true, target: inputTarget }),
      actions: USER_ACTIONS,
      isTraining: false,
    });
    expect(action).toBeUndefined();
  });

  it("when: 'not-typing' глушит действие в training", () => {
    const gated: UserAction = {
      id: 'OPEN_SETTINGS',
      binding: { mod: true, code: 'KeyP' },
      when: 'not-typing',
      run: () => undefined,
    };
    const event = keyEvent({ code: 'KeyP', metaKey: true });
    expect(matchUserAction({ event, actions: [gated], isTraining: true })).toBeUndefined();
    expect(matchUserAction({ event, actions: [gated], isTraining: false })?.id).toBe('OPEN_SETTINGS');
  });

  it('alt-binding совпадает только по точному аккорду', () => {
    const altAction: UserAction = {
      id: 'OPEN_SETTINGS',
      binding: { alt: true, code: 'KeyX' },
      when: 'always',
      run: () => undefined,
    };
    expect(
      matchUserAction({ event: keyEvent({ code: 'KeyX', altKey: true }), actions: [altAction], isTraining: false })?.id,
    ).toBe('OPEN_SETTINGS');
    expect(
      matchUserAction({ event: keyEvent({ code: 'KeyX', altKey: true, metaKey: true }), actions: [altAction], isTraining: false }),
    ).toBeUndefined();
    expect(
      matchUserAction({ event: keyEvent({ code: 'KeyX' }), actions: [altAction], isTraining: false }),
    ).toBeUndefined();
  });

  it('действие без binding никогда не совпадает (заготовка под палитру)', () => {
    const paletteOnly: UserAction = {
      id: 'OPEN_SETTINGS',
      when: 'always',
      run: () => undefined,
    };
    const action = matchUserAction({
      event: keyEvent({ metaKey: true }),
      actions: [paletteOnly],
      isTraining: false,
    });
    expect(action).toBeUndefined();
  });

  it('Cmd+. находит OPEN_STATS', () => {
    const action = matchUserAction({
      event: keyEvent({ code: 'Period', metaKey: true }),
      actions: USER_ACTIONS,
      isTraining: false,
    });
    expect(action?.id).toBe('OPEN_STATS');
  });
});

describe('dispatchUserAction', () => {
  it('выполняет действие и возвращает true при совпадении', () => {
    const navigate = vi.fn();
    const handled = dispatchUserAction({
      event: keyEvent({ code: 'Comma', metaKey: true }),
      context: { isTraining: false, navigate },
    });
    expect(handled).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/settings');
  });

  it('возвращает false и ничего не выполняет при промахе', () => {
    const navigate = vi.fn();
    const handled = dispatchUserAction({
      event: keyEvent({ code: 'KeyZ', metaKey: true }),
      context: { isTraining: false, navigate },
    });
    expect(handled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
