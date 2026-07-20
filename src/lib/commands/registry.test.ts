import { describe, expect, it } from 'vitest';
import { COMMANDS, getCommand, type CommandId } from './registry';

describe('COMMANDS', () => {
  it('содержит OPEN_SETTINGS с аккордом mod+Comma', () => {
    const command = COMMANDS.find((candidate) => candidate.id === 'OPEN_SETTINGS');
    expect(command?.binding).toEqual({ mod: true, code: 'Comma' });
  });

  it('аккорды команд уникальны', () => {
    const chords = COMMANDS.filter((command) => command.binding).map((command) =>
      JSON.stringify(command.binding),
    );
    expect(new Set(chords).size).toBe(chords.length);
  });
});

describe('getCommand', () => {
  it('возвращает команду по id', () => {
    expect(getCommand('OPEN_SETTINGS').id).toBe('OPEN_SETTINGS');
  });

  it('бросает на неизвестном id — реестр статичен, это программная ошибка', () => {
    // Обоснование `as`: упражняем throw-ветку, недостижимую через типизированные id.
    expect(() => getCommand('UNKNOWN' as CommandId)).toThrow('Unknown command: UNKNOWN');
  });
});
