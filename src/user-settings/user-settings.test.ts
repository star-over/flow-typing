import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from './user-settings';

// Канарейка (намеренный детектор смены значения). В ОТЛИЧИЕ от поведенческих
// тестов normalizeSettings (`settings.test.ts` сверяется с этим же источником,
// не с литералами), этот тест ОБЯЗАН падать на любую смену дефолта. Он не про
// поведение — он про сами значения: точка сознательного ревью «да, меняю
// осознанно» + защита от случайной опечатки (напр. 6 вместо 60). Это
// ЕДИНСТВЕННОЕ место, где дефолты закреплены литералом; не подмешивать эту роль в
// другие тесты. Упал при намеренной правке дефолта? — обнови объект ниже, это и
// есть его работа.
describe('DEFAULT_USER_SETTINGS · канарейка значений', () => {
  it('дефолтные значения зафиксированы', () => {
    expect(DEFAULT_USER_SETTINGS).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      fingerLayoutId: 'asdf',
      cursorType: 'RECTANGLE',
      theme: 'auto',
      displayName: '',
      rhythmChannelEnabled: false,
      sessionDurationSeconds: 60,
    });
  });
});
