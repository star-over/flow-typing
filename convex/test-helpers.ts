/**
 * @file Регистрация aggregate-компонента `drillIndex` в convex-test (ADR 0009).
 * Делегирует официальному хелперу пакета (`@convex-dev/aggregate/test`), который
 * глобит схему и модули компонента из своих исходников — устойчивее, чем ручной
 * glob по node_modules (раскладка пакета не зашита в наш тест). Имя mount
 * `'drillIndex'` — как в convex/convex.config.ts (app.use).
 */
import type { TestConvex } from 'convex-test';
import { register } from '@convex-dev/aggregate/test';
import type schema from './schema';

/** Регистрирует инстанс aggregate-компонента `drillIndex` в convex-test. */
export function registerDrillIndex(t: TestConvex<typeof schema>): void {
  register(t, 'drillIndex');
}
