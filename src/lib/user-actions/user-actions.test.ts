import { describe, expect, it } from 'vitest';
import {
  USER_ACTIONS,
  getUserAction,
  keyHintPropsForTrigger,
  type UserActionId,
} from './user-actions';

function triggerOf(id: UserActionId) {
  return USER_ACTIONS.find((candidate) => candidate.id === id)?.trigger;
}

describe('USER_ACTIONS', () => {
  it('содержит 5 действий: навигация и управление тренировкой', () => {
    expect(USER_ACTIONS.map((action) => action.id)).toEqual([
      'OPEN_SETTINGS',
      'OPEN_STATS',
      'PAUSE_TRAINING',
      'RESUME_TRAINING',
      'RESTART_TRAINING',
    ]);
  });

  it('триггеры действий соответствуют заявленным', () => {
    expect(triggerOf('OPEN_SETTINGS')).toEqual({ binding: { mod: true, code: 'Comma' } });
    expect(triggerOf('OPEN_STATS')).toEqual({ binding: { mod: true, code: 'Period' } });
    expect(triggerOf('PAUSE_TRAINING')).toEqual({ key: 'Escape' });
    expect(triggerOf('RESUME_TRAINING')).toEqual({ key: 'Escape' });
    expect(triggerOf('RESTART_TRAINING')).toEqual({ key: 'Enter' });
  });

  it('у каждого действия ровно один триггер — аккорд ИЛИ голая клавиша, без альтернатив', () => {
    for (const action of USER_ACTIONS) {
      expect('binding' in action.trigger).not.toBe('key' in action.trigger);
    }
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

describe('keyHintPropsForTrigger', () => {
  it('аккорд → { binding }', () => {
    expect(keyHintPropsForTrigger({ binding: { mod: true, code: 'Comma' } })).toEqual({
      binding: { mod: true, code: 'Comma' },
    });
  });

  it('голая клавиша → { code }', () => {
    expect(keyHintPropsForTrigger({ key: 'Escape' })).toEqual({ code: 'Escape' });
  });
});
