import { describe, expect, it, vi } from 'vitest';
import {
  dispatchCommand,
  isCommandChord,
  isEditableTarget,
  matchCommand,
  type CommandKeyEvent,
} from './dispatch';
import { COMMANDS, type Command } from './registry';

function keyEvent(overrides: Partial<CommandKeyEvent> = {}): CommandKeyEvent {
  return {
    code: 'Comma',
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

describe('isCommandChord', () => {
  it('true для meta + текстовая клавиша', () => {
    expect(isCommandChord(keyEvent({ metaKey: true }))).toBe(true);
  });

  it('true для ctrl и alt по отдельности', () => {
    expect(isCommandChord(keyEvent({ ctrlKey: true }))).toBe(true);
    expect(isCommandChord(keyEvent({ altKey: true }))).toBe(true);
  });

  it('false без модификаторов', () => {
    expect(isCommandChord(keyEvent())).toBe(false);
  });

  it('false для shift-only — это канал печати (заглавные)', () => {
    expect(isCommandChord(keyEvent({ shiftKey: true }))).toBe(false);
  });

  it('false для ctrl+alt вместе — это AltGr на Windows, канал печати', () => {
    expect(isCommandChord(keyEvent({ ctrlKey: true, altKey: true }))).toBe(false);
  });

  it('false при auto-repeat зажатого аккорда', () => {
    expect(isCommandChord(keyEvent({ metaKey: true, repeat: true }))).toBe(false);
  });

  it('false, когда сама нажатая клавиша — модификатор (keydown MetaLeft)', () => {
    expect(isCommandChord(keyEvent({ code: 'MetaLeft', metaKey: true }))).toBe(false);
    expect(isCommandChord(keyEvent({ code: 'ControlLeft', ctrlKey: true }))).toBe(false);
    expect(isCommandChord(keyEvent({ code: 'AltLeft', altKey: true }))).toBe(false);
  });

  it('false для неизвестного code (F13, media-клавиши)', () => {
    expect(isCommandChord(keyEvent({ code: 'F13', metaKey: true }))).toBe(false);
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

describe('matchCommand', () => {
  it('Cmd+, (meta) находит OPEN_SETTINGS', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command?.id).toBe('OPEN_SETTINGS');
  });

  it('Ctrl+, находит OPEN_SETTINGS — mod распознаётся по metaKey || ctrlKey', () => {
    const command = matchCommand({
      event: keyEvent({ ctrlKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command?.id).toBe('OPEN_SETTINGS');
  });

  it('Cmd+Ctrl+, тоже совпадает — mod снисходителен к лишнему meta/ctrl', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true, ctrlKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command?.id).toBe('OPEN_SETTINGS');
  });

  it('другой code не совпадает', () => {
    const command = matchCommand({
      event: keyEvent({ code: 'Period', metaKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });

  it('лишний модификатор (shift) ломает аккорд', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true, shiftKey: true }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });

  it('фокус в поле ввода глушит сочетание', () => {
    const command = matchCommand({
      event: keyEvent({ metaKey: true, target: inputTarget }),
      commands: COMMANDS,
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });

  it("when: 'not-typing' глушит команду в training", () => {
    const gated: Command = {
      id: 'OPEN_SETTINGS',
      binding: { mod: true, code: 'KeyP' },
      when: 'not-typing',
      run: () => undefined,
    };
    const event = keyEvent({ code: 'KeyP', metaKey: true });
    expect(matchCommand({ event, commands: [gated], isTraining: true })).toBeUndefined();
    expect(matchCommand({ event, commands: [gated], isTraining: false })?.id).toBe('OPEN_SETTINGS');
  });

  it('команда без binding никогда не совпадает (заготовка под палитру)', () => {
    const paletteOnly: Command = {
      id: 'OPEN_SETTINGS',
      when: 'always',
      run: () => undefined,
    };
    const command = matchCommand({
      event: keyEvent({ metaKey: true }),
      commands: [paletteOnly],
      isTraining: false,
    });
    expect(command).toBeUndefined();
  });
});

describe('dispatchCommand', () => {
  it('выполняет команду и возвращает true при совпадении', () => {
    const navigate = vi.fn();
    const handled = dispatchCommand({
      event: keyEvent({ metaKey: true }),
      context: { isTraining: false, navigate },
    });
    expect(handled).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/settings');
  });

  it('возвращает false и ничего не выполняет при промахе', () => {
    const navigate = vi.fn();
    const handled = dispatchCommand({
      event: keyEvent({ code: 'KeyZ', metaKey: true }),
      context: { isTraining: false, navigate },
    });
    expect(handled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
