import { describe, expect, it } from 'vitest';
import { USER_ACTIONS, getUserAction, type UserActionId } from './user-actions';

describe('USER_ACTIONS', () => {
  it('содержит OPEN_SETTINGS с аккордом mod+Comma', () => {
    const action = USER_ACTIONS.find((candidate) => candidate.id === 'OPEN_SETTINGS');
    expect(action?.binding).toEqual({ mod: true, code: 'Comma' });
  });

  it('аккорды действий уникальны', () => {
    const chords = USER_ACTIONS.filter((action) => action.binding).map((action) =>
      JSON.stringify(action.binding),
    );
    expect(new Set(chords).size).toBe(chords.length);
  });
});

describe('getUserAction', () => {
  it('возвращает действие по id', () => {
    expect(getUserAction('OPEN_SETTINGS').id).toBe('OPEN_SETTINGS');
  });

  it('бросает на неизвестном id — реестр статичен, это программная ошибка', () => {
    // Обоснование `as`: упражняем throw-ветку, недостижимую через типизированные id.
    expect(() => getUserAction('UNKNOWN' as UserActionId)).toThrow('Unknown user action: UNKNOWN');
  });
});
