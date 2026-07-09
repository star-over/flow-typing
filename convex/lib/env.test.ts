import { afterEach, describe, expect, test } from 'vitest';
import { assertNonProd, isProduction } from './env';

// process.env мутируется точечно; ORIGINAL восстанавливается после каждого теста.
// Дефолт convex-проекта тестов — DEPLOY_ENV=development (vitest.config.ts), поэтому
// ORIGINAL, как правило, 'development'.
const ORIGINAL = process.env.DEPLOY_ENV;
function setDeployEnv(value: string | undefined): void {
  if (value === undefined) delete process.env.DEPLOY_ENV;
  else process.env.DEPLOY_ENV = value;
}

afterEach(() => setDeployEnv(ORIGINAL));

describe('isProduction — fail-closed', () => {
  test("DEPLOY_ENV='development' → dev (false)", () => {
    setDeployEnv('development');
    expect(isProduction()).toBe(false);
  });

  test("DEPLOY_ENV='production' → prod (true)", () => {
    setDeployEnv('production');
    expect(isProduction()).toBe(true);
  });

  test('DEPLOY_ENV не задан → prod (true, fail-closed)', () => {
    setDeployEnv(undefined);
    expect(isProduction()).toBe(true);
  });

  test('неизвестное значение → prod (true, fail-closed)', () => {
    setDeployEnv('staging');
    expect(isProduction()).toBe(true);
  });
});

describe('assertNonProd', () => {
  test('dev → не бросает', () => {
    setDeployEnv('development');
    expect(() => assertNonProd()).not.toThrow();
  });

  test('prod → бросает', () => {
    setDeployEnv('production');
    expect(() => assertNonProd()).toThrow(/production/i);
  });

  test('DEPLOY_ENV не задан → бросает (fail-closed)', () => {
    setDeployEnv(undefined);
    expect(() => assertNonProd()).toThrow(/production/i);
  });
});
